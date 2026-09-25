import type {
  CanonicalPoolResult,
  CanonicalPoolRecord,
  FeeEnforcement,
  HookAttestation,
  HexAddress,
  LaunchReceipt,
  PoolKey,
} from "@/domain/protocol";

/**
 * The UI only talks to this port. A viem/wagmi-backed Sepolia adapter can replace
 * the mock without changing demo components or Zustand state.
 */
export interface ProtocolClient {
  launchToken(): Promise<LaunchReceipt>;
  resolveCanonicalPool(token: HexAddress): Promise<CanonicalPoolResult>;
  resolveHookAttestation(hook: string): Promise<HookAttestation>;
  simulateFeeRequest(requestedBps: number, quotedOut: number): Promise<FeeEnforcement>;
}

export const DEMO_POOL_KEY: PoolKey = {
  currency0: "0x0000000000000000000000000000000000000000",
  currency1: "0x7A4b2F65c84A51D9A96c98f3cA7f5881eB02d135",
  fee: 0x800000 | 500,
  tickSpacing: 25,
  hooks: "0xC4A9906718d27DB7b3f0AbB2d9E62188C3A71140",
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DEMO_POOL_ID =
  "0x91f62a3ac70c4d7d6418c69e3d2a1b081e6149c2f54a775b9d928f08d86e46b0" as const;

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

export const mockProtocolClient: ProtocolClient = {
  async launchToken() {
    await wait(520);
    return {
      txHash: "0x7c093f9c52a4b974d8ca3c2491fe0446b68b92aef32f7640d3133cf96b8ab47e",
      blockNumber: 9241851,
      token: DEMO_POOL_KEY.currency1,
      canonicalPool: DEMO_CANONICAL,
    };
  },
  async resolveCanonicalPool() {
    await wait(430);
    return {
      status: "found",
      source: "ens",
      chainId: 11155111n,
      poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
      poolId: DEMO_POOL_ID,
    };
  },
  async resolveHookAttestation(hook) {
    await wait(420);
    return {
      ensName: `${hook.toLowerCase()}.hooks.klamp.eth`,
      hook: hook as HookAttestation["hook"],
      capBps: 100,
      codeHash: "0x5f4d8e0fd234981581724f806c09120e6daaf6cad89e2ba75148274268a66291",
      status: "verified",
    };
  },
  async simulateFeeRequest(requestedBps, quotedOut) {
    await wait(520);
    const appliedBps = Math.min(requestedBps, 100);
    return {
      requestedBps,
      appliedBps,
      capped: appliedBps < requestedBps,
      quotedOut,
      receivedOut: quotedOut,
    };
  },
};
