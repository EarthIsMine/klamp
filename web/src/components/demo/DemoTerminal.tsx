"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "verify", "attest", "request", "enforce", "complete"];

const copy = {
  idle: { state: "Step 1 of 5", title: "Launch and record the pool", detail: "The issuer launches a token and writes its canonical pool under tokens.klamp.eth." },
  launch: { state: "Step 1 complete", title: "Launch recorded in ENS", detail: "The token, initialized pool, and issuer-authorized record were created together." },
  verify: { state: "Step 2 complete", title: "Canonical route verified", detail: "The resolver, chain, pool data, and proposed route agree." },
  attest: { state: "Step 3 complete", title: "Hook cap verified", detail: "The pool hook resolves under hooks.klamp.eth with a 1% maximum." },
  request: { state: "Step 4 complete", title: "Hook logic requested 30%", detail: "Malicious logic inside the verified proxy sends a 3,000 bps request." },
  enforce: { state: "Step 5 of 5", title: "Applying the verified cap", detail: "Klamp applies the maximum resolved from the hook identity record." },
  complete: { state: "Trace complete", title: "The request was capped", detail: "The canonical route held and the simulated swap applied the verified 1% maximum." },
};

const launchPendingCopy = {
  state: "Step 1 of 5",
  title: "Launching token and pool",
  detail: "The launcher is deploying the token, initializing its pool, and writing the ENS record.",
};

const routePendingCopy = {
  state: "Step 2 of 5",
  title: "Verifying the proposed route",
  detail: "Klamp is resolving the canonical pool and comparing every declared field.",
};

const hookPendingCopy = {
  state: "Step 3 of 5",
  title: "Resolving the hook cap",
  detail: "Klamp is checking the hook identity, code hash, and recorded maximum fee.",
};

const attackPendingCopy = {
  state: "Step 4 of 5",
  title: "Sending the 30% request",
  detail: "Malicious logic inside the verified proxy is sending a 3,000 bps request.",
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Launch", detail: "ENS record" },
  { stage: "verify" as const, index: "2", title: "Verify route", detail: "Canonical pool" },
  { stage: "attest" as const, index: "3", title: "Verify hook", detail: "ENS cap" },
  { stage: "request" as const, index: "4", title: "Request 30%", detail: "Attack input" },
  { stage: "enforce" as const, index: "5", title: "Enforce 1%", detail: "Capped output" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }
function amount(value: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }

const Shell = styled.section`
  width: 100%; max-width: ${layout.maxWidth}; height: 100%; min-height: 0; margin: 0 auto; padding: 18px 24px 22px; display: flex;
  @media (max-width: 820px), (max-height: 640px) { height: auto; min-height: calc(100dvh - 56px); padding: 14px 16px 28px; }
`;
const Instrument = styled.div`
  flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr);
  border-top: 3px solid ${colors.textPrimary}; border-bottom: 1px solid ${colors.borderStrong}; background: ${colors.surface};
`;
const InstrumentHead = styled.div`
  min-height: 42px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid ${colors.border}; font-size: 13px;
`;
const TraceName = styled.div`display: flex; align-items: center; gap: 9px; font-weight: 650;`;
const LiveMark = styled.span<{ complete: boolean }>`width: 8px; height: 8px; background: ${({ complete }) => complete ? colors.primary : colors.textPrimary};`;
const Network = styled.div`color: ${colors.textMuted}; font-size: 12px;`;

const Progress = styled.ol`
  list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(5, 1fr); border-bottom: 1px solid ${colors.border};
  @media (max-width: 680px) { padding: 0; overflow-x: auto; }
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; min-width: 132px; padding: 13px 10px 12px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
  &::before {
    content: ""; position: absolute; left: 10px; right: 10px; top: -1px; height: 3px;
    background: ${({ active, done }) => active ? colors.primary : done ? colors.textPrimary : "transparent"};
    transform-origin: left; animation: ${({ active }) => active ? "progressIn .28s ease-out" : "none"};
  }
  @keyframes progressIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
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
  animation: sceneIn .28s cubic-bezier(.2,.75,.25,1);
  @keyframes sceneIn { from { opacity: .25; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 820px) { min-height: 390px; }
`;
const SceneLabel = styled.div`color: ${colors.textMuted}; font-size: 13px; margin-bottom: 8px;`;

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
    transform: scaleX(0); animation: ${({ active }) => active ? "launchLine .42s ease-out both" : "none"};
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
  dd[data-complete="true"] { color: ${colors.textPrimary}; }
`;

const Comparison = styled.div`width: min(880px, 100%); display: grid; grid-template-columns: 1fr 104px 1fr; align-items: center;`;
const CompareSide = styled.div`
  min-width: 0;
  h2 { margin: 0 0 18px; font-size: 18px; }
  strong { display: block; font: 500 clamp(19px, 2.5vw, 26px)/1.2 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  p { margin: 10px 0 0; color: ${colors.textSecondary}; font-size: 14px; }
`;
const CompareSideRight = styled(CompareSide)`text-align: right;`;
const AnimatedClamp = styled.div<{ matched: boolean }>`
  position: relative; display: grid; place-items: center;
  &::before { content: ""; position: absolute; left: 0; right: 0; height: 2px; background: ${colors.primary}; transform: scaleX(0); transform-origin: center; animation: ${({ matched }) => matched ? "join .42s ease-out both" : "none"}; }
  img { position: relative; z-index: 1; background: white; padding: 10px; animation: ${({ matched }) => matched ? "clamp .42s ease-out" : "none"}; }
  @keyframes join { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes clamp { 0% { transform: scale(1.16); } 65% { transform: scale(.94); } 100% { transform: scale(1); } }
`;
const VerificationChecks = styled.div`
  grid-column: 1 / -1; margin-top: 30px; display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid ${colors.borderStrong};
  div { padding: 12px 14px; }
  div + div { border-left: 1px solid ${colors.border}; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { font-size: 13px; }
  @media (max-width: 680px) { grid-template-columns: 1fr 1fr; div:nth-of-type(3) { border-left: 0; border-top: 1px solid ${colors.border}; } div:nth-of-type(4) { border-top: 1px solid ${colors.border}; } }
`;

const HookProof = styled.div`
  width: min(880px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 48px; align-items: center;
  @media (max-width: 700px) { grid-template-columns: 1fr; gap: 24px; }
`;
const HookIdentity = styled.div`
  display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 24px; align-items: center;
  h2 { margin: 0 0 8px; font-size: 23px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 13px/1.5 ${mono}; overflow-wrap: anywhere; }
`;
const HookCap = styled.div<{ verified: boolean }>`
  padding-left: 34px; border-left: 1px solid ${colors.borderStrong}; text-align: right;
  span { display: block; color: ${colors.textMuted}; font-size: 13px; margin-bottom: 9px; }
  strong { font: 500 clamp(52px, 6vw, 76px)/1 ${mono}; letter-spacing: -.07em; color: ${colors.primaryHover}; animation: ${({ verified }) => verified ? "capReveal .42s cubic-bezier(.2,.8,.3,1) both" : "none"}; }
  @keyframes capReveal { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
  @media (max-width: 700px) { border-left: 0; border-top: 1px solid ${colors.borderStrong}; padding: 20px 0 0; text-align: left; }
`;
const HookChecks = styled.div`
  grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid ${colors.borderStrong};
  div { padding: 13px 0; }
  div + div { border-left: 1px solid ${colors.border}; padding-left: 22px; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { font-size: 14px; }
`;

const AttackSequence = styled.div`
  width: min(940px, 100%); display: grid; grid-template-columns: 180px minmax(150px, 1fr) minmax(270px, auto); align-items: center;
  animation: impactShake .22s linear .62s both;
  @keyframes impactShake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-7px); }
    55% { transform: translateX(5px); }
    78% { transform: translateX(-2px); }
  }
  @media (max-width: 720px) { grid-template-columns: 1fr; gap: 18px; text-align: center; }
`;
const AttackOrigin = styled.div`
  padding: 16px 18px; background: ${colors.textPrimary}; color: white; animation: attackerIn .28s ease-out both;
  span { display: block; color: ${colors.border}; font-size: 12px; margin-bottom: 7px; }
  strong { display: block; font-size: 17px; }
  code { display: block; margin-top: 7px; color: ${colors.primary}; font: 500 12px/1.3 ${mono}; }
  @keyframes attackerIn { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
`;
const AttackRail = styled.div`
  position: relative; height: 76px; overflow: hidden;
  &::before {
    content: ""; position: absolute; top: 50%; left: 0; width: 100%; height: 3px; background: ${colors.danger};
    transform: scaleX(0); transform-origin: left; animation: attackLine .38s ease-in .2s forwards;
  }
  i { position: absolute; top: calc(50% - 8px); width: 16px; height: 16px; background: ${colors.danger}; transform: rotate(45deg); opacity: 0; }
  i:nth-of-type(1) { animation: packetRush .44s ease-in .22s forwards; }
  i:nth-of-type(2) { animation: packetRush .44s ease-in .31s forwards; }
  i:nth-of-type(3) { animation: packetRush .44s ease-in .4s forwards; }
  @keyframes attackLine { to { transform: scaleX(1); } }
  @keyframes packetRush {
    0% { left: -16px; opacity: 0; }
    15% { opacity: 1; }
    82% { opacity: 1; }
    100% { left: calc(100% - 16px); opacity: 0; }
  }
  @media (max-width: 720px) { height: 34px; transform: rotate(90deg); width: 76px; justify-self: center; margin: -18px 0; }
`;
const AttackPayload = styled.div`
  position: relative; text-align: center; padding-left: 28px; animation: payloadStrike .68s cubic-bezier(.15,.72,.2,1.16) .18s both;
  &::before {
    content: ""; position: absolute; inset: -14px auto -14px 0; width: 5px; background: ${colors.danger};
    animation: impactBar .18s ease-out .63s both;
  }
  @keyframes payloadStrike {
    0% { opacity: 0; transform: translateX(-110px) scale(.68); }
    62% { opacity: 1; transform: translateX(13px) scale(1.08); }
    78% { transform: translateX(-6px) scale(.98); }
    100% { opacity: 1; transform: translateX(0) scale(1); }
  }
  @keyframes impactBar { from { transform: scaleY(.1); } to { transform: scaleY(1); } }
  @media (max-width: 720px) { padding: 18px 0 0; &::before { inset: 0 12% auto; width: auto; height: 5px; } }
`;
const FeeValue = styled.div`font: 500 clamp(64px, 9vw, 112px)/.9 ${mono}; letter-spacing: -.075em; color: ${colors.danger};`;
const FeeCaption = styled.p`margin: 20px 0 0; color: ${colors.textSecondary}; font-size: 16px;`;

const Enforcement = styled.div`
  width: min(860px, 100%); display: grid; grid-template-columns: 1fr 140px 1fr; align-items: center; text-align: center;
  animation: clampImpact .24s linear .42s both;
  @keyframes clampImpact {
    0%, 100% { transform: translateX(0); }
    30% { transform: translateX(6px); }
    65% { transform: translateX(-4px); }
  }
  @media (max-width: 620px) { grid-template-columns: 1fr 92px 1fr; }
`;
const FeeSide = styled.div`
  span { display: block; color: ${colors.textMuted}; font-size: 14px; margin-bottom: 13px; }
  strong { font: 500 clamp(48px, 7vw, 82px)/1 ${mono}; letter-spacing: -.07em; }
`;
const IncomingFee = styled(FeeSide)`
  animation: feeCollision .64s cubic-bezier(.2,.72,.24,1) both;
  @keyframes feeCollision {
    0% { opacity: .2; transform: translateX(-72px) scale(.82); }
    58% { opacity: 1; transform: translateX(34px) scale(1.08); }
    76% { transform: translateX(-8px) scale(.97); }
    100% { transform: translateX(0) scale(1); }
  }
`;
const Cap = styled.div`
  position: relative; display: grid; place-items: center; gap: 8px;
  &::before { content: ""; position: absolute; width: 104px; height: 104px; background: ${colors.primarySoft}; transform: scale(.15); animation: stopForce .46s ease-out .34s both; }
  span { color: ${colors.primaryHover}; font-size: 13px; font-weight: 650; }
  img, span { position: relative; z-index: 1; }
  img { animation: capSet .64s cubic-bezier(.2,.8,.3,1) both; }
  @keyframes stopForce { 0% { opacity: 0; transform: scale(.15); } 45% { opacity: 1; transform: scale(1.18); } 100% { opacity: 1; transform: scale(1); } }
  @keyframes capSet { 0% { transform: translateX(22px) scale(1.22); } 55% { transform: translateX(-5px) scale(.9); } 78% { transform: translateX(3px) scale(1.04); } 100% { transform: translateX(0) scale(1); } }
`;
const AppliedFee = styled(FeeSide)<{ revealed: boolean }>`
  opacity: ${({ revealed }) => revealed ? 1 : 0};
  animation: ${({ revealed }) => revealed ? "appliedReveal .38s ease-out both" : "none"};
  strong { color: ${colors.primaryHover}; }
  @keyframes appliedReveal { from { opacity: 0; transform: translateX(-26px) scale(.84); } to { opacity: 1; transform: translateX(0) scale(1); } }
`;
const SettlementProof = styled.div<{ revealed: boolean }>`
  grid-column: 1 / -1; width: min(560px, 100%); margin: 28px auto 0; display: grid; grid-template-columns: 1fr 1fr;
  border-top: 1px solid ${colors.borderStrong}; opacity: ${({ revealed }) => revealed ? 1 : 0};
  animation: ${({ revealed }) => revealed ? "resultIn .28s ease-out .14s both" : "none"};
  div { padding: 12px 18px 0; }
  div + div { border-left: 1px solid ${colors.border}; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { font: 600 15px/1.3 ${mono}; color: ${colors.textPrimary}; }
  @keyframes resultIn { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
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
const Actions = styled.div`display: flex; gap: 9px; justify-content: flex-end;`;
const Next = styled.button`
  border: 1px solid ${colors.primary}; padding: 12px 18px; background: ${colors.primary}; color: ${colors.textPrimary}; cursor: pointer;
  font-weight: 700; font-size: 14px; min-width: 180px; transition: transform .12s ease, background .12s ease;
  &:hover { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; color: white; }
  &:active { transform: translateY(2px); }
  &:disabled { cursor: wait; opacity: .65; }
`;
const Reset = styled.button`
  border: 1px solid ${colors.borderStrong}; padding: 12px 15px; background: transparent; color: ${colors.textSecondary}; cursor: pointer; font-weight: 600; font-size: 13px;
  &:not(:disabled):hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
  &:disabled { cursor: wait; opacity: .45; }
`;

const ReducedMotion = styled.div`
  display: contents;
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

function actionLabel(stage: DemoStage, busy: boolean) {
  if (busy && stage === "launch") return "Launching…";
  if (busy && stage === "verify") return "Verifying route…";
  if (busy && stage === "attest") return "Verifying hook…";
  if (busy && stage === "request") return "Sending request…";
  if (busy && stage === "enforce") return "Applying cap…";
  if (stage === "idle") return "Launch token and record pool";
  if (stage === "launch") return "Verify proposed route";
  if (stage === "verify") return "Verify hook cap";
  if (stage === "attest") return "Request 30% fee";
  if (stage === "request") return "Apply 1% cap";
  if (stage === "complete") return "Start over";
  return "Working…";
}

function poolStatus(recorded: boolean) {
  return recorded ? "Written once" : "Not started";
}

function routeStatus(stage: DemoStage, matched: boolean) {
  if (matched) return "Route matched";
  if (stageIndex(stage) >= stageIndex("verify")) return "Checking";
  return "Not started";
}

function feeCapStatus(stage: DemoStage, verified: boolean, enforced: boolean) {
  if (enforced) return "Applied at 1%";
  if (verified) return "Verified at 1%";
  return "Not started";
}

export function DemoTerminal() {
  const { stage, busy, launchStep, launch, canonical, comparison, attestation, enforcement, advance, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = stage === "launch" && busy
    ? launchPendingCopy
    : stage === "verify" && busy
      ? routePendingCopy
      : stage === "attest" && busy
        ? hookPendingCopy
        : stage === "request" && busy
          ? attackPendingCopy
        : copy[stage];
  const found = canonical?.status === "found";
  const matched = comparison?.status === "match";
  const hookVerified = attestation?.status === "verified";
  const record = launch?.canonicalPool ?? null;
  const enforced = enforcement !== null;
  const capBps = attestation?.capBps ?? 100;
  const capPercent = (capBps / 100).toFixed(2);
  const poolId = found ? canonical.poolId : record?.poolId;
  const manager = found ? short(canonical.poolManager) : "Resolving after declaration";
  const tokenReady = Boolean(record) || launchStep === "initializing" || launchStep === "recording" || launchStep === "complete";
  const poolReady = Boolean(record) || launchStep === "recording" || launchStep === "complete";
  const tokenValue = record ? short(record.token) : launchStep === "deploying" ? "Deploying…" : tokenReady ? "Complete" : "Waiting";
  const poolValue = record ? short(record.poolId) : launchStep === "initializing" ? "Initializing…" : poolReady ? "Complete" : "Waiting";
  const ensValue = record?.ensName ?? (launchStep === "recording" ? "Writing…" : launchStep === "idle" ? "0x<token>.tokens.klamp.eth" : "Waiting");
  const sceneKey = stage === "idle" || stage === "launch"
    ? "launch-flow"
    : stage === "verify"
      ? "route-verification"
      : stage === "attest"
        ? "hook-verification"
    : stage === "enforce" || stage === "complete"
      ? "fee-enforcement"
      : stage;

  return (
    <ReducedMotion>
      <Shell>
        <Instrument translate="no">
          <InstrumentHead>
            <TraceName><LiveMark complete={stage === "complete"} />Verification trace 01</TraceName>
            <Network>Local mock</Network>
          </InstrumentHead>
          <Progress aria-label="Trace progress">
            {steps.map((item) => {
              const index = stageIndex(item.stage);
              const active = stage === "idle" ? item.stage === "launch" : stage === item.stage;
              const done = stage === "complete" || current > index || (current === index && !busy);
              return (
                <ProgressItem key={item.stage} active={active} done={done} aria-current={active ? "step" : undefined}>
                  <StepNumber>{item.index}</StepNumber><StepTitle>{item.title}</StepTitle><StepDetail>{item.detail}</StepDetail>
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
                    <SceneLabel>Launch actor</SceneLabel>
                    <h2>CREATE2 launcher</h2>
                    <p>Deploys the token, initializes its pool, and calls the registrar.</p>
                  </LaunchActor>
                  <LaunchBridge active={stage === "launch"}><Mark size={62} /></LaunchBridge>
                  <LaunchReceipt>
                    <dt>Token deployed</dt><dd data-complete={tokenReady}>{tokenValue}</dd>
                    <dt>Pool initialized</dt><dd data-complete={poolReady}>{poolValue}</dd>
                    <dt>ENS record written</dt><dd data-complete={Boolean(record)}>{ensValue}</dd>
                  </LaunchReceipt>
                </LaunchFlow>
              </Scene>
            )}

            {stage === "verify" && (
              <Scene key={sceneKey}>
                <Comparison>
                  <CompareSide><SceneLabel>ENSv2 record</SceneLabel><h2>Canonical pool</h2><strong>{poolId ? short(poolId) : "Resolving…"}</strong><p>Chain 11155111 · {manager}</p></CompareSide>
                  <AnimatedClamp matched={matched}><Mark size={70} /></AnimatedClamp>
                  <CompareSideRight><SceneLabel>Proposed route</SceneLabel><h2>Route branch 0</h2><strong>{matched && poolId ? short(poolId) : "Waiting…"}</strong><p>{matched ? "Chain and PoolManager agree" : "Comparing declared fields"}</p></CompareSideRight>
                  <VerificationChecks>
                    <div><span>Resolver</span><strong>{found ? "Trusted" : "Checking"}</strong></div>
                    <div><span>Chain</span><strong>{found ? "Verified" : "Checking"}</strong></div>
                    <div><span>Pool data</span><strong>{found && record?.dataVerified ? "Recomputed" : "Checking"}</strong></div>
                    <div><span>Route</span><strong>{matched ? "Match" : "Checking"}</strong></div>
                  </VerificationChecks>
                </Comparison>
              </Scene>
            )}

            {stage === "attest" && (
              <Scene key={sceneKey}>
                <HookProof>
                  <HookIdentity>
                    <Mark size={72} />
                    <div>
                      <SceneLabel>Hook identity record</SceneLabel>
                      <h2>{hookVerified ? "Verified capped proxy" : "Resolving hook identity…"}</h2>
                      <p>{attestation?.ensName ?? `${record?.key.hooks.toLowerCase()}.hooks.klamp.eth`}</p>
                    </div>
                  </HookIdentity>
                  <HookCap verified={hookVerified}><span>Maximum fee</span><strong>{hookVerified ? `${capPercent}%` : "…"}</strong></HookCap>
                  <HookChecks>
                    <div><span>ENS identity</span><strong>{hookVerified ? "Verified" : "Checking"}</strong></div>
                    <div><span>Code hash</span><strong>{attestation ? short(attestation.codeHash) : "Checking"}</strong></div>
                    <div><span>Namespace</span><strong>hooks.klamp.eth</strong></div>
                  </HookChecks>
                </HookProof>
              </Scene>
            )}

            {stage === "request" && (
              <Scene key={sceneKey}>
                <AttackSequence>
                  <AttackOrigin><span>Inside verified proxy</span><strong>Malicious logic</strong><code>feeOverride(3000)</code></AttackOrigin>
                  <AttackRail aria-hidden="true"><i /><i /><i /></AttackRail>
                  <AttackPayload><SceneLabel>Incoming fee request</SceneLabel><FeeValue>30.00%</FeeValue><FeeCaption>3,000 bps sent toward the pool.</FeeCaption></AttackPayload>
                </AttackSequence>
              </Scene>
            )}

            {(stage === "enforce" || stage === "complete") && (
              <Scene key={sceneKey}>
                <Enforcement>
                  <IncomingFee><span>Incoming</span><strong style={{ color: colors.danger }}>30.00%</strong></IncomingFee>
                  <Cap><Mark size={76} /><span>ENS maximum {capPercent}%</span></Cap>
                  <AppliedFee revealed={enforced}><span>Applied</span><strong>{enforced ? `${(enforcement.appliedBps / 100).toFixed(2)}%` : ""}</strong></AppliedFee>
                  <SettlementProof revealed={enforced}>
                    <div><span>Quoted output</span><strong>{enforced ? amount(enforcement.quotedOut) : ""}</strong></div>
                    <div><span>Received output</span><strong>{enforced ? amount(enforcement.receivedOut) : ""}</strong></div>
                  </SettlementProof>
                </Enforcement>
              </Scene>
            )}

            <Bottom>
              <Statuses>
                <Status><span>Pool record</span><strong>{poolStatus(Boolean(record))}</strong></Status>
                <Status><span>Route</span><strong>{routeStatus(stage, matched)}</strong></Status>
                <Status><span>Hook cap</span><strong>{feeCapStatus(stage, hookVerified, enforced)}</strong></Status>
              </Statuses>
              <Actions>
                {stage !== "idle" && <Reset onClick={reset} disabled={busy}>Reset</Reset>}
                <Next onClick={() => advance()} disabled={busy}>{actionLabel(stage, busy)}</Next>
              </Actions>
            </Bottom>
          </Stage>
        </Instrument>
      </Shell>
    </ReducedMotion>
  );
}
