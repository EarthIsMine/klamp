"use client";

import styled from "@emotion/styled";
import Image from "next/image";
import { Mark } from "@/components/brand/Mark";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "candidates", "verify", "attest", "forward", "request", "enforce", "revoke", "complete"];

const copy = {
  idle: { state: "Step 1 of 8", title: "Launch and register protection", detail: "The factory creates the capped hook identity and the issuer records the initialized pool in one launch flow." },
  launch: { state: "Step 1 complete", title: "Pool and hook identities recorded", detail: "The immutable 1% proxy and canonical PoolId now have separate ENS records under klamp.eth." },
  candidates: { state: "Step 2 complete", title: "Two pools compete for the route", detail: "The replica advertises 0.05% to beat the issuer pool before either candidate is trusted." },
  verify: { state: "Step 3 complete", title: "Replica pool excluded", detail: "The guarded router keeps the canonical PoolId and rejects the unregistered dynamic-fee clone." },
  attest: { state: "Step 4 complete", title: "Quoted at the immutable maximum", detail: "The wrapper identity, bytecode, delta permissions, and 1% cap pass before the quote is accepted." },
  forward: { state: "Step 5 complete", title: "Verified route reached PoolManager", detail: "Only after both checks does the router forward the canonical PoolKey to the v4 singleton." },
  request: { state: "Step 6 complete", title: "Fee strategy requested 30%", detail: "A compromised strategy admin pushes the official pool's dynamic fee far above policy." },
  enforce: { state: "Step 7 complete", title: "Protection changed the outcome", detail: "Klamp returns the quoted 1% maximum while an unguarded path accepts the full 30% request." },
  revoke: { state: "Step 8 of 8", title: "Guardian is revoking the identity", detail: "Removing the hook subname makes the resolver return empty and closes the routing gate." },
  complete: { state: "Trace complete", title: "Revoked hook blocked immediately", detail: "The same pool can no longer pass guarded routing after its ENS hook identity is removed." },
};

const launchPendingCopy = {
  state: "Step 1 of 8",
  title: "Running the atomic launch flow",
  detail: "CappedHookFactory deploys the proxy and hook record while the issuer initializes and records the pool.",
};

const routeBuildPendingCopy = {
  state: "Step 2 of 8",
  title: "Discovering route candidates",
  detail: "The aggregator sees a cheap replica and the issuer pool, but has not sent either to PoolManager.",
};

const routePendingCopy = {
  state: "Step 3 of 8",
  title: "Checking both candidate pools",
  detail: "The router resolves the canonical record and compares chain, PoolManager, and PoolId before execution.",
};

const hookPendingCopy = {
  state: "Step 4 of 8",
  title: "Verifying hook policy and quote",
  detail: "Klamp checks the wrapper bytecode, forbidden delta permissions, and prices the route at the 1% cap.",
};

const forwardPendingCopy = {
  state: "Step 5 of 8",
  title: "Forwarding the verified PoolKey",
  detail: "The guarded router is now sending the accepted canonical route to PoolManager.",
};

const attackPendingCopy = {
  state: "Step 6 of 8",
  title: "Sending the 30% request",
  detail: "Compromised fee strategy logic is sending a 300,000-pip request through the verified wrapper.",
};

const enforcePendingCopy = {
  state: "Step 7 of 8",
  title: "Applying both execution paths",
  detail: "The protected wrapper clamps the request while the unguarded comparison accepts it unchanged.",
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Launch", detail: "Two ENS records" },
  { stage: "candidates" as const, index: "2", title: "Candidates", detail: "Official + replica" },
  { stage: "verify" as const, index: "3", title: "Filter", detail: "Clone rejected" },
  { stage: "attest" as const, index: "4", title: "Price", detail: "Immutable max" },
  { stage: "forward" as const, index: "5", title: "Forward", detail: "Verified PoolKey" },
  { stage: "request" as const, index: "6", title: "Attack", detail: "Request 30%" },
  { stage: "enforce" as const, index: "7", title: "Compare", detail: "1% vs 30%" },
  { stage: "revoke" as const, index: "8", title: "Revoke", detail: "Route blocked" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }
function amount(value: number) { return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value); }

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
const LiveMark = styled.span<{ complete: boolean }>`width: 8px; height: 8px; background: ${({ complete }) => complete ? colors.primary : colors.textPrimary};`;
const Network = styled.div`color: ${colors.textMuted}; font-size: 12px;`;

const Progress = styled.ol`
  list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(8, 1fr); border-bottom: 1px solid ${colors.border}; overflow-x: auto;
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; min-width: 124px; padding: 13px 10px 12px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
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
  &::before, &::after { content: ""; position: absolute; left: 0; width: 100%; height: 2px; background: ${colors.borderStrong}; transform-origin: left; animation: forkOut .5s ease-out both; }
  &::before { top: 28%; transform: rotate(-12deg); }
  &::after { bottom: 28%; transform: rotate(12deg); animation-delay: .12s; }
  i { position: absolute; left: 42%; top: calc(28% - 5px); width: 10px; height: 10px; background: ${colors.primary}; animation: candidatePacket .56s ease-out .18s both; }
  i + i { top: auto; bottom: calc(28% - 5px); background: ${colors.danger}; animation-delay: .32s; }
  @keyframes forkOut { from { opacity: 0; scale: 0 1; } to { opacity: 1; scale: 1 1; } }
  @keyframes candidatePacket { from { opacity: 0; translate: -38px 0; } to { opacity: 1; translate: 38px 0; } }
  @media (max-width: 720px) { display: none; }
`;
const CandidateList = styled.div`display: grid; gap: 12px;`;
const CandidatePool = styled.div<{ replica?: boolean }>`
  position: relative; padding: 15px 18px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; align-items: center;
  border: 1px solid ${({ replica }) => replica ? colors.danger : colors.borderStrong}; background: ${({ replica }) => replica ? colors.dangerSoft : colors.surface};
  animation: candidateIn .38s ease-out ${({ replica }) => replica ? ".32s" : ".18s"} both;
  h2 { margin: 0 0 5px; font-size: 17px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 12px/1.35 ${mono}; }
  strong { font: 500 28px/1 ${mono}; color: ${({ replica }) => replica ? colors.danger : colors.textPrimary}; }
  span { display: block; margin-top: 4px; color: ${colors.textMuted}; font-size: 11px; text-align: right; }
  @keyframes candidateIn { from { opacity: 0; transform: translateX(-18px); } to { opacity: 1; transform: translateX(0); } }
`;

const FilterBoard = styled.div`
  width: min(880px, 100%); display: grid; grid-template-columns: 1fr 92px 1fr; align-items: stretch;
  @media (max-width: 680px) { grid-template-columns: 1fr; gap: 14px; }
`;
const FilterColumn = styled.div`
  border-top: 1px solid ${colors.borderStrong};
  h2 { margin: 0; padding: 12px 14px; font-size: 15px; border-bottom: 1px solid ${colors.border}; }
`;
const FilterRow = styled.div<{ rejected?: boolean }>`
  position: relative; padding: 14px; border-bottom: 1px solid ${colors.border}; opacity: ${({ rejected }) => rejected ? .62 : 1};
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px;
  strong { font-size: 14px; }
  code { display: block; margin-top: 5px; color: ${colors.textMuted}; font: 500 12px/1.3 ${mono}; }
  b { color: ${({ rejected }) => rejected ? colors.danger : colors.success}; font-size: 13px; }
  ${({ rejected }) => rejected ? `&::after { content: ""; position: absolute; left: 10px; right: 10px; top: 50%; height: 2px; background: ${colors.danger}; transform-origin: left; animation: rejectLine .42s ease-out .42s both; }` : ""}
  @keyframes rejectLine { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;
const GuardGate = styled.div`
  display: grid; place-items: center; position: relative;
  &::before { content: ""; position: absolute; top: 12%; bottom: 12%; width: 3px; background: ${colors.primary}; animation: gateDrop .32s ease-out .24s both; }
  img { position: relative; z-index: 1; padding: 7px; background: white; }
  @keyframes gateDrop { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @media (max-width: 680px) { min-height: 54px; &::before { top: 50%; left: 18%; right: 18%; bottom: auto; width: auto; height: 3px; transform-origin: left; } }
`;

const RouteJourney = styled.div`width: min(920px, 100%);`;
const RoutePipeline = styled.div`
  width: min(920px, 100%); display: grid; grid-template-columns: 170px minmax(44px, 1fr) 150px minmax(44px, 1fr) 180px;
  align-items: center; margin-bottom: 24px;
  @media (max-width: 680px) { grid-template-columns: 1fr 32px 1fr 32px 1fr; margin-bottom: 20px; }
`;
const RouteActor = styled.div<{ delay?: number }>`
  display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 11px; align-items: center;
  animation: actorIn .34s ease-out ${({ delay = 0 }) => delay}s both;
  img { width: 44px; height: 44px; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 3px; }
  strong { display: block; font-size: 14px; }
  @keyframes actorIn { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
  @media (max-width: 680px) {
    grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 6px;
    img { width: 38px; height: 38px; }
  }
`;
const RouteEndpoint = styled(RouteActor)`
  padding: 9px 11px; border: 1px solid ${colors.borderStrong};
  img { width: 38px; height: 38px; }
`;
const RouteRail = styled.div<{ delay: number }>`
  position: relative; height: 2px; margin: 0 10px; background: ${colors.border}; overflow: visible;
  &::after {
    content: ""; position: absolute; top: -4px; left: 0; width: 10px; height: 10px; background: ${colors.primary};
    animation: routePacket .62s cubic-bezier(.2,.7,.3,1) ${({ delay }) => delay}s both;
  }
  @keyframes routePacket { from { opacity: 0; left: 0; } 20% { opacity: 1; } to { opacity: 1; left: calc(100% - 10px); } }
  @media (max-width: 680px) { margin: 0 4px; }
`;
const RouteHandoff = styled.div`
  width: min(720px, 100%); display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid ${colors.borderStrong};
  div { padding: 13px 18px 0; min-width: 0; }
  div + div { border-left: 1px solid ${colors.border}; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { display: block; font: 600 13px/1.35 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;

const HookProof = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: minmax(0, 1fr) 360px; column-gap: 48px; row-gap: 22px; align-items: center;
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 20px; }
`;
const HookIdentity = styled.div`
  display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 24px; align-items: center;
  h2 { margin: 0 0 8px; font-size: 23px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 13px/1.5 ${mono}; overflow-wrap: anywhere; }
`;
const HookMetrics = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid ${colors.borderStrong}; border-bottom: 1px solid ${colors.borderStrong};
  @media (max-width: 430px) { grid-template-columns: 1fr; }
`;
const HookCap = styled.div<{ verified: boolean }>`
  min-width: 0; padding: 15px 18px 16px; text-align: left;
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 8px; }
  strong { display: block; font: 500 clamp(38px, 4vw, 50px)/1 ${mono}; letter-spacing: -.06em; color: ${colors.primaryHover}; animation: ${({ verified }) => verified ? "capReveal .42s cubic-bezier(.2,.8,.3,1) both" : "none"}; }
  p { margin: 8px 0 0; color: ${colors.textSecondary}; font-size: 12px; line-height: 1.35; }
  @keyframes capReveal { from { opacity: 0; transform: scale(.82); } to { opacity: 1; transform: scale(1); } }
`;
const QuoteBasis = styled.div<{ ready: boolean }>`
  min-width: 0; padding: 15px 18px 16px; border-left: 1px solid ${colors.borderStrong};
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 8px; }
  strong { display: block; font: 500 clamp(38px, 4vw, 50px)/1 ${mono}; letter-spacing: -.06em; color: ${colors.primaryHover}; }
  p { margin: 8px 0 0; color: ${colors.textSecondary}; font-size: 12px; line-height: 1.35; }
  opacity: ${({ ready }) => ready ? 1 : .35}; animation: ${({ ready }) => ready ? "quoteIn .36s ease-out .18s both" : "none"};
  @keyframes quoteIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
  @media (max-width: 430px) { border-left: 0; border-top: 1px solid ${colors.border}; }
`;
const HookChecks = styled.div`
  grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid ${colors.borderStrong};
  div { padding: 13px 0; }
  div + div { border-left: 1px solid ${colors.border}; padding-left: 22px; }
  span { display: block; color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  strong { font-size: 14px; }
  @media (max-width: 700px) {
    grid-template-columns: 1fr 1fr;
    div:nth-of-type(3) { border-left: 0; border-top: 1px solid ${colors.border}; }
    div:nth-of-type(4) { border-top: 1px solid ${colors.border}; }
  }
`;

const OutcomeComparison = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: 1fr 1fr; gap: 18px;
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;
const Outcome = styled.div<{ guarded?: boolean }>`
  position: relative; padding: 18px 20px; border-top: 4px solid ${({ guarded }) => guarded ? colors.primary : colors.danger};
  background: ${({ guarded }) => guarded ? colors.primarySoft : colors.dangerSoft}; overflow: hidden;
  animation: ${({ guarded }) => guarded ? "safeOutcome .44s ease-out .32s both" : "unsafeOutcome .44s ease-out .5s both"};
  h2 { margin: 0 0 16px; font-size: 18px; }
  dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 9px 16px; }
  dt { color: ${colors.textSecondary}; font-size: 13px; }
  dd { margin: 0; font: 600 14px/1.3 ${mono}; }
  strong { display: block; margin-top: 18px; font: 500 clamp(38px, 5vw, 58px)/1 ${mono}; color: ${({ guarded }) => guarded ? colors.primaryHover : colors.danger}; }
  p { margin: 7px 0 0; color: ${colors.textSecondary}; font-size: 13px; }
  @keyframes safeOutcome { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes unsafeOutcome { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
`;

const RevocationBoard = styled.div`
  width: min(900px, 100%); display: grid; grid-template-columns: 190px minmax(70px, 1fr) minmax(300px, 1.4fr); align-items: center;
  @media (max-width: 700px) { grid-template-columns: 1fr; gap: 18px; text-align: center; }
`;
const Guardian = styled.div`
  padding: 18px; background: ${colors.textPrimary}; color: white;
  span { color: ${colors.border}; font-size: 12px; }
  strong { display: block; margin-top: 7px; font-size: 18px; }
  code { display: block; margin-top: 8px; color: ${colors.primary}; font: 500 12px/1.3 ${mono}; }
`;
const RevokeRail = styled.div`
  position: relative; height: 3px; background: ${colors.borderStrong};
  &::after { content: ""; position: absolute; top: -5px; left: 0; width: 13px; height: 13px; background: ${colors.danger}; animation: revokePacket .7s cubic-bezier(.15,.7,.3,1) .18s both; }
  @keyframes revokePacket { from { opacity: 0; left: 0; } 15% { opacity: 1; } to { opacity: 1; left: calc(100% - 13px); } }
  @media (max-width: 700px) { width: 3px; height: 48px; justify-self: center; &::after { top: 0; left: -5px; animation: revokePacketDown .55s ease-out both; } @keyframes revokePacketDown { from { opacity: 0; top: 0; } to { opacity: 1; top: calc(100% - 13px); } } }
`;
const RevokedRecord = styled.div<{ revoked: boolean }>`
  position: relative; padding: 18px 20px; border: 1px solid ${({ revoked }) => revoked ? colors.danger : colors.borderStrong};
  h2 { margin: 0 0 8px; font-size: 18px; }
  p { margin: 0; color: ${colors.textSecondary}; font: 500 12px/1.5 ${mono}; overflow-wrap: anywhere; }
  dl { margin: 16px 0 0; display: grid; grid-template-columns: 1fr auto; gap: 8px 14px; }
  dt { color: ${colors.textMuted}; font-size: 12px; }
  dd { margin: 0; font-size: 13px; font-weight: 650; color: ${({ revoked }) => revoked ? colors.danger : colors.textPrimary}; }
  ${({ revoked }) => revoked ? `animation: recordRevoke .38s ease-out both; &::after { content: "REVOKED"; position: absolute; right: 18px; top: 16px; color: ${colors.danger}; font: 700 12px/1 ${mono}; }` : ""}
  @keyframes recordRevoke { 0% { transform: translateX(0); } 35% { transform: translateX(7px); } 70% { transform: translateX(-4px); } 100% { transform: translateX(0); } }
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
  if (busy && stage === "candidates") return "Discovering candidates…";
  if (busy && stage === "verify") return "Filtering candidates…";
  if (busy && stage === "attest") return "Verifying and pricing…";
  if (busy && stage === "forward") return "Forwarding PoolKey…";
  if (busy && stage === "request") return "Sending request…";
  if (busy && stage === "enforce") return "Comparing outcomes…";
  if (busy && stage === "revoke") return "Revoking identity…";
  if (stage === "idle") return "Launch and register";
  if (stage === "launch") return "Discover route candidates";
  if (stage === "candidates") return "Filter malicious replica";
  if (stage === "verify") return "Verify cap and price route";
  if (stage === "attest") return "Forward verified PoolKey";
  if (stage === "forward") return "Compromise fee strategy";
  if (stage === "request") return "Compare protected execution";
  if (stage === "enforce") return "Revoke hook identity";
  if (stage === "complete") return "Start over";
  return "Working…";
}

function poolStatus(recorded: boolean) {
  return recorded ? "Written once" : "Not started";
}

function routeStatus(stage: DemoStage, busy: boolean, proposed: boolean, matched: boolean, forwarded: boolean, revoked: boolean) {
  if (revoked) return "Blocked after revoke";
  if (forwarded) return "Accepted by PoolManager";
  if (matched) return "Replica excluded";
  if (proposed) return stage === "verify" && busy ? "Checking both pools" : "Two candidates";
  if (stage === "candidates") return "Discovering";
  if (stageIndex(stage) >= stageIndex("verify")) return "Checking";
  return "Not started";
}

function feeCapStatus(stage: DemoStage, verified: boolean, enforced: boolean) {
  if (enforced) return "Applied at 1%";
  if (verified) return "Verified at 1%";
  return "Not started";
}

export function DemoTerminal() {
  const { stage, busy, launchStep, launch, proposal, canonical, comparison, attestation, quote, forwarding, enforcement, revocation, advance, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = stage === "launch" && busy
    ? launchPendingCopy
    : stage === "candidates" && busy
      ? routeBuildPendingCopy
      : stage === "verify" && busy
        ? routePendingCopy
        : stage === "attest" && busy
          ? hookPendingCopy
          : stage === "forward" && busy
            ? forwardPendingCopy
            : stage === "request" && busy
              ? attackPendingCopy
              : stage === "enforce" && busy
                ? enforcePendingCopy
                : copy[stage];
  const found = canonical?.status === "found";
  const matched = comparison?.status === "match";
  const hookVerified = attestation?.status === "verified";
  const hookCompliant = Boolean(
    hookVerified &&
    attestation?.capMode === "immutable" &&
    !attestation.beforeSwapReturnDelta &&
    !attestation.afterSwapReturnDelta,
  );
  const record = launch?.canonicalPool ?? null;
  const official = proposal?.candidates.find((candidate) => candidate.id === "official") ?? null;
  const replica = proposal?.candidates.find((candidate) => candidate.id === "replica") ?? null;
  const proposedHop = official?.route[0] ?? null;
  const hookMatches = Boolean(attestation && hookVerified && record && attestation.hook.toLowerCase() === record.key.hooks.toLowerCase());
  const enforced = enforcement !== null;
  const revoked = revocation?.routeStatus === "blocked";
  const capBps = attestation?.capBps ?? 100;
  const capPercent = (capBps / 100).toFixed(2);
  const poolId = found ? canonical.poolId : record?.poolId;
  const manager = found ? short(canonical.poolManager) : "Resolving after declaration";
  const tokenReady = Boolean(record) || launchStep === "initializing" || launchStep === "recording" || launchStep === "complete";
  const poolReady = Boolean(record) || launchStep === "recording" || launchStep === "complete";
  const tokenValue = record ? short(record.token) : launchStep === "deploying" ? "Deploying…" : tokenReady ? "Complete" : "Waiting";
  const poolValue = record ? short(record.poolId) : launchStep === "initializing" ? "Initializing…" : poolReady ? "Complete" : "Waiting";
  const ensValue = record?.ensName ?? (launchStep === "recording" ? "Writing…" : launchStep === "idle" ? "0x<token>.tokens.klamp.eth" : "Waiting");
  const hookEnsValue = launch?.hookRegistration.ensName ?? (launchStep === "recording" ? "Issuing…" : launchStep === "idle" ? "0x<hook>.hooks.klamp.eth" : "Waiting");
  const sceneKey = stage === "idle" || stage === "launch"
    ? "launch-flow"
    : stage === "candidates"
      ? "candidate-build"
      : stage === "verify"
        ? "candidate-filter"
        : stage === "attest"
          ? "hook-verification"
          : stage === "forward"
            ? "route-forwarding"
            : stage === "enforce"
              ? "outcome-comparison"
              : stage === "revoke" || stage === "complete"
                ? "hook-revocation"
                : stage;

  return (
    <ReducedMotion>
      <Shell>
        <Instrument>
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
                    <SceneLabel>Atomic launch actors</SceneLabel>
                    <h2>Launcher + hook factory</h2>
                    <p>Deploy proxy, initialize pool, issue hook identity, then seal the canonical record.</p>
                  </LaunchActor>
                  <LaunchBridge active={stage === "launch"}><Mark size={62} /></LaunchBridge>
                  <LaunchReceipt>
                    <dt>Token deployed</dt><dd data-complete={tokenReady}>{tokenValue}</dd>
                    <dt>Pool initialized</dt><dd data-complete={poolReady}>{poolValue}</dd>
                    <dt>Pool hook</dt><dd data-complete={poolReady}>{poolReady ? "CappedHookProxy · 1% max" : "Waiting"}</dd>
                    <dt>Hook identity issued</dt><dd data-complete={Boolean(record)}>{hookEnsValue}</dd>
                    <dt>Canonical pool recorded</dt><dd data-complete={Boolean(record)}>{ensValue}</dd>
                  </LaunchReceipt>
                </LaunchFlow>
              </Scene>
            )}

            {stage === "candidates" && (
              <Scene key={sceneKey}>
                <CandidateBoard>
                  <CandidateSource><Image src="/aggregator.svg" width={54} height={54} alt="" aria-hidden /><strong>Aggregator</strong><span>Quote discovery only</span></CandidateSource>
                  <ForkRail aria-hidden="true"><i /><i /></ForkRail>
                  <CandidateList>
                    <CandidatePool>
                      <div><h2>{official?.label ?? "Issuer pool"}</h2><p>{official ? short(official.route[0].poolId) : "Discovering…"}</p></div>
                      <div><strong>{official ? `${(official.advertisedFeeBps / 100).toFixed(2)}%` : "…"}</strong><span>advertised</span></div>
                    </CandidatePool>
                    <CandidatePool replica>
                      <div><h2>{replica?.label ?? "Replica pool"}</h2><p>{replica ? short(replica.route[0].poolId) : "Discovering…"}</p></div>
                      <div><strong>{replica ? `${(replica.advertisedFeeBps / 100).toFixed(2)}%` : "…"}</strong><span>bait quote</span></div>
                    </CandidatePool>
                  </CandidateList>
                </CandidateBoard>
              </Scene>
            )}

            {stage === "verify" && (
              <Scene key={sceneKey}>
                <FilterBoard>
                  <FilterColumn>
                    <h2>Candidate pools</h2>
                    <FilterRow><div><strong>Issuer pool</strong><code>{official ? short(official.route[0].poolId) : "Checking…"}</code></div><b>CHECK</b></FilterRow>
                    <FilterRow rejected={matched}><div><strong>Replica pool</strong><code>{replica ? short(replica.route[0].poolId) : "Checking…"}</code></div><b>{matched ? "REJECT" : "CHECK"}</b></FilterRow>
                  </FilterColumn>
                  <GuardGate><Mark size={58} /></GuardGate>
                  <FilterColumn>
                    <h2>Guarded Router decision</h2>
                    <FilterRow><div><strong>Canonical PoolId</strong><code>{poolId ? short(poolId) : "Resolving…"}</code></div><b>{found ? "FOUND" : "WAIT"}</b></FilterRow>
                    <FilterRow><div><strong>Issuer pool</strong><code>Chain 11155111 · {manager}</code></div><b>{matched ? "ALLOW" : "WAIT"}</b></FilterRow>
                  </FilterColumn>
                </FilterBoard>
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
                  <HookMetrics>
                    <HookCap verified={hookCompliant}><span>Immutable maximum</span><strong>{hookCompliant ? `${capPercent}%` : "…"}</strong><p>Fixed in the wrapper</p></HookCap>
                    <QuoteBasis ready={Boolean(quote)}><span>Quote basis</span><strong>{quote ? `${(quote.pricedBps / 100).toFixed(2)}%` : "…"}</strong><p>Advertised 0.25% ignored</p></QuoteBasis>
                  </HookMetrics>
                  <HookChecks>
                    <div><span>ENS identity</span><strong>{hookVerified ? "Verified" : "Checking"}</strong></div>
                    <div><span>PoolKey hook</span><strong>{hookMatches ? "Address match" : "Checking"}</strong></div>
                    <div><span>Runtime code</span><strong>{attestation ? short(attestation.codeHash) : "Checking"}</strong></div>
                    <div><span>Return deltas</span><strong>{attestation && !attestation.beforeSwapReturnDelta && !attestation.afterSwapReturnDelta ? "Both disabled" : "Checking"}</strong></div>
                  </HookChecks>
                </HookProof>
              </Scene>
            )}

            {stage === "forward" && (
              <Scene key={sceneKey}>
                <RouteJourney>
                  <RoutePipeline aria-label="Verified router to PoolManager flow">
                    <RouteActor><Mark size={44} /><div><span>Klamp checks</span><strong>Route + cap passed</strong></div></RouteActor>
                    <RouteRail delay={0.18} aria-hidden="true" />
                    <RouteActor delay={0.35}><Image src="/router.svg" width={44} height={44} alt="" aria-hidden /><div><span>Guarded Router</span><strong>{forwarding ? "PoolKey sent" : "Encoding calldata"}</strong></div></RouteActor>
                    <RouteRail delay={0.54} aria-hidden="true" />
                    <RouteEndpoint delay={0.72}><Image src="/pool-manager.svg" width={38} height={38} alt="" aria-hidden /><div><span>PoolManager</span><strong>{forwarding ? "Route accepted" : "Waiting for proof"}</strong></div></RouteEndpoint>
                  </RoutePipeline>
                  <RouteHandoff>
                    <div><span>Selected branch</span><strong>Issuer pool · 1 hop</strong></div>
                    <div><span>Quote basis</span><strong>{quote ? `${(quote.pricedBps / 100).toFixed(2)}% maximum` : "Verified"}</strong></div>
                    <div><span>PoolId</span><strong>{proposedHop ? short(proposedHop.poolId) : "Waiting…"}</strong></div>
                  </RouteHandoff>
                </RouteJourney>
              </Scene>
            )}

            {stage === "request" && (
              <Scene key={sceneKey}>
                <AttackSequence>
                  <AttackOrigin><span>External compromise</span><strong>Strategy admin key</strong><code>setFee(300_000)</code></AttackOrigin>
                  <AttackRail aria-hidden="true"><i /><i /><i /></AttackRail>
                  <AttackPayload><SceneLabel>Fee strategy output</SceneLabel><FeeValue>30.00%</FeeValue><FeeCaption>The official pool requests 3,000 bps.</FeeCaption></AttackPayload>
                </AttackSequence>
              </Scene>
            )}

            {stage === "enforce" && (
              <Scene key={sceneKey}>
                <OutcomeComparison>
                  <Outcome guarded>
                    <h2>Guarded route</h2>
                    <dl><dt>Strategy request</dt><dd>30.00%</dd><dt>Wrapper return</dt><dd>{enforced ? `${(enforcement.appliedBps / 100).toFixed(2)}%` : "Applying…"}</dd><dt>PoolManager</dt><dd>Protected</dd></dl>
                    <strong>{enforced ? amount(enforcement.receivedOut) : "—"}</strong><p>Received exactly as quoted at the 1% maximum.</p>
                  </Outcome>
                  <Outcome>
                    <h2>Unguarded route</h2>
                    <dl><dt>Strategy request</dt><dd>30.00%</dd><dt>Applied fee</dt><dd>{enforced ? `${(enforcement.unguardedAppliedBps / 100).toFixed(2)}%` : "Applying…"}</dd><dt>PoolManager</dt><dd>No cap</dd></dl>
                    <strong>{enforced ? amount(enforcement.unguardedReceivedOut) : "—"}</strong><p>30% fee accepted; output falls below the quoted amount.</p>
                  </Outcome>
                </OutcomeComparison>
              </Scene>
            )}

            {(stage === "revoke" || stage === "complete") && (
              <Scene key={sceneKey}>
                <RevocationBoard>
                  <Guardian><span>Guardian multisig</span><strong>Revoke hook identity</strong><code>unregister(labelhash)</code></Guardian>
                  <RevokeRail aria-hidden="true" />
                  <RevokedRecord revoked={revoked}>
                    <h2>hooks.klamp.eth</h2>
                    <p>{revocation?.ensName ?? launch?.hookRegistration.ensName ?? "Resolving hook identity…"}</p>
                    <dl><dt>Resolver</dt><dd>{revoked ? "0x0" : "Removing…"}</dd><dt>Attestation</dt><dd>{revoked ? "Revoked" : "Pending"}</dd><dt>Guarded route</dt><dd>{revoked ? "Blocked" : "Closing"}</dd></dl>
                  </RevokedRecord>
                </RevocationBoard>
              </Scene>
            )}

            <Bottom>
              <Statuses>
                <Status><span>Pool record</span><strong>{poolStatus(Boolean(record))}</strong></Status>
                <Status><span>Route</span><strong>{routeStatus(stage, busy, Boolean(proposal), matched, Boolean(forwarding), revoked)}</strong></Status>
                <Status><span>Hook cap</span><strong>{feeCapStatus(stage, hookCompliant, enforced)}</strong></Status>
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
