import { AnimatePresence, motion } from "motion/react";
import type { Address } from "viem";
import { short } from "../lib/chain";
import type { SwapRecord } from "../lib/history";
import { feeLabel, fmt } from "../lib/pools";
import { txUrl } from "./Ext";

const pct = (received: bigint, quoted: bigint) => (quoted === 0n ? 0 : (Number(received) / Number(quoted) - 1) * 100);

/** The latest swap of one routing mode: what it received, in large type, against what it was quoted. */
function Tile({ record, klamp }: { record: SwapRecord | undefined; klamp: boolean }) {
  const title = klamp ? "Klamp routing" : "Best quote only";
  if (!record) {
    return (
      <div className={`receipt empty ${klamp ? "receipt-klamp" : "receipt-naive"}`}>
        <span className="receipt-mode">{title}</span>
        <span className="receipt-none">No swap yet</span>
        <span className="receipt-meta">Turn Klamp routing {klamp ? "on" : "off"} and swap to fill this in.</span>
      </div>
    );
  }
  const quoted = BigInt(record.quoted);
  if (record.hash === null) {
    const would = record.wouldReceive ? BigInt(record.wouldReceive) : null;
    return (
      <motion.div key={`${record.at}`} className={`receipt reverted ${klamp ? "receipt-klamp" : "receipt-naive"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="receipt-mode">{title}</span>
        <span className="receipt-label">Swap reverts</span>
        <strong className="receipt-amount">0 <small>{record.symbol}</small></strong>
        {would !== null && <span className="receipt-diff down">pool pays {fmt(would)} · {pct(would, quoted).toFixed(2)}% vs quote</span>}
        <dl>
          <div><dt>Quoted</dt><dd>{fmt(quoted)}</dd></div>
          <div><dt>Minimum</dt><dd>{fmt(BigInt(record.minOut))}</dd></div>
          <div><dt>Pool</dt><dd>{feeLabel(record.fee)} · {record.pool}</dd></div>
        </dl>
        <span className="receipt-meta">Below the slippage minimum, so nothing was sent.</span>
      </motion.div>
    );
  }
  const received = BigInt(record.received);
  const diff = pct(received, quoted);
  return (
    <motion.div key={record.hash ?? record.at} className={`receipt ${klamp ? "receipt-klamp" : "receipt-naive"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="receipt-mode">{title}</span>
      <span className="receipt-label">Received</span>
      <strong className="receipt-amount">{fmt(received)} <small>{record.symbol}</small></strong>
      <span className={`receipt-diff ${diff < -0.005 ? "down" : "even"}`}>
        {diff < -0.005 ? `${diff.toFixed(2)}% vs quote` : diff > 0.005 ? `+${diff.toFixed(2)}% vs quote` : "= quote"}
      </span>
      <dl>
        <div><dt>Quoted</dt><dd>{fmt(quoted)}</dd></div>
        <div><dt>Minimum</dt><dd>{fmt(BigInt(record.minOut))}</dd></div>
        <div><dt>Paid</dt><dd>{fmt(BigInt(record.amountIn), 6)} ETH</dd></div>
        <div><dt>Pool</dt><dd>{feeLabel(record.fee)} · {record.pool}</dd></div>
      </dl>
      <a href={txUrl(record.hash)} target="_blank" rel="noreferrer">View on Etherscan ↗</a>
    </motion.div>
  );
}

/**
 * Your swaps for this token, side by side by routing mode, then the earlier ones.
 * Received amounts come from the swap receipts' token transfers to your address.
 */
export function SwapReceipts({ swaps, token }: { swaps: SwapRecord[]; token: Address }) {
  const mine = swaps.filter((swap) => swap.token.toLowerCase() === token.toLowerCase());
  if (mine.length === 0) return null;
  const naive = mine.find((swap) => !swap.klamp);
  const klamp = mine.find((swap) => swap.klamp);
  const earlier = mine.filter((swap) => swap !== naive && swap !== klamp);
  return (
    <section className="receipts" aria-label="Your swaps">
      <h3>Your swaps · {mine[0].symbol}</h3>
      <div className="receipt-pair">
        <Tile record={naive} klamp={false} />
        <Tile record={klamp} klamp />
      </div>
      <AnimatePresence>
        {earlier.length > 0 && (
          <motion.ul className="receipt-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {earlier.map((swap) => (
              <li key={swap.hash ?? swap.at}>
                <span className={`kind ${swap.klamp ? "kind-tx" : "kind-sim"}`}>{swap.klamp ? "Klamp" : "best quote"}</span>
                <b>{swap.hash === null ? "reverted" : fmt(BigInt(swap.received))}</b>
                <span>quoted {fmt(BigInt(swap.quoted))}{swap.wouldReceive ? ` · pool pays ${fmt(BigInt(swap.wouldReceive))}` : ""}</span>
                {swap.hash ? <a href={txUrl(swap.hash)} target="_blank" rel="noreferrer">{short(swap.hash)} ↗</a> : <span>not sent</span>}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  );
}
