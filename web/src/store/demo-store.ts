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

export type DemoStage = "idle" | "launch" | "verify" | "attest" | "request" | "enforce" | "complete";
export type LaunchVisualStep = "idle" | "deploying" | "initializing" | "recording" | "complete";

type DemoState = {
  stage: DemoStage;
  busy: boolean;
  launchStep: LaunchVisualStep;
  launch: LaunchReceipt | null;
  canonical: CanonicalPoolResult | null;
  comparison: RouteComparison | null;
  attestation: HookAttestation | null;
  enforcement: FeeEnforcement | null;
  advance: (client?: ProtocolClient) => Promise<void>;
  reset: () => void;
};

const initial = {
  stage: "idle" as DemoStage,
  busy: false,
  launchStep: "idle" as LaunchVisualStep,
  launch: null,
  canonical: null,
  comparison: null,
  attestation: null,
  enforcement: null,
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const LAUNCH_SEQUENCE_INTERVAL_MS = 360;
const ATTACK_SEQUENCE_MS = 900;

export const useDemoStore = create<DemoState>((set, get) => ({
  ...initial,
  async advance(client = mockProtocolClient) {
    const state = get();
    if (state.busy) return;

    if (state.stage === "idle") {
      set({ ...initial, stage: "launch", busy: true, launchStep: "deploying" });
      const launchRequest = client.launchToken();

      await wait(LAUNCH_SEQUENCE_INTERVAL_MS);
      if (get().stage === "launch" && get().busy) set({ launchStep: "initializing" });

      await wait(LAUNCH_SEQUENCE_INTERVAL_MS);
      if (get().stage === "launch" && get().busy) set({ launchStep: "recording" });

      const launch = await launchRequest;
      if (get().stage !== "launch" || !get().busy) return;
      set({ launch, launchStep: "complete", stage: "launch", busy: false });
      return;
    }

    if (state.stage === "launch" && state.launch) {
      set({ stage: "verify", busy: true });
      const canonical = await client.resolveCanonicalPool(state.launch.token);
      if (canonical.status !== "found") {
        set({ canonical, stage: "complete", busy: false });
        return;
      }
      const comparison = compareRoutes(state.launch.token, canonical, [[{
        chainId: canonical.chainId,
        poolManager: canonical.poolManager,
        poolId: canonical.poolId,
        tokenIn: state.launch.canonicalPool.key.currency0,
        tokenOut: state.launch.token,
      }]]);
      set({ canonical, comparison, stage: "verify", busy: false });
      return;
    }

    if (state.stage === "verify" && state.launch) {
      set({ stage: "attest", busy: true });
      const attestation = await client.resolveHookAttestation(state.launch.canonicalPool.key.hooks);
      set({ attestation, stage: "attest", busy: false });
      return;
    }

    if (state.stage === "attest") {
      set({ stage: "request", busy: true });
      await wait(ATTACK_SEQUENCE_MS);
      if (get().stage === "request" && get().busy) set({ busy: false });
      return;
    }

    if (state.stage === "request") {
      set({ stage: "enforce", busy: true });
      const enforcement = await client.simulateFeeRequest(3000, 41842.17);
      set({ enforcement, stage: "complete", busy: false });
      return;
    }

    if (state.stage === "complete") set(initial);
  },
  reset: () => set(initial),
}));
