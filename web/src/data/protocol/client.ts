import type {
  CanonicalPoolResult,
  CanonicalPoolRecord,
  CapQuote,
  FeeEnforcement,
  HookAttestation,
  HookRevocation,
  HexAddress,
  LaunchReceipt,
  PresentationSnapshot,
  PoolKey,
  ProposedRoute,
  RouteForwarding,
  RouteHop,
} from "@/domain/protocol";

/**
 * The UI only talks to this port. A viem/wagmi-backed Sepolia adapter can replace
 * the mock without changing demo components or Zustand state.
 */
export interface ProtocolClient {
  launchToken(): Promise<LaunchReceipt>;
  buildRoute(token: HexAddress): Promise<ProposedRoute>;
  resolveCanonicalPool(token: HexAddress): Promise<CanonicalPoolResult>;
  resolveHookAttestation(hook: string): Promise<HookAttestation>;
  quoteVerifiedPool(poolId: HexAddress, currentFeeBps: number, capBps: number): Promise<CapQuote>;
  forwardVerifiedRoute(route: RouteHop): Promise<RouteForwarding>;
  simulateFeeRequest(requestedBps: number, quotedBps: number, quotedOut: number): Promise<FeeEnforcement>;
  revokeHook(hook: HexAddress): Promise<HookRevocation>;
  getPresentationSnapshot?(): PresentationSnapshot;
}

export const DEMO_POOL_KEY: PoolKey = {
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: "0x7A4b2F65c84A51D9A96c98f3cA7f5881eB02d135",
  fee: 0x800000,
  tickSpacing: 25,
  hooks: "0xC4A9906718d27DB7b3f0AbB2d9E62188C3A70080",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEMO_DELAY_MS = {
  launch: 1450,
  routeBuild: 1200,
  canonicalVerification: 1325,
  hookVerification: 1325,
  capQuote: 1200,
  routeForwarding: 1350,
  feeEnforcement: 1550,
  guardianRevocation: 1450,
} as const;

const DEMO_POOL_ID =
  "0x4692066cc525b9e3c28f2d7d6cbfc36c44836ca0112c586185f250fa0bd0cfbc" as const;
const REPLICA_POOL_ID =
  "0x93e858d08aafd523583e476f5ba44490f4d14a7cb7ac91cdb8a5bed452ea6da1" as const;
const REPLICA_HOOK = "0xB665A4B5C889DA8ACF911378a9DB3497792C00C0" as const;
const HOOK_CODE_HASH = "0x5f4d8e0fd234981581724f806c09120e6daaf6cad89e2ba75148274268a66291" as const;

const DEMO_CANONICAL: CanonicalPoolRecord = {
  chainId: 11155111,
  ensName: "0x7a4b2f65c84a51d9a96c98f3ca7f5881eb02d135.tokens.klamp.eth",
  token: DEMO_POOL_KEY.currency1,
  poolId: DEMO_POOL_ID,
  key: DEMO_POOL_KEY,
  issuer: "0x23f8209572b4a1C2AD88A42749E830791Fb027f1",
  creator: "0x2D08f5a5E3cA02D38B7aCf67B92fE4B29Cef5510",
  issuerProof: "create2",
  resolver: "0x6B2A681e01D5E623b1A5f03c15485f04b718D9a2",
  textRecord: `eip155:11155111:${DEMO_POOL_ID}`,
  dataVerified: true,
};

const launchReceipt = (): LaunchReceipt => ({
  txHash: "0x7c093f9c52a4b974d8ca3c2491fe0446b68b92aef32f7640d3133cf96b8ab47e",
  blockNumber: 9241851,
  token: DEMO_POOL_KEY.currency1,
  canonicalPool: DEMO_CANONICAL,
  hookRegistration: {
    ensName: `${DEMO_POOL_KEY.hooks.toLowerCase()}.hooks.klamp.eth`,
    capBps: 100,
    codeHash: HOOK_CODE_HASH,
  },
});

const proposedRoute = (token: HexAddress): ProposedRoute => ({
  aggregator: "Mock route aggregator",
  router: "Universal Router",
  candidates: [
    {
      id: "official",
      label: "Issuer pool",
      advertisedFeeBps: 25,
      hook: DEMO_POOL_KEY.hooks,
      route: [{
        chainId: 11155111n,
        poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
        poolId: DEMO_POOL_ID,
        tokenIn: DEMO_POOL_KEY.currency0,
        tokenOut: token,
      }],
    },
    {
      id: "replica",
      label: "Replica pool",
      advertisedFeeBps: 5,
      hook: REPLICA_HOOK,
      route: [{
        chainId: 11155111n,
        poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
        poolId: REPLICA_POOL_ID,
        tokenIn: DEMO_POOL_KEY.currency0,
        tokenOut: token,
      }],
    },
  ],
});

const canonicalResult = (): Extract<CanonicalPoolResult, { status: "found" }> => ({
  status: "found",
  source: "ens",
  chainId: 11155111n,
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  poolId: DEMO_POOL_ID,
});

const hookAttestation = (hook: string): HookAttestation => ({
  ensName: `${hook.toLowerCase()}.hooks.klamp.eth`,
  hook: hook as HookAttestation["hook"],
  capBps: 100,
  capMode: "immutable",
  codeHash: HOOK_CODE_HASH,
  beforeSwapReturnDelta: false,
  afterSwapReturnDelta: false,
  status: "verified",
});

const feeEnforcement = (requestedBps: number, quotedBps: number, quotedOut: number): FeeEnforcement => {
  const appliedBps = Math.min(requestedBps, 100);
  const grossOut = quotedOut / (1 - quotedBps / 10_000);
  return {
    requestedBps,
    appliedBps,
    capped: appliedBps < requestedBps,
    quotedOut,
    receivedOut: grossOut * (1 - appliedBps / 10_000),
    unguardedAppliedBps: requestedBps,
    unguardedReceivedOut: grossOut * (1 - requestedBps / 10_000),
  };
};

const hookRevocation = (hook: HexAddress): HookRevocation => ({
  ensName: `${hook.toLowerCase()}.hooks.klamp.eth`,
  resolver: null,
  attestationStatus: "revoked",
  routeStatus: "blocked",
});

export const mockProtocolClient: ProtocolClient = {
  async launchToken() {
    await wait(DEMO_DELAY_MS.launch);
    return launchReceipt();
  },
  async buildRoute(token) {
    await wait(DEMO_DELAY_MS.routeBuild);
    return proposedRoute(token);
  },
  async resolveCanonicalPool() {
    await wait(DEMO_DELAY_MS.canonicalVerification);
    return canonicalResult();
  },
  async resolveHookAttestation(hook) {
    await wait(DEMO_DELAY_MS.hookVerification);
    return hookAttestation(hook);
  },
  async quoteVerifiedPool(poolId, currentFeeBps, capBps) {
    await wait(DEMO_DELAY_MS.capQuote);
    return { basis: "current-fee", poolId, currentFeeBps, capBps, pricedBps: Math.min(currentFeeBps, capBps) };
  },
  async forwardVerifiedRoute(route) {
    await wait(DEMO_DELAY_MS.routeForwarding);
    return { poolId: route.poolId, poolManager: route.poolManager, status: "accepted" };
  },
  async simulateFeeRequest(requestedBps, quotedBps, quotedOut) {
    await wait(DEMO_DELAY_MS.feeEnforcement);
    return feeEnforcement(requestedBps, quotedBps, quotedOut);
  },
  async revokeHook(hook) {
    await wait(DEMO_DELAY_MS.guardianRevocation);
    return hookRevocation(hook);
  },
  getPresentationSnapshot() {
    const launch = launchReceipt();
    const proposal = proposedRoute(launch.token);
    const canonical = canonicalResult();
    const attestation = hookAttestation(launch.canonicalPool.key.hooks);
    const official = proposal.candidates[0].route[0];
    const quote: CapQuote = { basis: "current-fee", poolId: canonical.poolId, currentFeeBps: 25, capBps: attestation.capBps, pricedBps: 25 };
    return {
      launch,
      proposal,
      canonical,
      attestation,
      quote,
      forwarding: { poolId: official.poolId, poolManager: official.poolManager, status: "accepted" },
      enforcement: feeEnforcement(3000, quote.pricedBps, 42159.16),
      revocation: hookRevocation(launch.canonicalPool.key.hooks),
    };
  },
};
