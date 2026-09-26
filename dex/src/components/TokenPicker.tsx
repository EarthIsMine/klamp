import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { short } from "../lib/chain";
import type { KnownToken } from "../lib/config";
import { tokenInfo } from "../lib/pools";
import { addressUrl } from "./Ext";

/** Token avatar: a coloured disc with the ticker's first letters. Generated here, not stored anywhere. */
export function TokenIcon({ symbol, size = 24 }: { symbol: string; size?: number }) {
  const hue = [...symbol].reduce((sum, char) => sum + char.charCodeAt(0) * 37, 0) % 360;
  return (
    <span className="token-icon" style={{ width: size, height: size, fontSize: size * 0.42, background: symbol === "ETH" ? "#20201e" : `hsl(${hue} 62% 46%)` }} aria-hidden>
      {symbol === "ETH" ? "Ξ" : symbol.replace(/^K(?=[A-Z]{2})/, "").slice(0, 2)}
    </span>
  );
}

/**
 * A token pill inside the amount box, like a swap widget's token button. The popover lists KHOOK, tokens launched in this
 * browser and pasted addresses; each row opens the token on Etherscan too.
 */
export function TokenPicker({ tokens, value, onChange, onAdd }: {
  tokens: KnownToken[];
  value: Address;
  onChange: (token: Address) => void;
  onAdd: (token: KnownToken) => void;
}) {
  const [open, setOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = tokens.find((token) => token.address.toLowerCase() === value.toLowerCase());
  const symbol = current?.symbol ?? short(value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const pick = (address: Address) => { onChange(address); setOpen(false); };

  const addPasted = async () => {
    if (!isAddress(paste)) return setError("Not an address");
    try {
      const { symbol: pasted } = await tokenInfo(paste, null);
      const address = getAddress(paste);
      onAdd({ address, symbol: pasted });
      pick(address);
      setPaste("");
      setError("");
    } catch {
      setError("Not an ERC-20 on Sepolia");
    }
  };

  return (
    <div className="token-select" ref={ref}>
      <button type="button" className="token-pill" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Select token">
        <TokenIcon symbol={symbol} />
        <span>{symbol}</span>
        <span className="chev" aria-hidden>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="token-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
            <strong>Select a token</strong>
            <input
              value={paste}
              onChange={(event) => setPaste(event.target.value.trim())}
              onKeyDown={(event) => event.key === "Enter" && addPasted()}
              placeholder="Paste a token address"
              aria-label="Token address"
              autoFocus
            />
            {paste && <button type="button" className="ghost small" onClick={addPasted}>Add token</button>}
            {error && <span className="field-error">{error}</span>}
            <ul>
              {tokens.map((token) => (
                <li key={token.address} className={token.address === value ? "on" : ""}>
                  <button type="button" onClick={() => pick(token.address)}>
                    <TokenIcon symbol={token.symbol} size={28} />
                    <span><b>{token.symbol}</b><small>{token.mine ? "launched by you" : "Sepolia"}</small></span>
                  </button>
                  <a href={addressUrl(token.address)} target="_blank" rel="noreferrer" title="Open on Etherscan">{short(token.address)} ↗</a>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
