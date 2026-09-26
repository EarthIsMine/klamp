import { useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { short } from "../lib/chain";
import type { KnownToken } from "../lib/config";
import { tokenInfo } from "../lib/pools";

/** KHOOK, tokens launched from this browser, or any pasted ERC-20 address. */
export function TokenPicker({ tokens, value, onChange, onAdd }: {
  tokens: KnownToken[];
  value: Address;
  onChange: (token: Address) => void;
  onAdd: (token: KnownToken) => void;
}) {
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");

  const addPasted = async () => {
    if (!isAddress(paste)) return setError("Not an address");
    try {
      const { symbol } = await tokenInfo(paste, null);
      const address = getAddress(paste);
      onAdd({ address, symbol });
      onChange(address);
      setPaste("");
      setError("");
    } catch {
      setError("Not an ERC-20 on Sepolia");
    }
  };

  return (
    <div className="picker">
      <select value={value} onChange={(event) => onChange(event.target.value as Address)} aria-label="Token">
        {tokens.map((token) => (
          <option key={token.address} value={token.address}>
            {token.symbol} · {short(token.address)}{token.mine ? " · yours" : ""}
          </option>
        ))}
      </select>
      <input
        value={paste}
        onChange={(event) => setPaste(event.target.value.trim())}
        onKeyDown={(event) => event.key === "Enter" && addPasted()}
        placeholder="or paste a token address"
        aria-label="Token address"
      />
      {paste && <button className="ghost small" onClick={addPasted}>Add</button>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}
