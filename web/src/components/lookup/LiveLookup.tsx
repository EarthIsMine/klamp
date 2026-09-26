"use client";

import styled from "@emotion/styled";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCanonicalPool, poolIdOf, SEPOLIA, type CanonicalPoolLookup } from "@/data/protocol/sepolia";
import { isStatic, judge, type HexAddress, type PoolKey, type Verdict } from "@/domain/protocol";
import { mono } from "@/styles/tokens";

const omz = {
  background: "#002B36",
  surface: "#073642",
  muted: "#839496",
  text: "#EEE8D5",
  cyan: "#2AA198",
  green: "#859900",
  yellow: "#B58900",
  blue: "#268BD2",
  red: "#DC322F",
} as const;

const ProtocolTerminal = styled.aside`
  min-width: 0; overflow: hidden; border: 1px solid #B8B8B5; border-radius: 10px;
  background: ${omz.background}; color: ${omz.text}; font-family: ${mono};
  box-shadow: 0 18px 45px rgba(32, 32, 30, .14), 0 2px 7px rgba(32, 32, 30, .1);
`;
const MacTitleBar = styled.div`
  min-height: 30px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 11px;
  background: #EAEAE8; border-bottom: 1px solid #C8C8C5; color: #4F4F4C;
  font: 500 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`;
const WindowControls = styled.div`
  display: flex; align-items: center; gap: 7px;
  i { display: block; width: 10px; height: 10px; border-radius: 50%; }
  i:nth-of-type(1) { background: #FF5F57; border: 1px solid #E0443E; }
  i:nth-of-type(2) { background: #FEBC2E; border: 1px solid #DFA123; }
  i:nth-of-type(3) { background: #28C840; border: 1px solid #1AAB29; }
`;
const MacTitle = styled.span`grid-column: 2; white-space: nowrap;`;
const TuiBar = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 13px;
  background: ${omz.surface}; color: ${omz.cyan}; font-size: 11px; line-height: 1;
  span:last-of-type { color: ${omz.blue}; }
`;
const TuiTarget = styled.form`
  display: grid; grid-template-columns: 78px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 12px 13px; font-size: 11px; line-height: 1.4;
  label { color: ${omz.muted}; }
  input {
    min-width: 0; width: 100%; padding: 5px 7px; border: 1px solid ${omz.muted}; border-radius: 3px; background: ${omz.background};
    color: ${omz.text}; font: inherit;
  }
  input:focus { outline: 1px solid ${omz.cyan}; border-color: ${omz.cyan}; }
  button { padding: 5px 9px; border: 1px solid ${omz.cyan}; border-radius: 3px; background: transparent; color: ${omz.cyan}; font: inherit; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  @media (max-width: 520px) { grid-template-columns: 1fr auto; label { display: none; } }
`;
const Presets = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; padding: 0 13px 12px; font-size: 11px; color: ${omz.muted};
  button { padding: 0; border: 0; border-bottom: 1px dotted ${omz.muted}; background: none; color: ${omz.text}; font: inherit; cursor: pointer; }
  button:hover { color: ${omz.cyan}; border-color: ${omz.cyan}; }
`;
const TuiSection = styled.section`border-top: 1px solid ${omz.muted};`;
const TuiSectionHead = styled.h2`
  display: flex; align-items: center; gap: 10px; margin: 0; padding: 8px 13px; background: ${omz.surface};
  color: ${omz.text}; font: 500 11px/1 ${mono};
  span { color: ${omz.yellow}; }
  em { margin-left: auto; color: ${omz.muted}; font-style: normal; }
`;
const TuiRows = styled.div`padding: 12px 13px 14px; display: grid; gap: 9px;`;
const TuiRow = styled.div<{ tone?: "ok" | "bad" | "muted" }>`
  display: grid; grid-template-columns: 128px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; font-size: 11px; line-height: 1.45;
  span:first-of-type { color: ${omz.muted}; }
  code { color: ${omz.text}; font: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  span:last-of-type { color: ${({ tone = "ok" }) => tone === "ok" ? omz.green : tone === "bad" ? omz.red : omz.muted}; }
  @media (max-width: 520px) { grid-template-columns: 106px minmax(0, 1fr); span:last-of-type { display: none; } }
`;
const TuiChecks = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid ${omz.muted};
  div { display: flex; justify-content: space-between; gap: 12px; padding: 11px 13px; color: ${omz.text}; font-size: 11px; }
  div + div { border-left: 1px solid ${omz.muted}; }
  strong { color: ${omz.green}; font-weight: 600; }
  @media (max-width: 520px) { grid-template-columns: 1fr; div + div { border-left: 0; border-top: 1px solid ${omz.muted}; } }
`;
const TuiStatus = styled.div<{ tone: "ok" | "bad" | "muted" }>`
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; background: ${omz.surface}; color: ${omz.text}; font-size: 11px;
  strong {
    align-self: stretch; display: flex; align-items: center; padding: 12px 13px; font-weight: 700; color: ${omz.background};
    background: ${({ tone }) => tone === "ok" ? omz.green : tone === "bad" ? omz.red : omz.muted};
  }
  span { padding: 0 13px; }
  span:last-of-type { color: ${omz.cyan}; }
`;

const KHOOK: HexAddress = "0x4cB41E85e1E16D7de576e2a262fF1b96eE948b96";
const PRESETS: { label: string; token: HexAddress }[] = [
  { label: "KHOOK (path A)", token: KHOOK },
  { label: "KDEMO (path B)", token: "0x5a37301CD105B8C9C85505B28FBE6327bd495188" },
  { label: "undeclared token", token: "0x1111111111111111111111111111111111111111" },
];
const ZERO: HexAddress = "0x0000000000000000000000000000000000000000";
/** The delta-fee demo hook: stands in for any hooked pool a router might quote that the issuer did not declare. */
const DEMO_HOOK: HexAddress = "0x8CcDe930348ecA47D39A0104807acb0e16F6c044";

const short = (value: string, head = 6) => `${value.slice(0, head)}…${value.slice(-4)}`;
const verdictCopy: Record<Verdict, { label: string; line: string; tone: "ok" | "bad" | "muted" }> = {
  allow: { label: "ALLOW", line: "route passes as quoted", tone: "ok" },
  requote_canonical: { label: "REQUOTE", line: "requote on the declared pool", tone: "ok" },
  requote_static: { label: "REQUOTE", line: "requote on static pools only", tone: "muted" },
  hold: { label: "HOLD", line: "lookup failed: do not sign", tone: "bad" },
};

type LookupState = { token: string; lookup: CanonicalPoolLookup | null; ms: number | null };

/** The hero terminal: a live ENSv2 lookup from this browser, then the verdict for an undeclared hook pool. */
export function LiveLookup() {
  const [input, setInput] = useState<string>(KHOOK);
  const [state, setState] = useState<LookupState>({ token: KHOOK, lookup: null, ms: null });
  const request = useRef(0);

  const run = useCallback(async (token: string) => {
    const id = ++request.current;
    setState({ token, lookup: null, ms: null });
    const started = performance.now();
    const lookup = await getCanonicalPool(token.trim());
    if (id === request.current) setState({ token: token.trim(), lookup, ms: Math.round(performance.now() - started) });
  }, []);

  useEffect(() => { void run(KHOOK); }, [run]);

  const { lookup } = state;
  const result = lookup?.result;
  const loading = lookup === null;
  const token = state.token as HexAddress;
  const validToken = /^0x[0-9a-fA-F]{40}$/.test(token);
  const hooked: PoolKey = { currency0: ZERO, currency1: token, fee: 500, tickSpacing: 10, hooks: DEMO_HOOK };
  const verdict = result && validToken ? judge(token, result, [{ key: hooked, poolId: poolIdOf(hooked) }]) : result ? "hold" : null;
  const declaredId = result?.status === "registered" ? result.poolId : null;
  const failure = result?.status === "lookup_failed" ? result.reason : null;
  const namespaceOk = result !== undefined && failure !== "namespace" && failure !== "rpc" && failure !== "chain" && failure !== "format";

  return (
    <ProtocolTerminal aria-label="Live Klamp lookup against Sepolia" aria-busy={loading}>
      <MacTitleBar>
        <WindowControls aria-hidden="true"><i /><i /><i /></WindowControls>
        <MacTitle>klamp — live ENSv2 lookup</MacTitle>
      </MacTitleBar>
      <TuiBar><span>klamp.verify</span><span>sepolia:{SEPOLIA.chainId.toString()}</span></TuiBar>
      <TuiTarget onSubmit={(event) => { event.preventDefault(); void run(input); }}>
        <label htmlFor="klamp-token">token</label>
        <input
          id="klamp-token" value={input} spellCheck={false} autoComplete="off" placeholder="0x… token address"
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" disabled={loading}>{loading ? "…" : "resolve"}</button>
      </TuiTarget>
      <Presets>
        try:
        {PRESETS.map((preset) => (
          <button key={preset.token} type="button" onClick={() => { setInput(preset.token); void run(preset.token); }}>{preset.label}</button>
        ))}
      </Presets>

      <TuiSection>
        <TuiSectionHead>
          <span>01</span>resolve canonical record
          <em>{lookup?.blockNumber ? `block #${lookup.blockNumber} · ${state.ms} ms` : loading ? "reading Sepolia…" : ""}</em>
        </TuiSectionHead>
        <TuiRows aria-live="polite">
          <TuiRow tone={loading ? "muted" : result?.status === "registered" ? "ok" : result?.status === "not_registered" ? "muted" : "bad"}>
            <span>ensv2</span><code>{lookup?.ensName ?? (validToken ? `${token.toLowerCase()}.tokens.klamp.eth` : state.token || "—")}</code>
            <span>[{loading ? "…" : result?.status === "lookup_failed" ? `lookup_failed: ${failure}` : result?.status}]</span>
          </TuiRow>
          <TuiRow tone={loading ? "muted" : namespaceOk ? "ok" : "bad"}>
            <span>resolver</span><code>{short(SEPOLIA.resolver)} (pinned)</code><span>[{loading ? "…" : namespaceOk ? "ok" : "unchecked"}]</span>
          </TuiRow>
          <TuiRow tone={loading ? "muted" : lookup?.textRecord ? "ok" : "muted"}>
            <span>text(&quot;pool&quot;)</span><code>{lookup?.textRecord ?? "—"}</code><span>[{loading ? "…" : lookup?.textRecord ? "ok" : "none"}]</span>
          </TuiRow>
          <TuiRow tone={loading ? "muted" : declaredId ? "ok" : failure === "record-mismatch" ? "bad" : "muted"}>
            <span>data(&quot;pool&quot;)</span>
            <code>{result?.status === "registered" ? `PoolKey fee ${result.key.fee} · hooks ${isStatic(result.key) ? "none" : short(result.key.hooks)}` : "—"}</code>
            <span>[{loading ? "…" : declaredId ? "hash = poolId" : failure === "record-mismatch" ? "mismatch" : "—"}]</span>
          </TuiRow>
        </TuiRows>
      </TuiSection>

      <TuiSection>
        <TuiSectionHead><span>02</span>judge a quoted undeclared hook pool</TuiSectionHead>
        <TuiChecks>
          <div><span>static</span><strong>no</strong></div>
          <div><span>declared</span><strong>{loading ? "…" : "no"}</strong></div>
          <div><span>verdict</span><strong>{verdict ?? "…"}</strong></div>
        </TuiChecks>
        <TuiRows>
          <TuiRow tone={verdict ? verdictCopy[verdict].tone : "muted"}>
            <span>next</span>
            <code>{declaredId ? `requote poolId ${short(declaredId, 10)}` : verdict === "requote_static" ? "no declared pool: static pools only" : verdict === "hold" ? "cannot tell which pool is canonical" : "—"}</code>
            <span>[{verdict ?? "…"}]</span>
          </TuiRow>
        </TuiRows>
      </TuiSection>
      <TuiStatus tone={verdict ? verdictCopy[verdict].tone : "muted"}>
        <strong>{verdict ? verdictCopy[verdict].label : "…"}</strong>
        <span>{verdict ? verdictCopy[verdict].line : "resolving via UniversalResolverV2"}</span>
        <span>{verdict ? (verdict === "hold" ? "exit 1" : "exit 0") : ""}</span>
      </TuiStatus>
    </ProtocolTerminal>
  );
}
