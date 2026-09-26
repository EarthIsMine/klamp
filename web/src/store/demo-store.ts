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

const demoStageOrder: DemoStage[] = ["idle", "launch", "candidates", "verify", "attest", "forward", "request", "enforce", "revoke", "complete"];
const laterStage = (current: DemoStage, candidate: DemoStage) =>
  demoStageOrder.indexOf(candidate) > demoStageOrder.indexOf(current) ? candidate : current;

type DemoState = {
  stage: DemoStage;
  furthestStage: DemoStage;
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
  goBack: () => void;
  goToStage: (stage: DemoStage, client?: ProtocolClient) => void;
  reset: () => void;
};

const initial = {
  stage: "idle" as DemoStage,
  furthestStage: "idle" as DemoStage,
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
const LAUNCH_SEQUENCE_INTERVAL_MS = 420;
const ATTACK_SEQUENCE_MS = 1050;

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
      set({ launch, launchStep: "complete", stage: "launch", furthestStage: laterStage(state.furthestStage, "launch"), busy: false });
      return;
    }

    if (state.stage === "launch" && state.launch) {
      set({ stage: "candidates", busy: true });
      const proposal = await client.buildRoute(state.launch.token);
      set({ proposal, stage: "candidates", furthestStage: laterStage(state.furthestStage, "candidates"), busy: false });
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
      set({ canonical, comparison, stage: "verify", furthestStage: laterStage(state.furthestStage, "verify"), busy: false });
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
      set({ attestation, quote, stage: "attest", furthestStage: laterStage(state.furthestStage, "attest"), busy: false });
      return;
    }

    if (state.stage === "attest") {
      const official = state.proposal?.candidates.find((candidate) => candidate.id === "official");
      const route = official?.route[0];
      if (!route) return;
      set({ stage: "forward", busy: true });
      const forwarding = await client.forwardVerifiedRoute(route);
      set({ forwarding, stage: "forward", furthestStage: laterStage(state.furthestStage, "forward"), busy: false });
      return;
    }

    if (state.stage === "forward") {
      set({ stage: "request", busy: true });
      await wait(ATTACK_SEQUENCE_MS);
      if (get().stage === "request" && get().busy) set({ furthestStage: laterStage(state.furthestStage, "request"), busy: false });
      return;
    }

    if (state.stage === "request") {
      set({ stage: "enforce", busy: true });
      const enforcement = await client.simulateFeeRequest(3000, 41842.17);
      set({ enforcement, stage: "enforce", furthestStage: laterStage(state.furthestStage, "enforce"), busy: false });
      return;
    }

    if (state.stage === "enforce" && state.launch) {
      set({ stage: "revoke", busy: true });
      const revocation = await client.revokeHook(state.launch.canonicalPool.key.hooks);
      set({ revocation, stage: "complete", furthestStage: laterStage(state.furthestStage, "complete"), busy: false });
      return;
    }

    if (state.stage === "complete") set(initial);
  },
  goBack: () => {
    const state = get();
    if (state.busy) return;

    if (state.stage === "launch") {
      set(initial);
      return;
    }
    if (state.stage === "candidates") {
      set({ stage: "launch" });
      return;
    }
    if (state.stage === "verify") {
      set({ stage: "candidates" });
      return;
    }
    if (state.stage === "attest") {
      set({ stage: "verify" });
      return;
    }
    if (state.stage === "forward") {
      set({ stage: "attest" });
      return;
    }
    if (state.stage === "request") {
      set({ stage: "forward" });
      return;
    }
    if (state.stage === "enforce") {
      set({ stage: "request" });
      return;
    }
    if (state.stage === "revoke" || state.stage === "complete") {
      set({ stage: "enforce" });
    }
  },
  goToStage: (target, client = mockProtocolClient) => {
    const state = get();
    if (state.busy) return;

    const targetIndex = demoStageOrder.indexOf(target);
    if (targetIndex <= demoStageOrder.indexOf(state.furthestStage)) {
      if (target === "revoke" && state.revocation) {
        set({ stage: "complete" });
        return;
      }
      set({ stage: target });
      return;
    }

    const snapshot = client.getPresentationSnapshot?.();
    if (!snapshot) return;

    const reached = (stage: DemoStage) => targetIndex >= demoStageOrder.indexOf(stage);
    const official = snapshot.proposal.candidates.find((candidate) => candidate.id === "official");
    const comparison = compareRoutes(snapshot.launch.token, snapshot.canonical, official ? [official.route] : []);
    const isRevocation = target === "revoke" || target === "complete";

    set({
      stage: isRevocation ? "complete" : target,
      furthestStage: isRevocation ? "complete" : target,
      busy: false,
      launchStep: "complete",
      launch: snapshot.launch,
      proposal: reached("candidates") ? snapshot.proposal : null,
      canonical: reached("verify") ? snapshot.canonical : null,
      comparison: reached("verify") ? comparison : null,
      attestation: reached("attest") ? snapshot.attestation : null,
      quote: reached("attest") ? snapshot.quote : null,
      forwarding: reached("forward") ? snapshot.forwarding : null,
      enforcement: reached("enforce") ? snapshot.enforcement : null,
      revocation: isRevocation ? snapshot.revocation : null,
    });
  },
  reset: () => set(initial),
}));
