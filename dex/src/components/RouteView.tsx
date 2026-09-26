import { motion } from "motion/react";
import { short } from "../lib/chain";
import { feeLabel, fmt, kindOf, type RoutePlan } from "../lib/pools";

const W = 620;
const ROW = 84;
const YOU = 64;
const GATE = 250;
const POOL = 470;

const kindText = { declared: "declared", static: "static", hooked: "undeclared hook" } as const;

/**
 * You → router (or Klamp) → every candidate pool. The chosen pool gets the animated flow;
 * with Klamp on, the best quote it rejected is crossed out.
 */
export function RouteView({ plan, klampOn, symbol, loading }: { plan: RoutePlan | null; klampOn: boolean; symbol: string; loading: boolean }) {
  const quotes = plan?.quotes ?? [];
  const height = Math.max(240, 60 + quotes.length * ROW);
  const mid = height / 2;
  const rowY = (index: number) => mid + (index - (quotes.length - 1) / 2) * ROW;
  const canonical = plan?.klamp?.canonical;
  const rejected = klampOn && plan?.best && plan.chosen?.poolId !== plan.best.poolId ? plan.best.poolId : null;
  const ens = canonical?.status;

  return (
    <svg className="route" viewBox={`0 0 ${W} ${height}`} role="img" aria-label="Swap route">
      <motion.line x1={YOU + 34} y1={mid} x2={GATE - 44} y2={mid} className="edge" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} />

      {quotes.map((q, index) => {
        const y = rowY(index);
        const chosen = plan?.chosen?.poolId === q.poolId;
        const cut = rejected === q.poolId;
        const d = `M${GATE + 44},${mid} C ${GATE + 120},${mid} ${POOL - 130},${y} ${POOL - 6},${y}`;
        const kind = kindOf(q.poolId, q.key, klampOn ? canonical : undefined);
        return (
          <g key={q.poolId}>
            <motion.path
              d={d}
              className={`edge ${chosen ? "edge-chosen" : cut ? "edge-cut" : ""}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 * index }}
            />
            {chosen && !loading && (
              <circle r={6} className="packet">
                <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
              </circle>
            )}
            {cut && (
              <motion.text x={(GATE + POOL) / 2 + 20} y={(mid + y) / 2 + 8} className="cut" initial={{ scale: 2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", delay: 0.4 }}>
                ✕
              </motion.text>
            )}
            <motion.g initial={{ opacity: 0, x: 12 }} animate={{ opacity: cut ? 0.55 : 1, x: 0 }} transition={{ delay: 0.1 * index }}>
              <rect x={POOL} y={y - 32} width={W - POOL - 4} height={64} rx={12} className={`pool ${chosen ? "pool-chosen" : ""} ${cut ? "pool-cut" : ""}`} />
              <text x={POOL + 14} y={y - 10} className="pool-title">{feeLabel(q.key.fee)} · {short(q.poolId, 6, 4)}</text>
              <text x={POOL + 14} y={y + 8} className={`pool-kind kind-${kind}`}>{klampOn ? kindText[kind] : kind === "static" ? "no hook" : "hook"}</text>
              <text x={POOL + 14} y={y + 25} className="pool-out">{q.out === null ? "no quote" : `${fmt(q.out)} ${symbol}`}</text>
            </motion.g>
          </g>
        );
      })}

      <g>
        <circle cx={YOU} cy={mid} r={32} className="node" />
        <text x={YOU} y={mid + 5} className="node-text">You</text>
      </g>
      <motion.g key={klampOn ? "klamp" : "router"} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ transformOrigin: `${GATE}px ${mid}px` }}>
        <rect x={GATE - 44} y={mid - 30} width={88} height={60} rx={14} className={klampOn ? "gate gate-klamp" : "gate"} />
        <text x={GATE} y={mid + 5} className="node-text gate-text">{klampOn ? "Klamp" : "Router"}</text>
      </motion.g>
      {klampOn && ens && (
        <motion.g initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <text x={GATE} y={mid - 44} className={`chip-text ens-${ens}`}>ENS · {ens.replace("_", " ")}</text>
          {plan?.klamp && plan.best && <text x={GATE} y={mid + 54} className="chip-text verdict">{plan.klamp.verdict}</text>}
        </motion.g>
      )}
      {loading && <text x={GATE} y={height - 10} className="chip-text muted">quoting…</text>}
    </svg>
  );
}
