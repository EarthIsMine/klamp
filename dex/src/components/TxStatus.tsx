import { AnimatePresence, motion } from "motion/react";
import { short, type TxState } from "../lib/chain";
import { EXPLORER } from "../lib/config";

const icon = { wallet: "◌", pending: "◌", done: "✓", error: "✕" } as const;
const text = { wallet: "Confirm in wallet", pending: "Pending", done: "Confirmed", error: "" } as const;

/** One line per transaction: wallet prompt → pending (with the hash) → confirmed or the revert reason. */
export function TxStatus({ state }: { state: TxState }) {
  return (
    <AnimatePresence mode="wait">
      {state.status !== "idle" && (
        <motion.div
          key={`${state.label}-${state.status}`}
          className={`tx tx-${state.status}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <span className={`tx-icon ${state.status === "wallet" || state.status === "pending" ? "spin" : ""}`}>{icon[state.status]}</span>
          <span className="tx-label">{state.label}</span>
          <span className="tx-text">{state.status === "error" ? state.message : text[state.status]}</span>
          {"hash" in state && state.hash && (
            <a href={`${EXPLORER}/tx/${state.hash}`} target="_blank" rel="noreferrer">{short(state.hash)}</a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
