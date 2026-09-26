"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import { Mark } from "@/components/brand/Mark";
import { demoStageOrder, useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

type Copy = { state: string; title: string; detail: string };

const copy: Record<DemoStage, Copy> = {
  idle: { state: "Step 1 of 8", title: "Launch and declare the canonical pool", detail: "A CREATE2 launchpad deploys the token, creates its hooked pool with locked liquidity and declares that pool in the same transaction." },
  launch: { state: "Step 1 complete", title: "Canonical pool declared once", detail: "The registrar proved the launchpad deployed KHOOK and wrote the pool to ENSv2. Nobody, including us, can change it." },
  quotes: { state: "Step 2 complete", title: "Two pools quote for the same pair", detail: "A look-alike hook pool quotes 0.05% and beats the declared pool on paper. Anyone can create it; the token issuer did not." },
  naive: { state: "Step 3 complete", title: "A naive router takes the best quote", detail: "Quoting every pool and picking the largest output sends the trader to the look-alike pool." },
  lookup: { state: "Step 4 complete", title: "Klamp reads the declared pool from ENS", detail: "Standard ENS resolution through UniversalResolverV2 answers the wildcard name. No Klamp ABI is needed to read it." },
  judge: { state: "Step 5 complete", title: "The picked hook pool fails the verdict", detail: "It is neither the declared pool nor a static pool, so its quote cannot be trusted. The verdict is requote_canonical." },
  requote: { state: "Step 6 complete", title: "Requoted on the declared pool", detail: "V4Quoter prices the declared pool directly. The minimum output is set from this quote and the trader's slippage." },
  execute: { state: "Step 7 complete", title: "Calldata checked, then swapped", detail: "The Universal Router calldata is decoded again before signing and must name the judged PoolKey. The trader received what was quoted." },
  outcome: { state: "Trace complete", title: "The quoted fee is the fee paid", detail: "The naive route loses almost 10% to a swap-time fee. The Klamp route receives its quote. Traders did nothing extra." },
};

const pendingCopy: Partial<Record<DemoStage, Copy>> = {
  launch: { state: "Step 1 of 8", title: "Running the launch transaction", detail: "Deploy the token, initialize the hooked pool, add locked liquidity, then call recordByCreate2." },
  quotes: { state: "Step 2 of 8", title: "Quoting candidate pools", detail: "The router asks V4Quoter for every pool that trades ETH for KHOOK." },
  naive: { state: "Step 3 of 8", title: "Naive router choosing a pool", detail: "Only the quoted output decides. The router cannot tell which pool the issuer intended." },
  lookup: { state: "Step 4 of 8", title: "Resolving the canonical pool", detail: "Klamp resolves 0x<token>.tokens.klamp.eth and checks the pinned resolver, both records and the pool state." },
  judge: { state: "Step 5 of 8", title: "Judging the proposed route", detail: "Only pools that contain the token are judged: declared or static pools pass, other hook pools are requoted." },
  requote: { state: "Step 6 of 8", title: "Requoting on the declared pool", detail: "V4Quoter quoteExactInputSingle on the canonical PoolKey." },
  execute: { state: "Step 7 of 8", title: "Building and verifying the swap", detail: "V4_SWAP with SWAP_EXACT_IN_SINGLE, SETTLE_ALL, TAKE_ALL, checked against the judged route before signing." },
  outcome: { state: "Step 8 of 8", title: "Comparing both executions", detail: "The naive pick executes against the look-alike hook's swap-time fee." },
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Launch", detail: "Declared in ENS" },
  { stage: "quotes" as const, index: "2", title: "Quotes", detail: "Declared + look-alike" },
  { stage: "naive" as const, index: "3", title: "Naive pick", detail: "Best quote wins" },
  { stage: "lookup" as const, index: "4", title: "Lookup", detail: "tokens.klamp.eth" },
  { stage: "judge" as const, index: "5", title: "Judge", detail: "requote_canonical" },
  { stage: "requote" as const, index: "6", title: "Requote", detail: "Declared pool" },
  { stage: "execute" as const, index: "7", title: "Execute", detail: "Calldata verified" },
  { stage: "outcome" as const, index: "8", title: "Outcome", detail: "Quote = paid" },
];

function stageIndex(stage: DemoStage) { return demoStageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }
function amount(value: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }
function percent(bps: number) { return `${(bps / 100).toFixed(2)}%`; }

const Shell = styled.section`
  width: 100%; max-width: ${layout.maxWidth}; height: 100%; min-width: 0; min-height: 0; margin: 0 auto; padding: 18px 24px 22px; display: flex;
  @media (max-width: 820px), (max-height: 640px) { height: auto; min-height: calc(100dvh - 56px); padding: 14px 16px 28px; }
`;
const Instrument = styled.div`
  flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr);
  border-top: 3px solid ${colors.textPrimary}; border-bottom: 1px solid ${colors.borderStrong}; background: ${colors.surface};
`;
const InstrumentHead = styled.div`
  min-height: 42px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid ${colors.border}; font-size: 13px;
`;
const TraceName = styled.div`display: flex; align-items: center; gap: 9px; font-weight: 650;`;
const TraceMark = styled.span<{ complete: boolean }>`width: 8px; height: 8px; background: ${({ complete }) => complete ? colors.primary : colors.textPrimary};`;
const TraceNote = styled.span`color: ${colors.textMuted}; font-size: 12px;`;

const Progress = styled.ol`
  list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(8, 1fr); border-bottom: 1px solid ${colors.border}; overflow-x: auto;
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; min-width: 124px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
  &::before {
    content: ""; position: absolute; left: 10px; right: 10px; top: -1px; height: 3px;
    background: ${({ active, done }) => active ? colors.primary : done ? colors.textPrimary : "transparent"};
    transform-origin: left; animation: ${({ active }) => active ? "progressIn .34s ease-out" : "none"};
  }
  @keyframes progressIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;
const ProgressButton = styled.button`
  width: 100%; min-height: 61px; padding: 13px 10px 12px; border: 0; background: transparent; color: inherit; text-align: left; cursor: pointer;
  &:hover:not(:disabled) { background: ${colors.surfaceSecondary}; }
  &:disabled { cursor: default; }
  &:focus-visible { position: relative; z-index: 2; outline-offset: -3px; }
`;
const StepNumber = styled.span`font: 500 12px/1 ${mono}; margin-right: 8px;`;
const StepTitle = styled.span`font-size: 13px; font-weight: 650;`;
const StepDetail = styled.div`font-size: 12px; color: ${colors.textMuted}; margin: 5px 0 0 20px;`;

const Stage = styled.div`
  min-height: 0; overflow: hidden; padding: 20px 24px 19px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
  @media (max-width: 820px), (max-height: 640px) { overflow: visible; display: block; }
  @media (max-width: 620px) { padding: 20px 16px; }
`;
const StageHead = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 430px); align-items: end; gap: 42px; margin-bottom: 16px;
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 7px; }
`;
const StageState = styled.div`color: ${colors.primaryHover}; font-size: 13px; font-weight: 650; margin-bottom: 5px;`;
const StageTitle = styled.h1`font-size: clamp(26px, 3vw, 34px); line-height: 1.05; letter-spacing: -.035em; margin: 0; font-weight: 650;`;
const StageDetail = styled.p`color: ${colors.textSecondary}; font-size: 15px; line-height: 1.5; margin: 0;`;

const Scene = styled.div`
  min-height: 0; overflow: hidden; display: grid; place-items: center; padding: clamp(22px, 4vh, 42px);
  border-top: 1px solid ${colors.borderStrong}; border-bottom: 1px solid ${colors.borderStrong};
  animation: sceneIn .34s cubic-bezier(.2,.75,.25,1);
  @keyframes sceneIn { from { opacity: .25; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 820px) { min-height: 390px; }
`;
const SceneLabel = styled.div`color: ${colors.textMuted}; font-size: 13px; margin-bottom: 8px;`;
const Simulated = styled.span`
  display: inline-block; margin-left: 8px; padding: 2px 6px; border: 1px solid ${colors.warning}; color: ${colors.warning};
  font: 600 10px/1.2 ${mono}; text-transform: uppercase; letter-spacing: .04em; vertical-align: middle;
`;

const LaunchFlow = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: 220px 96px minmax(0, 1fr); align-items: center;
  @media (max-width: 720px) { grid-template-columns: 1fr; gap: 20px; }
`;
const LaunchActor = styled.div`
  padding: 18px 20px; background: ${colors.textPrimary}; color: white;
  h2 { margin: 0; font-size: 19px; }
  p { margin: 8px 0 0; color: ${colors.border}; font-size: 13px; line-height: 1.45; }
`;
const LaunchBridge = styled.div<{ active: boolean }>`
  position: relative; display: grid; place-items: center;
  &::before {
    content: ""; position: absolute; left: 0; right: 0; height: 2px; background: ${colors.primary}; transform-origin: left;
    transform: scaleX(0); animation: ${({ active }) => active ? "launchLine .5s ease-out both" : "none"};
  }
  img { position: relative; z-index: 1; background: white; padding: 8px; }
  @keyframes launchLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @media (max-width: 720px) { display: none; }
`;
const LaunchReceipt = styled.dl`
  margin: 0; padding: 0 18px; display: grid; grid-template-columns: 145px minmax(0, 1fr); border-top: 1px solid ${colors.borderStrong};
  dt, dd { margin: 0; padding: 12px 0; border-bottom: 1px solid ${colors.border}; }
  dt { color: ${colors.textSecondary}; font-size: 13px; }
  dd { font: 500 13px/1.45 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const CandidateBoard = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: 180px minmax(50px, 1fr) minmax(420px, 1.6fr); align-items: center;
  @media (max-width: 720px) { grid-template-columns: 1fr; gap: 20px; }
`;
const CandidateSource = styled.div`
  display: grid; justify-items: center; gap: 10px; text-align: center;
  img { width: 54px; height: 54px; }
  strong { font-size: 16px; }
  span { color: ${colors.textMuted}; font-size: 12px; }
`;
const ForkRail = styled.div`
  position: relative; height: 126px;
  &::before, &::after { content: ""; position: absolute; left: 0; width: 100%; height: 2px; background: ${colors.borderStrong}; transform-origin: left; animation: forkOut .6s ease-out both; }
  &::before { top: 28%; transform: rotate(-12deg); }
  &::after { bottom: 28%; transform: rotate(12deg); animation-delay: .14s; }
  i { position: absolute; left: 42%; top: calc(28% - 5px); width: 10px; height: 10px; background: ${colors.primary}; animation: candidatePacket .68s ease-out .22s both; }
  i + i { top: auto; bottom: calc(28% - 5px); background: ${colors.danger}; animation-delay: .38s; }
  @keyframes forkOut { from { opacity: 0; scale: 0 1; } to { opacity: 1; scale: 1 1; } }
  @keyframes candidatePacket { from { opacity: 0; translate: -38px 0; } to { opacity: 1; translate: 38px 0; } }
  @media (max-width: 720px) { display: none; }
`;
const CandidateList = styled.div`display: grid; gap: 12px;`;
const CandidatePool = styled.div<{ replica?: boolean }>`
  position: relative; padding: 15px 18px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: center;
  border: 1px solid ${({ replica }) => replica ? colors.danger : colors.borderStrong}; background: ${({ replica }) => replica ? colors.dangerSoft : colors.surface};
  animation: candidateIn .46s ease-out ${({ replica }) => replica ? ".38s" : ".22s"} both;
  h2 { margin: 0 0 5px; font-size: 17px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 12px/1.35 ${mono}; }
  strong { font: 500 24px/1 ${mono}; color: ${({ replica }) => replica ? colors.danger : colors.textPrimary}; }
  span { display: block; margin-top: 4px; color: ${colors.textMuted}; font-size: 11px; text-align: right; }
  @keyframes candidateIn { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
`;

const DecisionBoard = styled.div`
  width: min(880px, 100%); display: grid; grid-template-columns: 1fr 92px 1fr; align-items: stretch;
  @media (max-width: 680px) { grid-template-columns: 1fr; gap: 14px; }
`;
const DecisionColumn = styled.div`
  border-top: 1px solid ${colors.borderStrong};
  h2 { margin: 0; padding: 12px 14px; font-size: 15px; border-bottom: 1px solid ${colors.border}; }
`;
type Tone = "pass" | "fail" | "pick" | undefined;
const DecisionRow = styled.div<{ tone?: Tone; struck?: boolean }>`
  position: relative; padding: 14px; border-bottom: 1px solid ${colors.border}; opacity: ${({ struck }) => struck ? .62 : 1};
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px;
  background: ${({ tone }) => tone === "pick" ? colors.dangerSoft : "transparent"};
  strong { font-size: 14px; }
  code { display: block; margin-top: 5px; color: ${colors.textMuted}; font: 500 12px/1.3 ${mono}; }
  b { color: ${({ tone }) => tone === "fail" || tone === "pick" ? colors.danger : tone === "pass" ? colors.success : colors.textSecondary}; font-size: 13px; }
  ${({ struck }) => struck ? `&::after { content: ""; position: absolute; left: 10px; right: 10px; top: 50%; height: 2px; background: ${colors.danger}; transform-origin: left; animation: strikeLine .52s ease-out .5s both; }` : ""}
  @keyframes strikeLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;
const DecisionGate = styled.div`
  display: grid; place-items: center; position: relative;
  &::before { content: ""; position: absolute; top: 12%; bottom: 12%; width: 3px; background: ${colors.primary}; animation: gateDrop .4s ease-out .3s both; }
  img { position: relative; z-index: 1; padding: 7px; background: white; }
  @keyframes gateDrop { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @media (max-width: 680px) { min-height: 54px; &::before { top: 50%; left: 18%; right: 18%; bottom: auto; width: auto; height: 3px; transform-origin: left; } }
`;

const RecordProof = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) 360px; column-gap: 48px; row-gap: 22px; align-items: center;
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 20px; }
`;
const RecordIdentity = styled.div`
  display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 24px; align-items: center;
  h2 { margin: 0 0 8px; font-size: 23px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 13px/1.5 ${mono}; overflow-wrap: anywhere; }
`;
const Metrics = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid ${colors.borderStrong}; border-bottom: 1px solid ${colors.borderStrong};
  > div + div { border-left: 1px solid ${colors.borderStrong}; }
  @media (max-width: 430px) { grid-template-columns: 1fr; > div + div { border-left: 0; border-top: 1px solid ${colors.border}; } }
`;
const Metric = styled.div<{ ready: boolean; muted?: boolean }>`
  min-width: 0; padding: 15px 18px 16px;
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 8px; }
  strong { display: block; font: 500 clamp(26px, 3vw, 36px)/1 ${mono}; letter-spacing: -.05em; color: ${({ muted }) => muted ? colors.textSecondary : colors.primaryHover}; overflow-wrap: anywhere; }
  p { margin: 8px 0 0; color: ${colors.textSecondary}; font-size: 12px; line-height: 1.35; }
  opacity: ${({ ready }) => ready ? 1 : .35}; animation: ${({ ready }) => ready ? "metricIn .44s ease-out .22s both" : "none"};
  @keyframes metricIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
`;
const Checks = styled.div`
  grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid ${colors.borderStrong};
  div { padding: 13px 0; min-width: 0; }
  div + div { border-left: 1px solid ${colors.border}; padding-left: 22px; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { font-size: 14px; }
  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
    div:nth-of-type(3) { border-left: 0; border-top: 1px solid ${colors.border}; }
    div:nth-of-type(4) { border-top: 1px solid ${colors.border}; }
  }
`;

const RouteJourney = styled.div`width: min(920px, 100%);`;
const RoutePipeline = styled.div`
  width: min(920px, 100%); display: grid; grid-template-columns: 170px minmax(44px, 1fr) 170px minmax(44px, 1fr) 180px;
  align-items: center; margin-bottom: 24px;
  @media (max-width: 680px) { grid-template-columns: 1fr 32px 1fr 32px 1fr; margin-bottom: 20px; }
`;
const RouteActor = styled.div<{ delay?: number }>`
  display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 11px; align-items: center;
  animation: actorIn .42s ease-out ${({ delay = 0 }) => delay}s both;
  img { width: 44px; height: 44px; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 3px; }
  strong { display: block; font-size: 14px; }
  @keyframes actorIn { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 680px) { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 6px; img { width: 38px; height: 38px; } }
`;
const RouteEndpoint = styled(RouteActor)`
  padding: 9px 11px; border: 1px solid ${colors.borderStrong};
  img { width: 38px; height: 38px; }
`;
const RouteRail = styled.div<{ delay: number }>`
  position: relative; height: 2px; margin: 0 10px; background: ${colors.border}; overflow: visible;
  &::after {
    content: ""; position: absolute; top: -4px; left: 0; width: 10px; height: 10px; background: ${colors.primary};
    animation: routePacket .74s cubic-bezier(.2,.7,.3,1) ${({ delay }) => delay}s both;
  }
  @keyframes routePacket { from { opacity: 0; left: 0; } 20% { opacity: 1; } to { opacity: 1; left: calc(100% - 10px); } }
  @media (max-width: 680px) { margin: 0 4px; }
`;
const RouteHandoff = styled.div`
  width: min(760px, 100%); display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid ${colors.borderStrong};
  div { padding: 13px 18px 0; min-width: 0; }
  div + div { border-left: 1px solid ${colors.border}; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { display: block; font: 600 13px/1.35 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const OutcomeComparison = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;
const Outcome = styled.div<{ guarded?: boolean }>`
  position: relative; padding: 18px 20px; border-top: 4px solid ${({ guarded }) => guarded ? colors.primary : colors.danger};
  background: ${({ guarded }) => guarded ? colors.primarySoft : colors.dangerSoft}; overflow: hidden;
  animation: ${({ guarded }) => guarded ? "safeOutcome .54s ease-out .4s both" : "unsafeOutcome .54s ease-out .62s both"};
  h2 { margin: 0 0 16px; font-size: 18px; }
  dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 9px 16px; }
  dt { color: ${colors.textSecondary}; font-size: 13px; }
  dd { margin: 0; font: 600 14px/1.3 ${mono}; }
  strong { display: block; margin-top: 18px; font: 500 clamp(34px, 4.5vw, 52px)/1 ${mono}; color: ${({ guarded }) => guarded ? colors.primaryHover : colors.danger}; }
  p { margin: 7px 0 0; color: ${colors.textSecondary}; font-size: 13px; }
  @keyframes safeOutcome { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes unsafeOutcome { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
`;

const Bottom = styled.div`
  min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
  @media (max-width: 620px) { align-items: stretch; flex-direction: column; padding-top: 16px; }
`;
const Statuses = styled.div`display: flex; align-items: center; gap: 28px;`;
const Status = styled.div`
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 3px; }
  strong { font-size: 14px; font-weight: 650; }
`;
const Actions = styled.div`
  display: flex; gap: 9px; justify-content: flex-end;
  @media (max-width: 620px) { display: grid; grid-template-columns: auto auto minmax(0, 1fr); }
`;
const Next = styled.button`
  border: 1px solid ${colors.primary}; padding: 12px 18px; background: ${colors.primary}; color: ${colors.textPrimary}; cursor: pointer;
  font-weight: 700; font-size: 14px; min-width: 180px; transition: transform .12s ease, background .12s ease;
  &:hover { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; color: white; }
  &:active { transform: translateY(2px); }
  &:disabled { cursor: wait; opacity: .65; }
  @media (max-width: 620px) { min-width: 0; padding-inline: 12px; }
`;
const Reset = styled.button`
  border: 1px solid ${colors.borderStrong}; padding: 12px 15px; background: transparent; color: ${colors.textSecondary}; cursor: pointer; font-weight: 600; font-size: 13px;
  &:not(:disabled):hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
  &:disabled { cursor: wait; opacity: .45; }
`;
const Previous = styled(Reset)``;

const ReducedMotion = styled.div`
  display: contents;
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

function actionLabel(stage: DemoStage, busy: boolean) {
  if (busy) {
    const working: Partial<Record<DemoStage, string>> = {
      launch: "Launching…", quotes: "Quoting pools…", naive: "Picking best quote…", lookup: "Resolving ENS…",
      judge: "Judging route…", requote: "Requoting…", execute: "Swapping…", outcome: "Comparing…",
    };
    return working[stage] ?? "Working…";
  }
  const next: Record<DemoStage, string> = {
    idle: "Launch and declare", launch: "Quote candidate pools", quotes: "Run the naive router", naive: "Look up the canonical pool",
    lookup: "Judge the naive route", judge: "Requote on the declared pool", requote: "Verify calldata and swap", execute: "Compare both executions",
    outcome: "Start over",
  };
  return next[stage];
}

export function DemoTerminal() {
  const { stage, busy, launchStep, launch, board, naive, canonical, judgement, requote, execution, naiveOutcome, advance, goBack, goToStage, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = (busy && pendingCopy[stage]) || copy[stage];
  const record = launch?.canonicalPool ?? null;
  const declared = board?.candidates.find((candidate) => candidate.id === "canonical") ?? null;
  const replica = board?.candidates.find((candidate) => candidate.id === "replica") ?? null;
  const registered = canonical?.status === "registered" ? canonical : null;
  const tokenReady = Boolean(record) || launchStep === "initializing" || launchStep === "recording" || launchStep === "complete";
  const poolReady = Boolean(record) || launchStep === "recording" || launchStep === "complete";
  const tokenValue = record ? `${launch?.symbol} · ${short(record.token)}` : launchStep === "deploying" ? "Deploying with CREATE2…" : tokenReady ? "Complete" : "Waiting";
  const poolValue = record ? short(record.poolId) : launchStep === "initializing" ? "Initializing…" : poolReady ? "Complete" : "Waiting";
  const ensValue = record?.ensName ?? (launchStep === "recording" ? "recordByCreate2…" : launchStep === "idle" ? "0x<token>.tokens.klamp.eth" : "Waiting");
  const sceneKey = stage === "idle" ? "launch" : stage;
  const recordStatus = record ? "Declared once" : "Not declared";
  const routeStatus = execution ? "Declared pool" : requote ? "Requoted" : judgement ? judgement.verdict : naive ? "Naive pick: look-alike" : board ? "Two candidates" : "Not started";
  const executionStatus = naiveOutcome ? "Compared" : execution ? "Received = quote" : "Not started";

  return (
    <ReducedMotion>
      <Shell>
        <Instrument>
          <InstrumentHead>
            <TraceName><TraceMark complete={stage === "outcome" && !busy} />Klamp routing trace · Path A (KHOOK, Sepolia)</TraceName>
            <TraceNote>Presentation trace: canonical values from Sepolia, look-alike pool simulated</TraceNote>
          </InstrumentHead>
          <Progress aria-label="Trace progress">
            {steps.map((item) => {
              const index = stageIndex(item.stage);
              const active = stage === "idle" ? item.stage === "launch" : stage === item.stage;
              const done = current > index || (current === index && !busy);
              return (
                <ProgressItem key={item.stage} active={active} done={done} aria-current={active ? "step" : undefined}>
                  <ProgressButton type="button" disabled={busy} onClick={() => goToStage(item.stage)} aria-label={`Go to step ${item.index}: ${item.title}`}>
                    <StepNumber>{item.index}</StepNumber><StepTitle>{item.title}</StepTitle><StepDetail>{item.detail}</StepDetail>
                  </ProgressButton>
                </ProgressItem>
              );
            })}
          </Progress>
          <Stage aria-live="polite">
            <StageHead>
              <div><StageState>{view.state}</StageState><StageTitle>{view.title}</StageTitle></div>
              <StageDetail>{view.detail}</StageDetail>
            </StageHead>

            {(stage === "idle" || stage === "launch") && (
              <Scene key={sceneKey}>
                <LaunchFlow>
                  <LaunchActor>
                    <SceneLabel>Path A · one launch transaction</SceneLabel>
                    <h2>DemoLaunchpad</h2>
                    <p>Deploy the token with CREATE2, create the hooked pool with locked liquidity, then declare it through the registrar.</p>
                  </LaunchActor>
                  <LaunchBridge active={stage === "launch"}><Mark size={62} /></LaunchBridge>
                  <LaunchReceipt>
                    <dt>Token deployed</dt><dd>{tokenValue}</dd>
                    <dt>Pool initialized</dt><dd>{poolValue}</dd>
                    <dt>Pool hook</dt><dd>{poolReady ? "DeltaFeeHook · 1% delta fee" : "Waiting"}</dd>
                    <dt>Issuer proof</dt><dd>{record ? `CREATE2(launchpad ${short(record.issuer)})` : "Waiting"}</dd>
                    <dt>Canonical pool</dt><dd>{ensValue}</dd>
                  </LaunchReceipt>
                </LaunchFlow>
              </Scene>
            )}

            {stage === "quotes" && (
              <Scene key={sceneKey}>
                <CandidateBoard>
                  <CandidateSource><Image src="/aggregator.svg" width={54} height={54} alt="" aria-hidden /><strong>{board?.quoter ?? "V4Quoter"}</strong><span>{board ? `${board.amountIn} → ${board.tokenOut}` : "Quoting…"}</span></CandidateSource>
                  <ForkRail aria-hidden="true"><i /><i /></ForkRail>
                  <CandidateList>
                    <CandidatePool>
                      <div><h2>{declared?.label ?? "Declared pool"}</h2><p>{declared ? `${short(declared.poolId)} · ${declared.hookBehavior}` : "Quoting…"}</p></div>
                      <div><strong>{declared ? amount(declared.quotedOut) : "…"}</strong><span>{declared ? `quoted ${percent(declared.quotedFeeBps)}` : ""}</span></div>
                    </CandidatePool>
                    <CandidatePool replica>
                      <div><h2>{replica?.label ?? "Look-alike pool"}{replica?.simulated && <Simulated>Simulated</Simulated>}</h2><p>{replica ? `${short(replica.poolId)} · ${replica.hookBehavior}` : "Quoting…"}</p></div>
                      <div><strong>{replica ? amount(replica.quotedOut) : "…"}</strong><span>{replica ? `quoted ${percent(replica.quotedFeeBps)}` : ""}</span></div>
                    </CandidatePool>
                  </CandidateList>
                </CandidateBoard>
              </Scene>
            )}

            {stage === "naive" && (
              <Scene key={sceneKey}>
                <DecisionBoard>
                  <DecisionColumn>
                    <h2>Quoted output (KHOOK)</h2>
                    <DecisionRow struck={Boolean(naive)}><div><strong>Declared pool</strong><code>{declared ? amount(declared.quotedOut) : "…"}</code></div><b>{naive ? "SKIPPED" : "…"}</b></DecisionRow>
                    <DecisionRow tone={naive ? "pick" : undefined}><div><strong>Look-alike pool</strong><code>{replica ? amount(replica.quotedOut) : "…"}</code></div><b>{naive ? "CHOSEN" : "…"}</b></DecisionRow>
                  </DecisionColumn>
                  <DecisionGate><Image src="/router.svg" width={54} height={54} alt="" aria-hidden /></DecisionGate>
                  <DecisionColumn>
                    <h2>Naive router</h2>
                    <DecisionRow><div><strong>Rule</strong><code>largest quoted output wins</code></div><b>BEST</b></DecisionRow>
                    <DecisionRow><div><strong>Minimum output</strong><code>{naive ? `${amount(naive.minOut)} · ${percent(naive.slippageBps)} slippage` : "…"}</code></div><b>{naive ? "SET" : "…"}</b></DecisionRow>
                  </DecisionColumn>
                </DecisionBoard>
              </Scene>
            )}

            {stage === "lookup" && (
              <Scene key={sceneKey}>
                <RecordProof>
                  <RecordIdentity>
                    <Mark size={72} />
                    <div>
                      <SceneLabel>ENSv2 wildcard name · UniversalResolverV2</SceneLabel>
                      <h2>{registered ? "registered" : "Resolving…"}</h2>
                      <p>{record?.ensName ?? "0x<token>.tokens.klamp.eth"}</p>
                    </div>
                  </RecordIdentity>
                  <Metrics>
                    <Metric ready={Boolean(registered)}><span>{`text("pool")`}</span><strong>{registered ? short(registered.poolId) : "…"}</strong><p>eip155:{record?.chainId ?? "…"}:&lt;poolId&gt;</p></Metric>
                    <Metric ready={Boolean(registered)} muted><span>{`data("pool")`}</span><strong>{registered ? `fee ${registered.key.fee}` : "…"}</strong><p>abi.encode(chainId, PoolKey)</p></Metric>
                  </Metrics>
                  <Checks>
                    <div><span>Pinned resolver</span><strong>{registered && record ? short(record.resolver) : "Checking"}</strong></div>
                    <div><span>text vs data</span><strong>{registered ? "PoolId matches" : "Checking"}</strong></div>
                    <div><span>Pool state</span><strong>{registered ? "Initialized" : "Checking"}</strong></div>
                    <div><span>Klamp ABI needed</span><strong>{registered ? "None" : "…"}</strong></div>
                  </Checks>
                </RecordProof>
              </Scene>
            )}

            {stage === "judge" && (
              <Scene key={sceneKey}>
                <DecisionBoard>
                  <DecisionColumn>
                    <h2>Naive route · look-alike hop</h2>
                    <DecisionRow tone={judgement ? "fail" : undefined}><div><strong>Static pool?</strong><code>{replica ? `hooks ${short(replica.key.hooks)} · dynamic fee` : "…"}</code></div><b>{judgement ? "NO" : "…"}</b></DecisionRow>
                    <DecisionRow tone={judgement ? "fail" : undefined}><div><strong>Declared pool?</strong><code>{replica && registered ? `${short(replica.poolId)} ≠ ${short(registered.poolId)}` : "…"}</code></div><b>{judgement ? judgement.comparison.status.toUpperCase() : "…"}</b></DecisionRow>
                  </DecisionColumn>
                  <DecisionGate><Mark size={58} /></DecisionGate>
                  <DecisionColumn>
                    <h2>judge()</h2>
                    <DecisionRow><div><strong>Lookup</strong><code>{canonical?.status ?? "…"}</code></div><b>{registered ? "OK" : "…"}</b></DecisionRow>
                    <DecisionRow tone={judgement ? "pass" : undefined}><div><strong>Verdict</strong><code>declared and static pools pass; other hook pools are requoted</code></div><b>{judgement?.verdict ?? "…"}</b></DecisionRow>
                  </DecisionColumn>
                </DecisionBoard>
              </Scene>
            )}

            {stage === "requote" && (
              <Scene key={sceneKey}>
                <RecordProof>
                  <RecordIdentity>
                    <Mark size={72} />
                    <div>
                      <SceneLabel>{requote?.quoter ?? "V4Quoter"}</SceneLabel>
                      <h2>{requote ? "Declared pool requoted" : "Requoting…"}</h2>
                      <p>{registered ? `PoolKey(ETH, KHOOK, ${registered.key.fee}, ${registered.key.tickSpacing}, ${short(registered.key.hooks)})` : "…"}</p>
                    </div>
                  </RecordIdentity>
                  <Metrics>
                    <Metric ready={Boolean(requote)}><span>Requoted output</span><strong>{requote ? amount(requote.quotedOut) : "…"}</strong><p>Declared pool, same fee at swap time</p></Metric>
                    <Metric ready={Boolean(requote)} muted><span>Minimum output</span><strong>{requote ? amount(requote.minOut) : "…"}</strong><p>{requote ? `${percent(requote.slippageBps)} slippage` : "…"}</p></Metric>
                  </Metrics>
                  <Checks>
                    <div><span>Naive quote</span><strong>{naive ? amount(naive.quotedOut) : "…"}</strong></div>
                    <div><span>Why lower</span><strong>Real fee, not bait</strong></div>
                    <div><span>Trader action</span><strong>None</strong></div>
                    <div><span>Pool</span><strong>{requote ? short(requote.poolId) : "…"}</strong></div>
                  </Checks>
                </RecordProof>
              </Scene>
            )}

            {stage === "execute" && (
              <Scene key={sceneKey}>
                <RouteJourney>
                  <RoutePipeline aria-label="Klamp SDK to Universal Router to PoolManager">
                    <RouteActor><Mark size={44} /><div><span>Klamp SDK</span><strong>buildSwap · verifySwapCalldata</strong></div></RouteActor>
                    <RouteRail delay={0.22} aria-hidden="true" />
                    <RouteActor delay={0.42}><Image src="/router.svg" width={44} height={44} alt="" aria-hidden /><div><span>{execution?.router ?? "Universal Router"}</span><strong>{execution ? "V4_SWAP executed" : "Encoding V4_SWAP"}</strong></div></RouteActor>
                    <RouteRail delay={0.65} aria-hidden="true" />
                    <RouteEndpoint delay={0.86}><Image src="/pool-manager.svg" width={38} height={38} alt="" aria-hidden /><div><span>PoolManager</span><strong>{execution ? "Declared pool swapped" : "Waiting"}</strong></div></RouteEndpoint>
                  </RoutePipeline>
                  <RouteHandoff>
                    <div><span>Actions</span><strong>{execution ? execution.actions.join(" → ") : "…"}</strong></div>
                    <div><span>Calldata PoolKey</span><strong>{execution?.calldataVerified ? "= judged route" : "Checking…"}</strong></div>
                    <div><span>Received</span><strong>{execution ? `${amount(execution.receivedOut)} KHOOK` : "…"}</strong></div>
                  </RouteHandoff>
                </RouteJourney>
              </Scene>
            )}

            {stage === "outcome" && (
              <Scene key={sceneKey}>
                <OutcomeComparison>
                  <Outcome guarded>
                    <h2>Klamp route · declared pool</h2>
                    <dl><dt>Quoted</dt><dd>{requote ? amount(requote.quotedOut) : "…"}</dd><dt>Fee at swap</dt><dd>same as quoted</dd><dt>Minimum</dt><dd>{requote ? amount(requote.minOut) : "…"}</dd></dl>
                    <strong>{execution ? amount(execution.receivedOut) : "—"}</strong><p>Received exactly the quote.</p>
                  </Outcome>
                  <Outcome>
                    <h2>Naive route · look-alike pool<Simulated>Simulated</Simulated></h2>
                    <dl><dt>Quoted</dt><dd>{naiveOutcome ? amount(naiveOutcome.quotedOut) : "…"}</dd><dt>Fee at swap</dt><dd>{naiveOutcome ? percent(naiveOutcome.executedFeeBps) : "…"}</dd><dt>Minimum</dt><dd>{naiveOutcome ? amount(naiveOutcome.minOut) : "…"}</dd></dl>
                    <strong>{naiveOutcome ? amount(naiveOutcome.receivedOut) : "—"}</strong><p>{naiveOutcome ? `−${percent(naiveOutcome.lossBps)} versus its quote, still above the slippage floor.` : "Executing…"}</p>
                  </Outcome>
                </OutcomeComparison>
              </Scene>
            )}

            <Bottom>
              <Statuses>
                <Status><span>Canonical pool</span><strong>{recordStatus}</strong></Status>
                <Status><span>Route</span><strong>{routeStatus}</strong></Status>
                <Status><span>Execution</span><strong>{executionStatus}</strong></Status>
              </Statuses>
              <Actions>
                {stage !== "idle" && <Reset onClick={reset} disabled={busy}>Reset</Reset>}
                {stage !== "idle" && <Previous onClick={goBack} disabled={busy}>Previous</Previous>}
                <Next onClick={() => advance()} disabled={busy}>{actionLabel(stage, busy)}</Next>
              </Actions>
            </Bottom>
          </Stage>
        </Instrument>
      </Shell>
    </ReducedMotion>
  );
}
