import { useCallback, useState } from "react";
import type { Address, Hex } from "viem";

/** One swap sent from this browser. Amounts are decimal strings of token wei so they survive JSON. */
export type SwapRecord = {
  token: Address;
  symbol: string;
  klamp: boolean;
  poolId: Hex;
  fee: number;
  pool: string; // "declared", "static" or "undeclared hook" with Klamp on; "hook pool" or "no hook" without
  amountIn: string;
  quoted: string;
  minOut: string;
  received: string;
  hash: Hex;
  at: number;
};

const STORAGE_KEY = "klamp-dex:swaps";

const load = (): SwapRecord[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as SwapRecord[];
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

/** Swaps from this browser, newest first. Kept in localStorage so switching tabs or reloading keeps them. */
export function useSwapHistory() {
  const [swaps, setSwaps] = useState<SwapRecord[]>(load);
  const add = useCallback((record: SwapRecord) => {
    setSwaps((current) => {
      const next = [record, ...current].slice(0, 30);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* per-browser convenience only */ }
      return next;
    });
  }, []);
  return { swaps, add };
}
