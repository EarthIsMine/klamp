import { short } from "../lib/chain";
import { addressUrl } from "./Ext";

export type ContractUse = { name: string; address: string; use: string; kind: "tx" | "inner" | "read" | "sim" };

const kindLabel = { tx: "you sign", inner: "inside tx", read: "reads", sim: "simulates" } as const;

/** What this screen talks to on Sepolia, like a wallet's "interacting with" line: every row opens the contract on Etherscan. */
export function Contracts({ items }: { items: ContractUse[] }) {
  return (
    <section className="contracts" aria-label="Contracts used here">
      <h3>Contracts used here</h3>
      <ul>
        {items.map((item) => (
          <li key={`${item.name}-${item.use}`}>
            <span className={`kind kind-${item.kind}`}>{kindLabel[item.kind]}</span>
            <a href={addressUrl(item.address)} target="_blank" rel="noreferrer" title="Open on Etherscan">
              <b>{item.name}</b> <code>{short(item.address)}</code> <span aria-hidden>↗</span>
            </a>
            <em>{item.use}</em>
          </li>
        ))}
      </ul>
    </section>
  );
}
