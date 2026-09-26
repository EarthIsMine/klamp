import type { ReactNode } from "react";
import { short } from "../lib/chain";
import { EXPLORER } from "../lib/config";

export const addressUrl = (address: string) => `${EXPLORER}/address/${address}`;
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;

/** An address or a transaction on Sepolia Etherscan, shortened, opening in a new tab. */
export function Ext({ address, tx, children, title }: { address?: string; tx?: string; children?: ReactNode; title?: string }) {
  const href = address ? addressUrl(address) : tx ? txUrl(tx) : null;
  const label = children ?? short(address ?? tx ?? "");
  if (!href) return <>{label}</>;
  return (
    <a className="ext" href={href} target="_blank" rel="noreferrer" title={title ?? (address ? "Open address on Etherscan" : "Open transaction on Etherscan")}>
      {label}
    </a>
  );
}
