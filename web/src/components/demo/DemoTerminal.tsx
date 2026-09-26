"use client";

import styled from "@emotion/styled";
import { AnimatePresence, animate, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Evidence, SealStatus } from "@/domain/protocol";
import { demoStageOrder, useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, mono } from "@/styles/tokens";

/* ---------- copy: one headline and one short line per step ---------- */

const captions: Record<DemoStage, { title: string; line: string }> = {
  idle: { title: "Klamp in nine steps", line: "Press play or →" },
  launch: { title: "The issuer declares one pool", line: "Launch tx · recordByCreate2 → ENSv2" },
  quotes: { title: "Someone adds a look-alike pool", line: "Same pair · more output on paper" },
  naive: { title: "A naive router takes it", line: "Best quote wins" },
  lookup: { title: "Klamp asks ENS", line: "0x4cb4….tokens.klamp.eth → registered" },
  seal: { title: "Nobody can rewrite it", line: "ENSv2 roles on the namespace · us included" },
  judge: { title: "Undeclared hook pool: rejected", line: "verdict · requote_canonical" },
  requote: { title: "Requote the declared pool", line: "V4Quoter · same fee at swap time" },
  execute: { title: "Verified swap on Sepolia", line: "Universal Router · calldata = judged PoolKey" },
  outcome: { title: "Quoted fee = paid fee", line: "Traders do nothing" },
};

const steps = demoStageOrder.filter((stage): stage is Exclude<DemoStage, "idle"> => stage !== "idle");
/** How long autoplay lingers on a finished step before moving on (ms). */
const DWELL: Record<DemoStage, number> = {
  idle: 800, launch: 4200, quotes: 4000, naive: 3400, lookup: 4000, seal: 4600, judge: 3800, requote: 3800, execute: 4800, outcome: 0,
};

/* ---------- scene geometry (SVG viewBox 1200 × 620) ---------- */

const P = {
  launchpad: { x: 170, y: 110 },
  trader: { x: 170, y: 380 },
  router: { x: 500, y: 380 },
  ens: { x: 720, y: 110 },
  declared: { x: 1010, y: 250 },
  undeclared: { x: 1010, y: 500 },
};
const HALF = 120; // node box half-width
const PATH = {
  launch: `M${P.launchpad.x + HALF},${P.launchpad.y} C 560,110 760,250 ${P.declared.x - HALF},${P.declared.y}`,
  record: `M${P.declared.x - 60},${P.declared.y - 42} C 930,150 900,110 ${P.ens.x + HALF},${P.ens.y}`,
  toRouter: `M${P.trader.x + HALF},${P.trader.y} L${P.router.x - HALF},${P.router.y}`,
  toUndeclared: `M${P.router.x + HALF},${P.router.y} C 740,380 800,500 ${P.undeclared.x - HALF},${P.undeclared.y}`,
  toDeclared: `M${P.router.x + HALF},${P.router.y} C 740,380 800,250 ${P.declared.x - HALF},${P.declared.y}`,
  lookup: `M${P.router.x},${P.router.y - 42} C 540,240 600,120 ${P.ens.x - HALF},${P.ens.y}`,
};

const fmt = (value: number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const short = (value: string) => `${value.slice(0, 6)}…${value.slice(-4)}`;

/* ---------- small animated primitives ---------- */

function Counter({ to, from = 0, duration = 1.4, delay = 0 }: { to: number; from?: number; duration?: number; delay?: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const controls = animate(from, to, { duration, delay, ease: [0.16, 1, 0.3, 1], onUpdate: setValue });
    return () => controls.stop();
  }, [from, to, duration, delay]);
  return <>{fmt(value)}</>;
}

function Edge({ d, color, delay = 0, dashed = false, width = 3 }: { d: string; color: string; delay?: number; dashed?: boolean; width?: number }) {
  return (
    <motion.path
      d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? "8 10" : undefined}
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.9, delay, ease: "easeInOut" }}
    />
  );
}

/** Coins travelling along a path (native SVG animateMotion). */
function Packets({ d, color, count = 3, duration = 1.6, delay = 0 }: { d: string; color: string; count?: number; duration?: number; delay?: number }) {
  return (
    <g>
      {Array.from({ length: count }, (_, index) => (
        <circle key={index} r={7} fill={color} opacity={0}>
          <animate attributeName="opacity" values="0;1;1;0" dur={`${duration}s`} begin={`${delay + (index * duration) / count}s`} repeatCount="indefinite" />
          <animateMotion dur={`${duration}s`} begin={`${delay + (index * duration) / count}s`} repeatCount="indefinite" path={d} />
        </circle>
      ))}
    </g>
  );
}

type Tone = "ink" | "klamp" | "danger" | "muted" | "ok";
const toneColor: Record<Tone, string> = { ink: colors.textPrimary, klamp: colors.primary, danger: colors.danger, muted: colors.borderStrong, ok: colors.success };

function Node({ x, y, glyph, label, sub, tone = "ink", show = true, pulse = false, dim = false }: {
  x: number; y: number; glyph: string; label: string; sub?: string; tone?: Tone; show?: boolean; pulse?: boolean; dim?: boolean;
}) {
  const color = toneColor[tone];
  return (
    <AnimatePresence>
      {show && (
        <motion.g
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: dim ? 0.35 : 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }} style={{ transformOrigin: `${x}px ${y}px` }}
        >
          {pulse && (
            <motion.rect x={x - HALF} y={y - 42} width={HALF * 2} height={84} rx={16} fill="none" stroke={color} strokeWidth={2}
              animate={{ opacity: [0.7, 0], scale: [1, 1.18] }} transition={{ duration: 1.3, repeat: Infinity }} style={{ transformOrigin: `${x}px ${y}px` }} />
          )}
          <rect x={x - HALF} y={y - 42} width={HALF * 2} height={84} rx={16} fill={colors.surface} stroke={color} strokeWidth={tone === "ink" ? 1.5 : 3} />
          <circle cx={x - HALF + 38} cy={y} r={22} fill={color} />
          <text x={x - HALF + 38} y={y + 7} textAnchor="middle" fontSize={20} fontWeight={700} fill="white">{glyph}</text>
          <text x={x - HALF + 72} y={y - 4} fontSize={17} fontWeight={650} fill={colors.textPrimary}>{label}</text>
          {sub && <text x={x - HALF + 72} y={y + 18} fontSize={13} fontFamily={mono} fill={colors.textSecondary}>{sub}</text>}
        </motion.g>
      )}
    </AnimatePresence>
  );
}

function Chip({ x, y, text, tone = "ink", delay = 0, big = false }: { x: number; y: number; text: React.ReactNode; tone?: Tone; delay?: number; big?: boolean }) {
  const color = toneColor[tone];
  // Size string chips to their text (mono, so width ≈ characters × advance); counters use the default.
  const chars = typeof text === "string" ? text.length : 10;
  const width = Math.max(big ? 230 : 200, chars * (big ? 14 : 9.6) + 44);
  const height = big ? 50 : 36;
  return (
    <motion.g initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, delay }}>
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx={height / 2} fill={color} />
      <text x={x} y={y + (big ? 8 : 5)} textAnchor="middle" fontSize={big ? 22 : 15} fontWeight={650} fontFamily={mono} fill="white">{text}</text>
    </motion.g>
  );
}

function Stamp({ x, y, text, tone, delay = 0 }: { x: number; y: number; text: string; tone: Tone; delay?: number }) {
  return (
    <motion.g initial={{ opacity: 0, scale: 1.9, rotate: -14 }} animate={{ opacity: 1, scale: 1, rotate: -8 }} transition={{ type: "spring", stiffness: 320, damping: 16, delay }}
      style={{ transformOrigin: `${x}px ${y}px` }}>
      <rect x={x - 70} y={y - 20} width={140} height={40} rx={6} fill="white" stroke={toneColor[tone]} strokeWidth={3} />
      <text x={x} y={y + 7} textAnchor="middle" fontSize={18} fontWeight={800} letterSpacing=".06em" fill={toneColor[tone]}>{text}</text>
    </motion.g>
  );
}

/* ---------- seal slide: who can still change the record ---------- */

function Lock({ tone }: { tone: "ok" | "kept" | "open" }) {
  const color = tone === "ok" ? colors.success : tone === "kept" ? colors.warning : colors.danger;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect x="4" y="11" width="18" height="13" rx="3" fill={color} />
      <path d={tone === "open" ? "M8 11V7a5 5 0 0 1 9.6-2" : "M8 11V7a5 5 0 0 1 10 0v4"} fill="none" stroke={color} strokeWidth="2.6" />
      {tone === "kept" && <text x="13" y="21.5" textAnchor="middle" fontSize="10" fontWeight="800" fill="white">!</text>}
    </svg>
  );
}

function SealBoard({ seal }: { seal: SealStatus }) {
  const key = (name: string) => seal.keys.find((entry) => entry.key === name);
  const pool = key("pool");
  const texts = [key("description"), key("url")];
  const other = key("avatar");
  const rows: { label: string; value: string; tone: "ok" | "kept" | "open" }[] = [
    { label: "pool record", value: pool?.registrarOnly ? "registrar only" : `${pool?.writers ?? "?"} writers`, tone: pool?.registrarOnly ? "ok" : "open" },
    { label: "description · url", value: texts.every((t) => t?.registrarOnly) ? "registrar · creator-gated" : "open", tone: texts.every((t) => t?.registrarOnly) ? "ok" : "open" },
    { label: "any other key", value: `${other?.writers ?? "?"} writers`, tone: other?.writers === 0 ? "ok" : "open" },
    { label: "resolver admins", value: `${seal.resolverRootRoles} · no upgrade`, tone: seal.resolverRootRoles === 0 ? "ok" : "open" },
    { label: "tokens.klamp.eth", value: `${seal.tokensRoles} roles · ${seal.tokensNeverExpires ? "never expires" : "expires"}`, tone: seal.tokensRoles === 0 && seal.tokensNeverExpires ? "ok" : "open" },
    { label: "klamp.eth", value: `${seal.klampRoles} roles · until ${seal.klampExpiryYear}`, tone: seal.klampRoles === 0 ? "ok" : "open" },
    { label: "klamp.eth registry", value: `REGISTRAR ×${seal.registryRegistrar} + admin ×${seal.registryRegistrarAdmin} · for hooks.klamp.eth`, tone: seal.registryOtherRoles === 0 ? "kept" : "open" },
  ];
  return (
    <Board initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {rows.map((row, index) => (
        <Row key={row.label} tone={row.tone} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + index * 0.28 }}>
          <motion.span initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.35 + index * 0.28 }}>
            <Lock tone={row.tone} />
          </motion.span>
          <b>{row.label}</b>
          <em>{row.value}</em>
        </Row>
      ))}
    </Board>
  );
}

/* ---------- layout ---------- */

const Screen = styled.section`
  flex: 1; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; background: ${colors.background};
  padding: 22px clamp(16px, 3vw, 40px) 18px;
`;
const Head = styled.header`display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; min-height: 96px;`;
const Count = styled.div`font: 600 14px/1 ${mono}; color: ${colors.primaryHover}; margin-bottom: 10px;`;
const Title = styled.h1`margin: 0; font-size: clamp(30px, 4.2vw, 54px); line-height: 1; letter-spacing: -.04em; font-weight: 700;`;
const Line = styled.p`margin: 10px 0 0; font: 500 clamp(14px, 1.4vw, 18px)/1.3 ${mono}; color: ${colors.textSecondary};`;
const Tag = styled.span<{ live?: boolean }>`
  display: inline-block; padding: 4px 8px; border: 1.5px solid ${({ live }) => live ? colors.success : colors.warning}; color: ${({ live }) => live ? colors.success : colors.warning};
  font: 700 11px/1 ${mono}; letter-spacing: .06em; text-transform: uppercase;
`;
const Canvas = styled.div`position: relative; min-height: 0;`;
const Svg = styled.svg`position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; font-family: inherit;`;
const Outcome = styled(motion.div)`
  position: absolute; inset: auto 0 4% 0; margin: 0 auto; width: min(980px, 96%); display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const Card = styled(motion.div)<{ tone: "klamp" | "danger" }>`
  padding: 20px 24px; background: ${colors.surface}; border-top: 5px solid ${({ tone }) => tone === "klamp" ? colors.primary : colors.danger};
  box-shadow: 0 18px 40px rgba(32, 32, 30, .12);
  h2 { margin: 0 0 6px; font-size: 18px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  strong { display: block; font: 600 clamp(36px, 5vw, 60px)/1 ${mono}; letter-spacing: -.05em; color: ${({ tone }) => tone === "klamp" ? colors.primaryHover : colors.danger}; }
  p { margin: 10px 0 0; color: ${colors.textSecondary}; font: 500 14px/1.4 ${mono}; }
`;
const Board = styled(motion.div)`
  position: absolute; inset: 0; margin: auto; width: min(760px, 96%); height: fit-content; display: grid; gap: 10px;
`;
const Row = styled(motion.div)<{ tone: "ok" | "kept" | "open" }>`
  display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 12px 18px;
  background: ${colors.surface}; border-left: 5px solid ${({ tone }) => tone === "ok" ? colors.success : tone === "kept" ? colors.warning : colors.danger};
  box-shadow: 0 8px 22px rgba(32, 32, 30, .08);
  b { font-size: clamp(15px, 1.6vw, 20px); }
  em { font: 600 clamp(13px, 1.3vw, 16px) ${mono}; font-style: normal; color: ${({ tone }) => tone === "kept" ? colors.warning : colors.textSecondary}; text-align: right; }
`;
const Foot = styled.footer`display: flex; align-items: center; justify-content: space-between; gap: 18px; padding-top: 12px;`;
const Dots = styled.ol`list-style: none; margin: 0; padding: 0; display: flex; gap: 8px;`;
const Dot = styled.button<{ state: "done" | "active" | "todo" }>`
  width: ${({ state }) => state === "active" ? 34 : 12}px; height: 12px; border-radius: 6px; border: 0; padding: 0; cursor: pointer; transition: all .25s ease;
  background: ${({ state }) => state === "active" ? colors.primary : state === "done" ? colors.textPrimary : colors.border};
`;
const Controls = styled.div`display: flex; gap: 8px; align-items: center;`;
const Hint = styled.span`color: ${colors.textMuted}; font: 500 12px/1 ${mono}; margin-right: 8px; @media (max-width: 720px) { display: none; }`;
const Button = styled.button<{ primary?: boolean }>`
  min-width: 44px; height: 40px; padding: 0 16px; border: 1px solid ${({ primary }) => primary ? colors.primary : colors.borderStrong};
  background: ${({ primary }) => primary ? colors.primary : "transparent"}; color: ${colors.textPrimary}; font-weight: 700; font-size: 14px; cursor: pointer;
  &:disabled { opacity: .45; cursor: default; }
`;
const ReducedMotion = styled.div`
  display: contents;
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

/* ---------- the demo ---------- */

export function DemoTerminal() {
  const { stage, busy, launch, board, naive, canonical, seal, judgement, requote, execution, naiveOutcome, advance, goBack, goToStage, reset } = useDemoStore();
  const [playing, setPlaying] = useState(false);
  const s = demoStageOrder.indexOf(stage);
  const at = (target: DemoStage) => s >= demoStageOrder.indexOf(target);
  const only = (target: DemoStage) => stage === target;
  const declared = board?.candidates.find((candidate) => candidate.id === "canonical");
  const undeclared = board?.candidates.find((candidate) => candidate.id === "undeclared");
  const registered = canonical?.status === "registered";
  const evidence: Evidence | undefined = {
    idle: undefined, launch: launch?.evidence, quotes: board?.evidence, naive: board?.evidence, lookup: canonical?.evidence, seal: seal?.evidence,
    judge: canonical?.evidence, requote: requote?.evidence, execute: execution?.evidence, outcome: undefined,
  }[stage];

  const next = useCallback(() => { void advance(); }, [advance]);

  // Autoplay: linger on each finished step, then advance. Stops at the outcome.
  useEffect(() => {
    if (!playing || busy) return;
    if (stage === "outcome") { setPlaying(false); return; }
    const timer = setTimeout(next, DWELL[stage]);
    return () => clearTimeout(timer);
  }, [playing, busy, stage, next]);

  // Keyboard for recording: → / Space next, ← previous, P play, R reset.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === " ") { event.preventDefault(); next(); }
      else if (event.key === "ArrowLeft") goBack();
      else if (event.key.toLowerCase() === "p") setPlaying((value) => !value);
      else if (event.key.toLowerCase() === "r") { setPlaying(false); reset(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, goBack, reset]);

  const caption = {
    ...captions[stage],
    ...(only("lookup") && launch && canonical && { line: `${short(launch.token.toLowerCase())}.tokens.klamp.eth → ${canonical.status}` }),
    ...(only("judge") && judgement && { line: `verdict · ${judgement.verdict}` }),
  };

  return (
    <ReducedMotion>
      <Screen>
        <Head>
          <div>
            <Count>{stage === "idle" ? "Klamp · Sepolia" : `${s} / ${steps.length}`}</Count>
            <AnimatePresence mode="wait">
              <motion.div key={stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.35 }}>
                <Title>{caption.title}</Title>
                <Line>{caption.line}</Line>
              </motion.div>
            </AnimatePresence>
          </div>
          {only("outcome") && <Tag>Naive side simulated</Tag>}
          {!busy && evidence && (
            <Tag live={evidence.kind === "live"} title={evidence.kind === "live" ? "Read from Sepolia in this browser" : "Recorded demo snapshot"}>
              {evidence.kind === "live" ? `Live · Sepolia #${evidence.blockNumber}` : "Recorded snapshot"}
            </Tag>
          )}
        </Head>

        <Canvas>
          <Svg viewBox="0 0 1200 620" role="img" aria-label={`${caption.title}. ${caption.line}`} style={{ opacity: only("seal") ? 0.12 : 1, transition: "opacity .4s" }}>
            {/* edges first so nodes sit on top */}
            <AnimatePresence>
              {at("launch") && launch && <Edge key="launch" d={PATH.launch} color={colors.textPrimary} />}
              {at("launch") && launch && <Edge key="record" d={PATH.record} color={colors.primary} delay={0.8} dashed />}
              {at("naive") && naive && <Edge key="toRouter" d={PATH.toRouter} color={colors.textPrimary} />}
              {at("naive") && naive && !at("judge") && <Edge key="toUndeclared" d={PATH.toUndeclared} color={colors.danger} delay={0.4} width={5} />}
              {at("judge") && <Edge key="toUndeclaredCut" d={PATH.toUndeclared} color={colors.border} dashed />}
              {only("lookup") && canonical && <Edge key="lookup" d={PATH.lookup} color={colors.primary} width={4} />}
              {at("requote") && requote && <Edge key="toDeclared" d={PATH.toDeclared} color={colors.primary} delay={0.1} width={5} />}
            </AnimatePresence>

            {only("launch") && launch && <Packets d={PATH.record} color={colors.primary} count={2} duration={1.4} delay={1.2} />}
            {only("naive") && naive && <Packets d={PATH.toUndeclared} color={colors.danger} />}
            {only("lookup") && canonical && <Packets d={PATH.lookup} color={colors.primary} count={2} duration={1.2} />}
            {only("execute") && execution && <><Packets d={PATH.toRouter} color={colors.textPrimary} count={2} duration={1.2} /><Packets d={PATH.toDeclared} color={colors.primary} count={3} duration={1.4} delay={0.5} /></>}

            <Node {...P.launchpad} glyph="L" label="Launchpad" sub="CREATE2 · path A" tone="ink" dim={at("quotes")} pulse={only("launch") && busy} />
            <Node {...P.ens} glyph="E" label="ENSv2" sub="tokens.klamp.eth" tone={at("launch") && launch ? "klamp" : "muted"} pulse={only("lookup") && !busy} />
            <Node {...P.trader} glyph="T" label="Trader" sub="0.0005 ETH → KHOOK" show={at("naive")} />
            <Node {...P.router} glyph={at("lookup") ? "K" : "R"} label={at("execute") ? "Klamp + UR" : at("lookup") ? "Klamp" : "Router"} sub={at("lookup") ? "judge · requote" : "best quote"}
              tone={at("lookup") ? "klamp" : "ink"} show={at("naive")} pulse={(only("naive") || only("judge")) && busy} />
            <Node {...P.declared} glyph="✓" label="Declared pool" sub={declared ? short(declared.poolId) : "KHOOK / ETH"} tone={at("lookup") && registered ? "ok" : "ink"} show={at("launch") && Boolean(launch)} />
            <Node {...P.undeclared} glyph="?" label="Undeclared pool" sub={undeclared ? short(undeclared.poolId) : "same pair"} tone={at("judge") ? "muted" : "danger"} show={at("quotes") && Boolean(board)} dim={at("requote")} />

            <AnimatePresence>
              {only("launch") && launch && <Chip key="rec" x={870} y={190} text={`pool = ${short(launch.canonicalPool.poolId)}`} tone="klamp" delay={1.3} />}
              {only("launch") && launch && <Stamp key="once" x={P.declared.x} y={P.declared.y + 78} text="ONCE" tone="klamp" delay={1.9} />}
              {at("quotes") && !at("requote") && board && declared && <Chip key="qd" x={P.declared.x} y={P.declared.y + 72} text={<Counter to={declared.quotedOut} />} tone="ink" />}
              {at("quotes") && !at("requote") && board && undeclared && <Chip key="qu" x={P.undeclared.x} y={P.undeclared.y + 72} text={<Counter to={undeclared.quotedOut} delay={0.2} />} tone="danger" />}
              {only("quotes") && board && <Chip key="third" x={P.undeclared.x - 10} y={P.undeclared.y - 70} text="third party" tone="muted" delay={0.3} />}
              {only("naive") && naive && <Stamp key="best" x={P.undeclared.x - 170} y={P.undeclared.y - 60} text="BEST?" tone="danger" delay={0.6} />}
              {only("lookup") && canonical && (
                <Chip key="reg" x={600} y={200} text={canonical.status === "registered" ? `registered · ${canonical.poolId.slice(0, 6)}…` : canonical.status} tone={registered ? "klamp" : "danger"} delay={0.8} />
              )}
              {at("judge") && judgement && !at("requote") && <Stamp key="x" x={P.undeclared.x - 190} y={P.undeclared.y - 20} text="REJECT" tone="danger" delay={0.2} />}
              {only("judge") && judgement && <Chip key="verdict" x={P.router.x} y={P.router.y + 80} text={judgement.verdict} tone="klamp" delay={0.6} big />}
              {at("requote") && requote && !at("outcome") && <Chip key="rq" x={P.declared.x} y={P.declared.y + 72} text={<Counter to={requote.quotedOut} />} tone="klamp" big />}
              {only("execute") && execution && <Chip key="cd" x={P.router.x} y={P.router.y + 80} text="calldata ✓ judged key" tone="ok" delay={0.3} />}
              {only("execute") && execution && <Chip key="got" x={P.trader.x} y={P.trader.y + 80} text={<Counter to={execution.receivedOut} delay={1.2} duration={1.8} />} tone="klamp" big delay={1} />}
            </AnimatePresence>
          </Svg>

          <AnimatePresence>{only("seal") && seal && <SealBoard key="seal" seal={seal} />}</AnimatePresence>

          <AnimatePresence>
            {only("outcome") && naiveOutcome && execution && requote && (
              <Outcome initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card tone="klamp" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                  <h2>Klamp · declared pool</h2>
                  <strong><Counter to={execution.receivedOut} duration={1.6} /></strong>
                  <p>KHOOK received · tx {short(execution.txHash)}</p>
                </Card>
                <Card tone="danger" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
                  <h2>Naive · if its hook charged 10% <Tag>Simulated</Tag></h2>
                  <strong><Counter from={naiveOutcome.quotedOut} to={naiveOutcome.receivedOut} duration={2.2} delay={0.9} /></strong>
                  <p>−{(naiveOutcome.lossBps / 100).toFixed(2)}% at {naiveOutcome.wideSlippageBps / 100}% slippage · reverts at {naiveOutcome.traderSlippageBps / 100}%</p>
                </Card>
              </Outcome>
            )}
          </AnimatePresence>
        </Canvas>

        <Foot>
          <Dots aria-label="Steps">
            {steps.map((step, index) => (
              <li key={step}>
                <Dot
                  type="button" aria-label={`Go to step ${index + 1}: ${captions[step].title}`} disabled={busy}
                  state={stage === step ? "active" : s > index + 1 ? "done" : "todo"}
                  onClick={() => { setPlaying(false); goToStage(step); }}
                />
              </li>
            ))}
          </Dots>
          <Controls>
            <Hint>→ next · ← back · P play · R reset</Hint>
            <Button onClick={() => { setPlaying(false); reset(); }} disabled={busy || stage === "idle"}>Reset</Button>
            <Button onClick={goBack} disabled={busy || stage === "idle"} aria-label="Previous step">←</Button>
            <Button onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>{playing ? "Pause" : "Play"}</Button>
            <Button primary onClick={next} disabled={busy} aria-label="Next step">{stage === "outcome" ? "Replay" : "Next →"}</Button>
          </Controls>
        </Foot>
      </Screen>
    </ReducedMotion>
  );
}
