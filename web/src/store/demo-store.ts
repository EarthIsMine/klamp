import { create } from "zustand";
import {
  compareRoutes,
  type CapQuote,
  type CanonicalPoolResult,
  type FeeEnforcement,
  type HookAttestation,
  type HookRevocation,
  type LaunchReceipt,
  type ProposedRoute,
  type RouteComparison,
  type RouteForwarding,
} from "@/domain/protocol";
import { mockProtocolClient, type ProtocolClient } from "@/data/protocol/client";

export type DemoStage = "idle" | "launch" | "candidates" | "verify" | "attest" | "forward" | "request" | "enforce" | "revoke" | "complete";
export type LaunchVisualStep = "idle" | "deploying" | "initializing" | "recording" | "complete";

type DemoState = {
  stage: DemoStage;
  busy: boolean;
  launchStep: LaunchVisualStep;
  launch: LaunchReceipt | null;
  proposal: ProposedRoute | null;
  canonical: CanonicalPoolResult | null;
  comparison: RouteComparison | null;
  attestation: HookAttestation | null;
  quote: CapQuote | null;
  forwarding: RouteForwarding | null;
  enforcement: FeeEnforcement | null;
  revocation: HookRevocation | null;
  advance: (client?: ProtocolClient) => Promise<void>;
  reset: () => void;
};

const initial = {
  stage: "idle" as DemoStage,
  busy: false,
  launchStep: "idle" as LaunchVisualStep,
  launch: null,
  proposal: null,
  canonical: null,
  comparison: null,
  attestation: null,
  quote: null,
  forwarding: null,
  enforcement: null,
  revocation: null,
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
      set({ stage: "candidates", busy: true });
      const proposal = await client.buildRoute(state.launch.token);
      set({ proposal, stage: "candidates", busy: false });
      return;
    }

    if (state.stage === "candidates" && state.launch && state.proposal) {
      set({ stage: "verify", busy: true });
      const canonical = await client.resolveCanonicalPool(state.launch.token);
      if (canonical.status !== "found") {
        set({ canonical, stage: "complete", busy: false });
        return;
      }
      const official = state.proposal.candidates.find((candidate) => candidate.id === "official");
      const comparison = compareRoutes(state.launch.token, canonical, official ? [official.route] : []);
      set({ canonical, comparison, stage: "verify", busy: false });
      return;
    }

    if (state.stage === "verify" && state.launch) {
      set({ stage: "attest", busy: true });
      const attestation = await client.resolveHookAttestation(state.launch.canonicalPool.key.hooks);
      if (
        attestation.status !== "verified" ||
        attestation.capMode !== "immutable" ||
        attestation.beforeSwapReturnDelta ||
        attestation.afterSwapReturnDelta
      ) {
        set({ attestation, stage: "complete", busy: false });
        return;
      }
      const quote = await client.quoteAtCap(state.launch.canonicalPool.poolId, 25, attestation.capBps);
      set({ attestation, quote, stage: "attest", busy: false });
      return;
    }

    if (state.stage === "attest") {
      const official = state.proposal?.candidates.find((candidate) => candidate.id === "official");
      const route = official?.route[0];
      if (!route) return;
      set({ stage: "forward", busy: true });
      const forwarding = await client.forwardVerifiedRoute(route);
      set({ forwarding, stage: "forward", busy: false });
      return;
    }

    if (state.stage === "forward") {
      set({ stage: "request", busy: true });
      await wait(ATTACK_SEQUENCE_MS);
      if (get().stage === "request" && get().busy) set({ busy: false });
      return;
    }

    if (state.stage === "request") {
      set({ stage: "enforce", busy: true });
      const enforcement = await client.simulateFeeRequest(3000, 41842.17);
      set({ enforcement, stage: "enforce", busy: false });
      return;
    }

    if (state.stage === "enforce" && state.launch) {
      set({ stage: "revoke", busy: true });
      const revocation = await client.revokeHook(state.launch.canonicalPool.key.hooks);
      set({ revocation, stage: "complete", busy: false });
      return;
    }

    if (state.stage === "complete") set(initial);
  },
  reset: () => set(initial),
}));
