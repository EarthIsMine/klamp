import { create } from "zustand";
import {
  compareRoutes,
  type CanonicalPoolResult,
  type FeeEnforcement,
  type HookAttestation,
  type LaunchReceipt,
  type RouteComparison,
} from "@/domain/protocol";
import { mockProtocolClient, type ProtocolClient } from "@/data/protocol/client";

export type DemoStage = "idle" | "launch" | "verify" | "request" | "enforce" | "complete";

type DemoState = {
  stage: DemoStage;
  busy: boolean;
  launch: LaunchReceipt | null;
  canonical: CanonicalPoolResult | null;
  comparison: RouteComparison | null;
  attestation: HookAttestation | null;
  enforcement: FeeEnforcement | null;
  runDemo: (client?: ProtocolClient) => Promise<void>;
  reset: () => void;
};

const initial = {
  stage: "idle" as DemoStage,
  busy: false,
  launch: null,
  canonical: null,
  comparison: null,
  attestation: null,
  enforcement: null,
};

export const useDemoStore = create<DemoState>((set) => ({
  ...initial,
  async runDemo(client = mockProtocolClient) {
    set({ ...initial, stage: "launch", busy: true });
    const launch = await client.launchToken();
    set({ launch, stage: "verify" });
    const canonical = await client.resolveCanonicalPool(launch.token);
    if (canonical.status !== "found") {
      set({ canonical, stage: "complete", busy: false });
      return;
    }
    const comparison = compareRoutes(launch.token, canonical, [[{
      chainId: canonical.chainId,
      poolManager: canonical.poolManager,
      poolId: canonical.poolId,
      tokenIn: launch.canonicalPool.key.currency0,
      tokenOut: launch.token,
    }]]);
    const attestation = await client.resolveHookAttestation(launch.canonicalPool.key.hooks);
    set({ canonical, comparison, attestation, stage: "request" });
    await new Promise((resolve) => setTimeout(resolve, 650));
    set({ stage: "enforce" });
    const enforcement = await client.simulateFeeRequest(3000, 41842.17);
    set({ enforcement, stage: "complete", busy: false });
  },
  reset: () => set(initial),
}));
