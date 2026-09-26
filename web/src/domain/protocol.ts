export type HexAddress = `0x${string}`;

export type PoolKey = {
  currency0: HexAddress;
  currency1: HexAddress;
  fee: number;
  tickSpacing: number;
  hooks: HexAddress;
};

/** Where a step's values came from: read from Sepolia in this browser session, or the recorded demo snapshot. */
export type Evidence = { kind: "live"; blockNumber: number } | { kind: "recorded" };

export type IssuerProof = "create2" | "liquidity_launcher" | "liquidity_launcher_via";

export type CanonicalPoolRecord = {
  chainId: number;
  ensName: string;
  token: HexAddress;
  poolId: HexAddress;
  key: PoolKey;
  issuer: HexAddress;
  creator: HexAddress;
  issuerProof: IssuerProof;
  registrar: HexAddress;
  resolver: HexAddress;
  textRecord: string;
  dataVerified: true;
};

/** Mirrors contract/sdk/canonicalPool.ts. */
export type CanonicalPoolResult =
  | {
      status: "registered";
      source: "ens" | "launch-event";
      chainId: bigint;
      poolManager: HexAddress;
      poolId: HexAddress;
      key: PoolKey;
      warning?: "launch-pool-differs";
    }
  | { status: "not_registered" }
  | {
      status: "lookup_failed";
      reason:
        | "rpc"
        | "resolution"
        | "namespace"
        | "format"
        | "chain"
        | "pool-uninitialized"
        | "record-mismatch"
        | "multiple-launch-pools";
    };

/** A lookup result as the UI receives it: the SDK state plus where it came from. */
export type ResolvedCanonicalPool = CanonicalPoolResult & { evidence?: Evidence };

export type RouteHop = {
  chainId: bigint;
  poolManager: HexAddress;
  poolId: HexAddress;
  tokenIn: HexAddress;
  tokenOut: HexAddress;
};

export type RouteComparison =
  | { status: "match"; source: "ens" | "launch-event"; checkedHops: number }
  | { status: "mismatch"; branch: number; hop: number }
  | {
      status: "blocked";
      reason: "invalid-route" | Exclude<CanonicalPoolResult["status"], "registered">;
    };

/** One launch through the path A demo launchpad: token, hooked pool, locked liquidity and declaration in one tx. */
export type LaunchReceipt = {
  txHash: HexAddress;
  blockNumber: number;
  token: HexAddress;
  symbol: string;
  launchpad: HexAddress;
  liquidityLocked: true;
  canonicalPool: CanonicalPoolRecord;
  evidence?: Evidence;
};

/** A candidate v4 pool as a quoting router sees it. `simulated` marks data that is not a live Sepolia pool. */
export type CandidatePool = {
  id: "canonical" | "undeclared";
  label: string;
  key: PoolKey;
  poolId: HexAddress;
  quotedFeeBps: number;
  quotedOut: number;
  hookBehavior: string;
  simulated: boolean;
};

export type QuoteBoard = {
  amountIn: string;
  tokenIn: string;
  tokenOut: string;
  quoter: string;
  quoterAddress: HexAddress;
  candidates: CandidatePool[];
  evidence?: Evidence;
};

/** A naive router picks the largest quote and trusts it. */
export type NaiveSelection = {
  chosen: CandidatePool["id"];
  quotedOut: number;
  slippageBps: number;
  minOut: number;
};

export type Verdict = "allow" | "requote_canonical" | "requote_static" | "hold";

export type RouteJudgement = {
  verdict: Verdict;
  comparison: RouteComparison;
  judgedPoolId: HexAddress;
};

export type Requote = {
  poolId: HexAddress;
  key: PoolKey;
  quoter: string;
  quotedOut: number;
  slippageBps: number;
  minOut: number;
  evidence?: Evidence;
};

/** A Klamp-mode swap the team executed on Sepolia through the Universal Router. */
export type SwapExecution = {
  router: string;
  routerAddress: HexAddress;
  actions: string[];
  calldataVerified: boolean;
  amountIn: string;
  receivedOut: number;
  hookFeeOut: number;
  txHash: HexAddress;
  blockNumber: number;
  evidence?: Evidence;
};

/**
 * Simulated: what the naive pick would do if the undeclared pool's hook quoted 0.05% and charged 10% at swap time.
 * With the trader's slippage the swap reverts; with a wide tolerance it executes at a loss.
 */
export type NaiveOutcome = {
  quotedOut: number;
  executedFeeBps: number;
  receivedOut: number;
  lossBps: number;
  traderSlippageBps: number;
  traderMinOut: number;
  wideSlippageBps: number;
  wideMinOut: number;
  simulated: true;
};

/**
 * Who can still change the Klamp namespace, read from ENSv2 Enhanced Access Control (role holder counts).
 * `registryRegistrar` and `registryRegistrarAdmin` are the two roles kept on klamp.eth's registry (both held by the operator)
 * to add hooks.klamp.eth in stage 2; neither can replace tokens.klamp.eth, which never expires.
 */
export type SealStatus = {
  resolverRootRoles: number;
  keys: { key: string; writers: number; registrarOnly: boolean }[];
  tokensRoles: number;
  tokensNeverExpires: boolean;
  klampRoles: number;
  klampExpiryYear: number;
  registryRegistrar: number;
  registryRegistrarAdmin: number;
  registryOtherRoles: number;
  evidence?: Evidence;
};

/** Optional presentation-only state used to seek through the local mock trace. */
export type PresentationSnapshot = {
  launch: LaunchReceipt;
  board: QuoteBoard;
  naive: NaiveSelection;
  canonical: Extract<CanonicalPoolResult, { status: "registered" }>;
  seal: SealStatus;
  judgement: RouteJudgement;
  requote: Requote;
  execution: SwapExecution;
  naiveOutcome: NaiveOutcome;
};

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
const isPoolId = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const DYNAMIC_FEE_FLAG = 0x800000;

/** Fee fixed in the PoolKey: no hooks and no dynamic-fee flag. Quoted fee = executed fee. */
export const isStatic = (key: PoolKey) => sameAddress(key.hooks, ZERO_ADDRESS) && (key.fee & DYNAMIC_FEE_FLAG) === 0;

/**
 * Mirrors contract/sdk/judge.ts. Only pools that contain `token` are judged.
 * The SDK hashes each PoolKey; the UI receives the PoolId alongside the key.
 */
export function judge(
  token: HexAddress,
  canonical: CanonicalPoolResult,
  route: readonly { key: PoolKey; poolId: HexAddress }[],
): Verdict {
  const hops = route.filter(({ key }) => sameAddress(key.currency0, token) || sameAddress(key.currency1, token));
  const isCanonical = (poolId: HexAddress) => canonical.status === "registered" && sameAddress(poolId, canonical.poolId);
  if (hops.every(({ key, poolId }) => isStatic(key) || isCanonical(poolId))) return "allow";
  if (canonical.status === "registered") return "requote_canonical";
  if (canonical.status === "not_registered") return "requote_static";
  return "hold";
}

/** Mirrors contract/sdk/compareRoutes.ts; it validates declared route data, not opaque calldata. */
export function compareRoutes(
  token: HexAddress,
  canonical: CanonicalPoolResult,
  branches: readonly (readonly RouteHop[])[],
): RouteComparison {
  if (canonical.status !== "registered") return { status: "blocked", reason: canonical.status };
  if (!isAddress(token) || branches.length === 0) {
    return { status: "blocked", reason: "invalid-route" };
  }

  let checkedHops = 0;
  for (const [branchIndex, branch] of branches.entries()) {
    let targetHops = 0;
    for (const [hopIndex, hop] of branch.entries()) {
      if (
        typeof hop.chainId !== "bigint" ||
        hop.chainId <= 0n ||
        !isAddress(hop.poolManager) ||
        !isAddress(hop.tokenIn) ||
        !isAddress(hop.tokenOut) ||
        !isPoolId(hop.poolId)
      ) {
        return { status: "blocked", reason: "invalid-route" };
      }
      if (!sameAddress(hop.tokenIn, token) && !sameAddress(hop.tokenOut, token)) continue;
      targetHops += 1;
      checkedHops += 1;
      if (
        hop.chainId !== canonical.chainId ||
        !sameAddress(hop.poolManager, canonical.poolManager) ||
        !sameAddress(hop.poolId, canonical.poolId)
      ) {
        return { status: "mismatch", branch: branchIndex, hop: hopIndex };
      }
    }
    if (targetHops === 0) return { status: "blocked", reason: "invalid-route" };
  }
  return { status: "match", source: canonical.source, checkedHops };
}
