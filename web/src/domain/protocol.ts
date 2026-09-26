export type HexAddress = `0x${string}`;

export type PoolKey = {
  currency0: HexAddress;
  currency1: HexAddress;
  fee: number;
  tickSpacing: number;
  hooks: HexAddress;
};

export type IssuerProof = "create2" | "liquidity_launcher";

export type CanonicalPoolRecord = {
  chainId: number;
  ensName: string;
  token: HexAddress;
  poolId: HexAddress;
  key: PoolKey;
  issuer: HexAddress;
  creator: HexAddress;
  issuerProof: IssuerProof;
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

export type RouteHop = {
  chainId: bigint;
  poolManager: HexAddress;
  poolId: HexAddress;
  tokenIn: HexAddress;
  tokenOut: HexAddress;
};

export type RouteCandidate = {
  id: "official" | "replica";
  label: string;
  advertisedFeeBps: number;
  hook: HexAddress;
  route: RouteHop[];
};

export type ProposedRoute = {
  aggregator: string;
  router: string;
  candidates: RouteCandidate[];
};

export type RouteComparison =
  | { status: "match"; source: "ens" | "launch-event"; checkedHops: number }
  | { status: "mismatch"; branch: number; hop: number }
  | {
      status: "blocked";
      reason: "invalid-route" | Exclude<CanonicalPoolResult["status"], "registered">;
    };

export type HookAttestation = {
  ensName: string;
  hook: HexAddress;
  capBps: number;
  capMode: "immutable" | "mutable";
  codeHash: HexAddress;
  beforeSwapReturnDelta: boolean;
  afterSwapReturnDelta: boolean;
  status: "verified" | "revoked" | "missing";
};

export type CapQuote = {
  basis: "current-fee";
  poolId: HexAddress;
  currentFeeBps: number;
  capBps: number;
  pricedBps: number;
};

export type RouteForwarding = {
  poolId: HexAddress;
  poolManager: HexAddress;
  status: "accepted";
};

export type FeeEnforcement = {
  requestedBps: number;
  appliedBps: number;
  capped: boolean;
  quotedOut: number;
  receivedOut: number;
  unguardedAppliedBps: number;
  unguardedReceivedOut: number;
};

export type HookRevocation = {
  ensName: string;
  resolver: null;
  attestationStatus: "revoked";
  routeStatus: "blocked";
};

export type HookRegistration = {
  ensName: string;
  capBps: number;
  codeHash: HexAddress;
};

export type LaunchReceipt = {
  txHash: HexAddress;
  blockNumber: number;
  token: HexAddress;
  canonicalPool: CanonicalPoolRecord;
  hookRegistration: HookRegistration;
};

/** Optional presentation-only state used to seek through the local mock trace. */
export type PresentationSnapshot = {
  launch: LaunchReceipt;
  proposal: ProposedRoute;
  canonical: Extract<CanonicalPoolResult, { status: "registered" }>;
  attestation: HookAttestation;
  quote: CapQuote;
  forwarding: RouteForwarding;
  enforcement: FeeEnforcement;
  revocation: HookRevocation;
};

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value);
const isPoolId = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);

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
