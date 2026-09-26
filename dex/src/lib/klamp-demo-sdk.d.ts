// Types for contract/demo/sepolia/klamp-sdk.mjs (plain JS, imported as-is through the @klamp/demo-sdk alias).
declare module "@klamp/demo-sdk" {
  import type { Address, Hex } from "viem";
  type Key = { currency0: Address; currency1: Address; fee: number; tickSpacing: number; hooks: Address };
  type Canonical = { status: string; poolId?: Hex };
  export const ADDR: {
    UNIVERSAL_RESOLVER_V2: Address;
    TOKENS_RESOLVER: Address;
    POOL_MANAGER: Address;
    V4_QUOTER: Address;
    UNIVERSAL_ROUTER: Address;
  };
  export const ZERO: Address;
  export function poolIdOf(key: Key): Hex;
  export function allowedPools<K extends Key>(canonical: Canonical, candidates: K[], verdict: string): K[];
  export function buildSwap(key: Key, amountIn: bigint, minOut: bigint, deadline: bigint): Hex;
  export function verifySwapCalldata(calldata: Hex, judgedKeys: Key[]): { ok: boolean; pools: Hex[] };
}
