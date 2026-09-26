import { useCallback, useState } from "react";
import { getAddress, type Address } from "viem";
import { KNOWN_TOKENS, type KnownToken } from "./config";

const STORAGE_KEY = "klamp-dex:tokens";

const load = (): KnownToken[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as KnownToken[];
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

/** Tokens the picker offers: KHOOK plus whatever this browser launched or pasted. */
export function useTokens() {
  const [saved, setSaved] = useState<KnownToken[]>(load);
  const tokens = [...KNOWN_TOKENS, ...saved.filter((t) => !KNOWN_TOKENS.some((k) => k.address === t.address))];
  const add = useCallback((token: KnownToken) => {
    setSaved((current) => {
      const next = [{ ...token, address: getAddress(token.address) }, ...current.filter((t) => t.address !== getAddress(token.address))];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* per-browser convenience only */ }
      return next;
    });
  }, []);
  const find = useCallback((address: Address) => tokens.find((t) => t.address.toLowerCase() === address.toLowerCase()), [tokens]);
  return { tokens, add, find };
}
