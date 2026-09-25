"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "verify", "request", "enforce", "complete"];

const copy = {
  idle: { state: "Step 1 of 4", title: "Declare the canonical pool", detail: "Write the issuer-authorized pool record once." },
  launch: { state: "Step 1 complete", title: "Canonical pool recorded", detail: "The record now has an issuer proof and permanent PoolId." },
  verify: { state: "Step 2 complete", title: "Route matched", detail: "Chain, PoolManager, and PoolId match the ENSv2 record." },
  request: { state: "Step 3 complete", title: "Hook logic requested 30%", detail: "The local Phase 2 simulation begins with a malicious fee request." },
  enforce: { state: "Step 4 of 4", title: "Applying the 1% cap", detail: "Klamp returns the lower of the request and configured maximum." },
  complete: { state: "Trace complete", title: "The request was capped", detail: "Phase 1 passed. The simulated applied fee is 1%." },
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Declare", detail: "Canonical record" },
  { stage: "verify" as const, index: "2", title: "Verify", detail: "Route match" },
  { stage: "request" as const, index: "3", title: "Request 30%", detail: "Mock input" },
  { stage: "enforce" as const, index: "4", title: "Apply 1%", detail: "Mock cap" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }

const Shell = styled.section`
  width: 100%; max-width: ${layout.maxWidth}; height: 100%; min-height: 0; margin: 0 auto; padding: 18px 24px 22px; display: flex;
  @media (max-width: 820px), (max-height: 700px) { height: auto; min-height: calc(100dvh - 56px); padding: 14px 16px 28px; }
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
  list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid ${colors.border};
  @media (max-width: 680px) { padding: 0; overflow-x: auto; }
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; min-width: 148px; padding: 13px 10px 12px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
  &::before {
    content: ""; position: absolute; left: 10px; right: 10px; top: -1px; height: 3px;
    background: ${({ active, done }) => active ? colors.primary : done ? colors.textPrimary : "transparent"};
    transform-origin: left; animation: ${({ active }) => active ? "progressIn .28s ease-out" : "none"};
  }
  @keyframes progressIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;
const StepNumber = styled.span`font: 500 12px/1 ${mono}; margin-right: 8px;`;
const StepTitle = styled.span`font-size: 14px; font-weight: 650;`;
const StepDetail = styled.div`font-size: 12px; color: ${colors.textMuted}; margin: 5px 0 0 20px;`;

const Stage = styled.div`
  min-height: 0; overflow: hidden; padding: 20px 24px 19px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
  @media (max-width: 820px), (max-height: 700px) { overflow: visible; display: block; }
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

const Declaration = styled.div`width: min(720px, 100%); display: grid; grid-template-columns: 104px minmax(0, 1fr); gap: 30px; align-items: center;`;
const DeclarationMark = styled.div`display: grid; place-items: center;`;
const DeclarationCopy = styled.div`
  h2 { margin: 0 0 8px; font-size: 24px; }
  > p { margin: 0 0 22px; color: ${colors.textSecondary}; font-size: 15px; }
`;
const Receipt = styled.dl`
  margin: 0; display: grid; grid-template-columns: 120px minmax(0, 1fr); border-top: 1px solid ${colors.borderStrong};
  dt, dd { margin: 0; padding: 11px 0; border-bottom: 1px solid ${colors.border}; }
  dt { color: ${colors.textMuted}; font-size: 13px; }
  dd { font: 500 13px/1.45 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
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
  &::before { content: ""; position: absolute; left: 0; right: 0; height: 2px; background: ${colors.primary}; transform-origin: center; animation: ${({ matched }) => matched ? "join .42s ease-out" : "none"}; }
  img { position: relative; z-index: 1; background: white; padding: 10px; animation: ${({ matched }) => matched ? "clamp .42s ease-out" : "none"}; }
  @keyframes join { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes clamp { 0% { transform: scale(1.16); } 65% { transform: scale(.94); } 100% { transform: scale(1); } }
`;
const MatchResult = styled.div`
  grid-column: 1 / -1; margin-top: 30px; padding: 14px 18px; background: ${colors.primarySoft}; text-align: center; font-size: 15px;
  strong { font-weight: 700; }
`;

const FeeRequest = styled.div`text-align: center;`;
const FeeValue = styled.div`
  font: 500 clamp(64px, 9vw, 112px)/.9 ${mono}; letter-spacing: -.075em; color: ${colors.danger};
  animation: valueIn .34s cubic-bezier(.2,.8,.3,1);
  @keyframes valueIn { from { opacity: 0; transform: scale(.88); } to { opacity: 1; transform: scale(1); } }
`;
const FeeCaption = styled.p`margin: 20px 0 0; color: ${colors.textSecondary}; font-size: 16px;`;

const Enforcement = styled.div`width: min(820px, 100%); display: grid; grid-template-columns: 1fr 120px 1fr; align-items: center; text-align: center;`;
const FeeSide = styled.div`
  span { display: block; color: ${colors.textMuted}; font-size: 14px; margin-bottom: 13px; }
  strong { font: 500 clamp(48px, 7vw, 82px)/1 ${mono}; letter-spacing: -.07em; }
`;
const Cap = styled.div`
  display: grid; place-items: center; gap: 8px;
  span { color: ${colors.primaryHover}; font-size: 13px; font-weight: 650; }
  img { animation: capSet .45s cubic-bezier(.2,.8,.3,1); }
  @keyframes capSet { 0% { transform: translateX(-12px) scale(1.12); } 70% { transform: translateX(3px) scale(.96); } 100% { transform: translateX(0) scale(1); } }
`;
const AppliedFee = styled(FeeSide)`strong { color: ${colors.primaryHover}; animation: valueIn .38s cubic-bezier(.2,.8,.3,1); }`;
const EnforcementResult = styled.div`
  grid-column: 1 / -1; margin-top: 28px; color: ${colors.textSecondary}; font-size: 15px;
  strong { color: ${colors.textPrimary}; }
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
  &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
`;

const ReducedMotion = styled.div`
  display: contents;
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

function actionLabel(stage: DemoStage, busy: boolean) {
  if (busy && stage === "launch") return "Declaring…";
  if (busy && stage === "verify") return "Verifying…";
  if (busy && stage === "enforce") return "Applying cap…";
  if (stage === "idle") return "Declare canonical pool";
  if (stage === "launch") return "Verify proposed route";
  if (stage === "verify") return "Request 30% fee";
  if (stage === "request") return "Apply 1% cap";
  if (stage === "complete") return "Start over";
  return "Working…";
}

function phaseOneStatus(stage: DemoStage, matched: boolean) {
  if (matched) return "Route matched";
  if (stageIndex(stage) >= stageIndex("launch")) return "Pool declared";
  return "Not started";
}

function phaseTwoStatus(stage: DemoStage, enforced: boolean) {
  if (enforced) return "Capped at 1%";
  if (stageIndex(stage) >= stageIndex("request")) return "30% requested";
  return "Not started";
}

export function DemoTerminal() {
  const { stage, busy, launch, canonical, comparison, enforcement, advance, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = copy[stage];
  const found = canonical?.status === "found";
  const matched = comparison?.status === "match";
  const record = launch?.canonicalPool ?? null;
  const enforced = enforcement !== null;
  const poolId = found ? canonical.poolId : record?.poolId;
  const manager = found ? short(canonical.poolManager) : "Resolving after declaration";
  const sceneKey = `${stage}-${busy ? "busy" : "ready"}`;

  return (
    <ReducedMotion>
      <Shell>
        <Instrument translate="no">
          <InstrumentHead>
            <TraceName><LiveMark complete={stage === "complete"} />Verification trace 01</TraceName>
            <Network>Sepolia fixture</Network>
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
                <Declaration>
                  <DeclarationMark><Mark size={82} /></DeclarationMark>
                  <DeclarationCopy>
                    <SceneLabel>Canonical pool record</SceneLabel>
                    <h2>{record ? "Record written" : busy ? "Writing record…" : "Ready to declare"}</h2>
                    <p>{record?.ensName ?? "0x<token>.tokens.klamp.eth"}</p>
                    <Receipt>
                      <dt>Issuer proof</dt><dd>{record?.issuerProof ?? "Pending"}</dd>
                      <dt>PoolId</dt><dd>{record ? short(record.poolId) : "Not written"}</dd>
                    </Receipt>
                  </DeclarationCopy>
                </Declaration>
              </Scene>
            )}

            {stage === "verify" && (
              <Scene key={sceneKey}>
                <Comparison>
                  <CompareSide><SceneLabel>ENSv2 record</SceneLabel><h2>Canonical pool</h2><strong>{poolId ? short(poolId) : "Resolving…"}</strong><p>Chain 11155111 · {manager}</p></CompareSide>
                  <AnimatedClamp matched={matched}><Mark size={70} /></AnimatedClamp>
                  <CompareSideRight><SceneLabel>Proposed route</SceneLabel><h2>Route branch 0</h2><strong>{matched && poolId ? short(poolId) : "Waiting…"}</strong><p>{matched ? "Chain and PoolManager agree" : "Comparing declared fields"}</p></CompareSideRight>
                  {matched && <MatchResult><strong>Match.</strong> The proposed route uses the canonical pool.</MatchResult>}
                </Comparison>
              </Scene>
            )}

            {stage === "request" && (
              <Scene key={sceneKey}>
                <FeeRequest><SceneLabel>Requested by hook logic · Phase 2 simulation</SceneLabel><FeeValue>30.00%</FeeValue><FeeCaption>3,000 bps requested before the cap is applied.</FeeCaption></FeeRequest>
              </Scene>
            )}

            {(stage === "enforce" || stage === "complete") && (
              <Scene key={sceneKey}>
                <Enforcement>
                  <FeeSide><span>Requested</span><strong style={{ color: colors.danger }}>30.00%</strong></FeeSide>
                  <Cap><Mark size={76} /><span>maximum 1%</span></Cap>
                  <AppliedFee><span>Applied</span><strong>{enforced ? "1.00%" : "…"}</strong></AppliedFee>
                  <EnforcementResult>{enforced ? <><strong>Cap enforced.</strong> The simulated quote keeps the configured maximum.</> : "Calculating min(requested fee, configured cap)…"}</EnforcementResult>
                </Enforcement>
              </Scene>
            )}

            <Bottom>
              <Statuses>
                <Status><span>Phase 1</span><strong>{phaseOneStatus(stage, matched)}</strong></Status>
                <Status><span>Phase 2 simulation</span><strong>{phaseTwoStatus(stage, enforced)}</strong></Status>
              </Statuses>
              <Actions>
                {stage !== "idle" && <Reset onClick={reset}>Reset</Reset>}
                <Next onClick={() => advance()} disabled={busy}>{actionLabel(stage, busy)}</Next>
              </Actions>
            </Bottom>
          </Stage>
        </Instrument>
      </Shell>
    </ReducedMotion>
  );
}
