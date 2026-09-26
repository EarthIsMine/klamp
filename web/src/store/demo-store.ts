import { create } from "zustand";
import {
  compareRoutes,
  judge,
  type CanonicalPoolResult,
  type LaunchReceipt,
  type NaiveOutcome,
  type NaiveSelection,
  type QuoteBoard,
  type Requote,
  type ResolvedCanonicalPool,
  type RouteJudgement,
  type SwapExecution,
} from "@/domain/protocol";
import { mockProtocolClient, sepoliaProtocolClient, type ProtocolClient } from "@/data/protocol/client";

export type DemoStage = "idle" | "launch" | "quotes" | "naive" | "lookup" | "judge" | "requote" | "execute" | "outcome";
export type LaunchVisualStep = "idle" | "deploying" | "initializing" | "recording" | "complete";

export const demoStageOrder: DemoStage[] = ["idle", "launch", "quotes", "naive", "lookup", "judge", "requote", "execute", "outcome"];
const indexOf = (stage: DemoStage) => demoStageOrder.indexOf(stage);
const laterStage = (current: DemoStage, candidate: DemoStage) => (indexOf(candidate) > indexOf(current) ? candidate : current);

type DemoState = {
  stage: DemoStage;
  furthestStage: DemoStage;
  busy: boolean;
  launchStep: LaunchVisualStep;
  launch: LaunchReceipt | null;
  board: QuoteBoard | null;
  naive: NaiveSelection | null;
  canonical: ResolvedCanonicalPool | null;
  judgement: RouteJudgement | null;
  requote: Requote | null;
  execution: SwapExecution | null;
  naiveOutcome: NaiveOutcome | null;
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
  board: null,
  naive: null,
  canonical: null,
  judgement: null,
  requote: null,
  execution: null,
  naiveOutcome: null,
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const LAUNCH_SEQUENCE_INTERVAL_MS = 280;

/** Judge the naive router's pick the way the Klamp terminal does before signing. */
function judgeNaivePick(launch: LaunchReceipt, board: QuoteBoard, naive: NaiveSelection, canonical: CanonicalPoolResult): RouteJudgement | null {
  const picked = board.candidates.find((candidate) => candidate.id === naive.chosen);
  if (!picked) return null;
  const verdict = judge(launch.token, canonical, [{ key: picked.key, poolId: picked.poolId }]);
  const comparison = compareRoutes(launch.token, canonical, [[{
    chainId: BigInt(launch.canonicalPool.chainId),
    // Unused unless registered: compareRoutes blocks every other lookup state first.
    poolManager: canonical.status === "registered" ? canonical.poolManager : "0x0000000000000000000000000000000000000000",
    poolId: picked.poolId,
    tokenIn: picked.key.currency0,
    tokenOut: launch.token,
  }]]);
  return { verdict, comparison, judgedPoolId: picked.poolId };
}

export const useDemoStore = create<DemoState>((set, get) => ({
  ...initial,
  async advance(client = sepoliaProtocolClient) {
    const state = get();
    if (state.busy) return;
    const reach = (stage: DemoStage) => laterStage(get().furthestStage, stage);

    if (state.stage === "idle") {
      set({ ...initial, stage: "launch", busy: true, launchStep: "deploying" });
      const launchRequest = client.launchToken();
      await wait(LAUNCH_SEQUENCE_INTERVAL_MS);
      if (get().stage === "launch" && get().busy) set({ launchStep: "initializing" });
      await wait(LAUNCH_SEQUENCE_INTERVAL_MS);
      if (get().stage === "launch" && get().busy) set({ launchStep: "recording" });
      const launch = await launchRequest;
      if (get().stage !== "launch" || !get().busy) return;
      set({ launch, launchStep: "complete", furthestStage: reach("launch"), busy: false });
      return;
    }

    if (state.stage === "launch" && state.launch) {
      set({ stage: "quotes", busy: true });
      const board = await client.quoteCandidates(state.launch.token);
      set({ board, furthestStage: reach("quotes"), busy: false });
      return;
    }

    if (state.stage === "quotes" && state.board) {
      set({ stage: "naive", busy: true });
      const naive = await client.naivePick(state.board);
      set({ naive, furthestStage: reach("naive"), busy: false });
      return;
    }

    if (state.stage === "naive" && state.launch) {
      set({ stage: "lookup", busy: true });
      const canonical = await client.resolveCanonicalPool(state.launch.token);
      set({ canonical, furthestStage: reach("lookup"), busy: false });
      return;
    }

    if (state.stage === "lookup" && state.launch && state.board && state.naive && state.canonical) {
      set({ stage: "judge", busy: true });
      await wait(350);
      const judgement = judgeNaivePick(state.launch, state.board, state.naive, state.canonical);
      set({ judgement, furthestStage: reach("judge"), busy: false });
      return;
    }

    if (state.stage === "judge" && state.canonical?.status === "registered" && state.judgement?.verdict === "requote_canonical") {
      set({ stage: "requote", busy: true });
      const requote = await client.requoteCanonical(state.canonical.key, state.canonical.poolId);
      set({ requote, furthestStage: reach("requote"), busy: false });
      return;
    }

    if (state.stage === "requote" && state.requote) {
      set({ stage: "execute", busy: true });
      const execution = await client.buildAndExecute(state.requote);
      set({ execution, furthestStage: reach("execute"), busy: false });
      return;
    }

    if (state.stage === "execute" && state.naive) {
      set({ stage: "outcome", busy: true });
      const naiveOutcome = await client.executeNaive(state.naive);
      set({ naiveOutcome, furthestStage: reach("outcome"), busy: false });
      return;
    }

    if (state.stage === "outcome") set(initial);
  },
  goBack: () => {
    const state = get();
    if (state.busy || state.stage === "idle") return;
    if (state.stage === "launch") {
      set(initial);
      return;
    }
    set({ stage: demoStageOrder[indexOf(state.stage) - 1] });
  },
  goToStage: (target, client = mockProtocolClient) => {
    const state = get();
    if (state.busy) return;
    if (indexOf(target) <= indexOf(state.furthestStage)) {
      set({ stage: target });
      return;
    }

    const snapshot = client.getPresentationSnapshot?.();
    if (!snapshot) return;
    const reached = (stage: DemoStage) => indexOf(target) >= indexOf(stage);
    set({
      stage: target,
      furthestStage: target,
      busy: false,
      launchStep: "complete",
      launch: snapshot.launch,
      board: reached("quotes") ? snapshot.board : null,
      naive: reached("naive") ? snapshot.naive : null,
      canonical: reached("lookup") ? snapshot.canonical : null,
      judgement: reached("judge") ? snapshot.judgement : null,
      requote: reached("requote") ? snapshot.requote : null,
      execution: reached("execute") ? snapshot.execution : null,
      naiveOutcome: reached("outcome") ? snapshot.naiveOutcome : null,
    });
  },
  reset: () => set(initial),
}));
