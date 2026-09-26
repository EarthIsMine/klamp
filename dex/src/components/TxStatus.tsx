import { AnimatePresence, motion } from "motion/react";
import type { TxState } from "../lib/chain";
import { Ext, txUrl } from "./Ext";

const icon = { wallet: "◌", pending: "◌", done: "✓", error: "✕" } as const;
const text = { wallet: "Confirm in your wallet", pending: "Submitted, waiting for a block", done: "Confirmed", error: "" } as const;

/**
 * One toast per transaction: wallet prompt → submitted → confirmed or the revert reason,
 * with the contract it goes to and a "View on Etherscan" link once there is a hash.
 */
export function TxStatus({ state, to }: { state: TxState; to?: { name: string; address: string } }) {
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
          <span className="tx-body">
            <span className="tx-label">{state.label}</span>
            <span className="tx-text">{state.status === "error" ? state.message : text[state.status]}</span>
            {to && <span className="tx-to">to <Ext address={to.address}>{to.name}</Ext></span>}
          </span>
          {"hash" in state && state.hash && (
            <a className="tx-view" href={txUrl(state.hash)} target="_blank" rel="noreferrer">View on Etherscan ↗</a>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
