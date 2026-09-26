import { short } from "../lib/chain";
import { addressUrl } from "./Ext";

export type Protocol = "klamp" | "ens" | "uniswap" | "demo" | "token";
export type ContractUse = { name: string; address: string; use: string; kind: "tx" | "inner" | "read" | "sim"; protocol: Protocol };

const kindLabel = { tx: "you sign", inner: "inside tx", read: "reads", sim: "simulates" } as const;

/** What each protocol contributes, in the order a reader should meet them. */
const groups: { protocol: Protocol; title: string; role: string }[] = [
  { protocol: "klamp", title: "Klamp", role: "proves who issued the token, then records its pool once" },
  { protocol: "ens", title: "ENSv2", role: "holds the record at <token>.tokens.klamp.eth; any ENS client can read it" },
  { protocol: "uniswap", title: "Uniswap v4", role: "pools, quotes and swaps; Klamp changes none of it" },
  { protocol: "demo", title: "Demo contracts", role: "stand-ins for a launchpad, a pool opener and a hook" },
  { protocol: "token", title: "Token", role: "" },
];

/** What this screen talks to on Sepolia, grouped by protocol; every row opens the contract on Etherscan. */
export function Contracts({ items }: { items: ContractUse[] }) {
  return (
    <section className="contracts" aria-label="Contracts used here">
      <h3>Contracts used here</h3>
      {groups.map((group) => {
        const rows = items.filter((item) => item.protocol === group.protocol);
        if (rows.length === 0) return null;
        return (
          <div key={group.protocol} className={`contract-group group-${group.protocol}`}>
            <h4>{group.title}{group.role && <span> · {group.role}</span>}</h4>
            <ul>
              {rows.map((item) => (
                <li key={`${item.name}-${item.use}`}>
                  <span className={`kind kind-${item.kind}`}>{kindLabel[item.kind]}</span>
                  <a href={addressUrl(item.address)} target="_blank" rel="noreferrer" title="Open on Etherscan">
                    <b>{item.name}</b> <code>{short(item.address)}</code> <span aria-hidden>↗</span>
                  </a>
                  <em>{item.use}</em>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
