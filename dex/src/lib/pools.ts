import { allowedPools, buildSwap, verifySwapCalldata } from "@klamp/demo-sdk";
import { getCanonicalPool, type CanonicalPoolResult } from "@klamp/sdk/canonicalPool";
import { compareRoutes, type RouteComparison } from "@klamp/sdk/compareRoutes";
import { isStatic, judge, type Verdict } from "@klamp/sdk/judge";
import { hashPoolKey, type PoolKey } from "@klamp/sdk/poolKey";
import { formatUnits, parseAbi, type Address, type Hex } from "viem";
import { canonicalRecordedEvent, initializeEvent, stateViewAbi, tokenAbi } from "./abis";
import { publicClient } from "./chain";
import { CONTRACTS, ETH, NETWORK } from "./config";

const LOG_RANGE = 50_000n; // public RPC limit per eth_getLogs
const DEFAULT_LOOKBACK = 200_000n; // about four weeks of Sepolia blocks

/** Block windows over the last DEFAULT_LOOKBACK blocks (or from `fromBlock`), each within the public RPC's getLogs limit. */
async function windows(fromBlock?: bigint): Promise<[bigint, bigint][]> {
  const latest = await publicClient.getBlockNumber();
  const start = fromBlock ?? (latest > DEFAULT_LOOKBACK ? latest - DEFAULT_LOOKBACK : 0n);
  const ranges: [bigint, bigint][] = [];
  for (let from = start; from <= latest; from += LOG_RANGE) {
    ranges.push([from, from + LOG_RANGE - 1n < latest ? from + LOG_RANGE - 1n : latest]);
  }
  return ranges;
}

export type DiscoveredPools = { keys: PoolKey[]; createdIn: Record<Hex, Hex> };

/**
 * Every ETH/token v4 pool, from PoolManager Initialize events: what a router indexing v4 would see.
 * `createdIn` maps each PoolId to the transaction that initialized it, for explorer links.
 */
export async function discoverPools(token: Address, fromBlock?: bigint): Promise<DiscoveredPools> {
  const logs = (
    await Promise.all(
      (await windows(fromBlock)).map(([from, to]) =>
        publicClient.getLogs({
          address: NETWORK.poolManager,
          event: initializeEvent,
          args: { currency0: ETH, currency1: token },
          fromBlock: from,
          toBlock: to,
        }),
      ),
    )
  ).flat();
  const keys = logs.map(({ args }) => ({
    currency0: args.currency0!,
    currency1: args.currency1!,
    fee: args.fee!,
    tickSpacing: args.tickSpacing!,
    hooks: args.hooks!,
  }));
  return { keys, createdIn: Object.fromEntries(logs.map((log) => [log.args.id!, log.transactionHash])) };
}

/** The transaction that initialized a pool, or null if it is older than the lookback. */
export async function poolCreationTx(poolId: Hex): Promise<Hex | null> {
  for (const [from, to] of (await windows()).reverse()) {
    const [log] = await publicClient.getLogs({ address: NETWORK.poolManager, event: initializeEvent, args: { id: poolId }, fromBlock: from, toBlock: to });
    if (log) return log.transactionHash;
  }
  return null;
}

/** The transaction in which the registrar recorded a token's canonical pool, or null if not found. */
export async function declarationTx(token: Address): Promise<Hex | null> {
  for (const [from, to] of (await windows()).reverse()) {
    const [log] = await publicClient.getLogs({ address: CONTRACTS.registrar, event: canonicalRecordedEvent, args: { token }, fromBlock: from, toBlock: to });
    if (log) return log.transactionHash;
  }
  return null;
}

export const poolExists = async (key: PoolKey) => {
  const [sqrtPrice] = await publicClient.readContract({
    address: NETWORK.stateView,
    abi: stateViewAbi,
    functionName: "getSlot0",
    args: [hashPoolKey(key)],
  });
  return sqrtPrice !== 0n;
};

const quoterAbi = parseAbi([
  "function quoteExactInputSingle(((address,address,uint24,int24,address) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) params) returns (uint256 amountOut, uint256 gasEstimate)",
]);

/** V4Quoter, ETH → token exact in. Same call as klamp-sdk.mjs `quote`, but through this app's RPC. null if the pool cannot fill it. */
export async function quote(key: PoolKey, amountIn: bigint): Promise<bigint | null> {
  try {
    const { result } = await publicClient.simulateContract({
      address: CONTRACTS.quoter,
      abi: quoterAbi,
      functionName: "quoteExactInputSingle",
      args: [{ poolKey: [key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks], zeroForOne: true, exactAmount: amountIn, hookData: "0x" }],
    });
    return result[0];
  } catch {
    return null;
  }
}

export type Quote = { key: PoolKey; poolId: Hex; out: bigint | null };
export type KlampCheck = { canonical: CanonicalPoolResult; verdict: Verdict; comparison: RouteComparison };
export type RoutePlan = { quotes: Quote[]; best: Quote | null; chosen: Quote | null; klamp: KlampCheck | null };

const pickBest = (quotes: Quote[]) =>
  quotes.filter((q) => q.out !== null && q.out > 0n).sort((a, b) => (b.out! > a.out! ? 1 : -1))[0] ?? null;

/**
 * Naive router: quote every pool with V4Quoter and take the largest output.
 * Klamp: read the canonical pool from ENSv2, judge the best route, and if needed requote on the pools the verdict allows.
 */
export async function planRoute(token: Address, keys: PoolKey[], amountIn: bigint, klampOn: boolean): Promise<RoutePlan> {
  const quotes = await Promise.all(keys.map(async (key) => ({ key, poolId: hashPoolKey(key), out: await quote(key, amountIn) })));
  const best = pickBest(quotes);
  if (!klampOn) return { quotes, best, chosen: best, klamp: null };

  const canonical = await getCanonicalPool(publicClient, NETWORK, token);
  const route = best ? [best.key] : [];
  const verdict = judge(token, canonical, route);
  const comparison = compareRoutes(token, canonical, best ? [[{
    chainId: NETWORK.chainId,
    poolManager: NETWORK.poolManager,
    poolId: best.poolId,
    tokenIn: ETH,
    tokenOut: token,
  }]] : []);
  let chosen = best;
  if (verdict !== "allow") {
    const allowed = allowedPools(canonical, keys, verdict).map(hashPoolKey);
    chosen = pickBest(quotes.filter((q) => allowed.includes(q.poolId)));
  }
  return { quotes, best, chosen, klamp: { canonical, verdict, comparison } };
}

export type PoolKind = "declared" | "static" | "hooked";
export const kindOf = (poolId: Hex, key: PoolKey, canonical?: CanonicalPoolResult): PoolKind =>
  canonical?.status === "registered" && canonical.poolId === poolId ? "declared" : isStatic(key) ? "static" : "hooked";

/** Universal Router V4_SWAP calldata for the chosen pool, checked against that PoolKey before signing. */
export function swapCalldata(chosen: Quote, amountIn: bigint, slippageBps: bigint) {
  const minOut = (chosen.out! * (10_000n - slippageBps)) / 10_000n;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const data = buildSwap(chosen.key, amountIn, minOut, deadline);
  return { data, minOut, check: verifySwapCalldata(data, [chosen.key]) };
}

export async function tokenInfo(token: Address, account: Address | null) {
  const [symbol, balance] = await Promise.all([
    publicClient.readContract({ address: token, abi: tokenAbi, functionName: "symbol" }),
    account ? publicClient.readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [account] }) : Promise.resolve(0n),
  ]);
  return { symbol, balance };
}

export const fmt = (value: bigint, digits = 2) =>
  Number(formatUnits(value, 18)).toLocaleString("en-US", { maximumFractionDigits: digits });
export const feeLabel = (fee: number) => ((fee & 0x800000) !== 0 ? "dynamic fee" : `${+(fee / 10_000).toFixed(3)}%`);
