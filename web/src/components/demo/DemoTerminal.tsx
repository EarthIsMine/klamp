"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "verify", "request", "enforce", "complete"];

const copy = {
  idle: { state: "Step 1 of 4", title: "Declare the canonical pool", detail: "Start with the issuer-authorized, write-once pool record." },
  launch: { state: "Step 1 complete", title: "Canonical pool recorded", detail: "The fixture now has an issuer proof and permanent PoolId record." },
  verify: { state: "Step 2 complete", title: "Route matched the ENSv2 record", detail: "Chain, PoolManager, and PoolId all match the proposed route." },
  request: { state: "Step 3 complete", title: "Hook logic requested 30%", detail: "This fee request begins the local Phase 2 simulation." },
  enforce: { state: "Step 4 of 4", title: "Applying the configured cap", detail: "The simulation returns the lower of the request and the 1% maximum." },
  complete: { state: "Trace complete", title: "The 30% request was capped at 1%", detail: "Phase 1 passed; the Phase 2 result remains an explicit simulation." },
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Declare", detail: "Issuer proof" },
  { stage: "verify" as const, index: "2", title: "Verify", detail: "ENSv2 lookup" },
  { stage: "request" as const, index: "3", title: "Request 30%", detail: "Phase 2 input" },
  { stage: "enforce" as const, index: "4", title: "Apply 1%", detail: "Phase 2 cap" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }

const Shell = styled.section`
  width: 100%; max-width: ${layout.maxWidth}; height: 100%; min-height: 0; margin: 0 auto; padding: 18px 24px 22px;
  display: flex;
  @media (max-width: 820px), (max-height: 700px) { height: auto; min-height: calc(100dvh - 56px); padding: 14px 16px 28px; }
`;
const Instrument = styled.div`
  flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr);
  border-top: 3px solid ${colors.textPrimary}; border-bottom: 1px solid ${colors.borderStrong}; background: ${colors.surface};
`;
const InstrumentHead = styled.div`
  min-height: 42px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid ${colors.border}; font-size: 12px;
`;
const TraceName = styled.div`display: flex; align-items: center; gap: 9px; font-weight: 650;`;
const LiveMark = styled.span<{ complete: boolean }>`width: 7px; height: 7px; background: ${({ complete }) => complete ? colors.primary : colors.textPrimary};`;
const Network = styled.div`color: ${colors.textMuted};`;

const Progress = styled.ol`
  list-style: none; margin: 0; padding: 0 16px; display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid ${colors.border};
  @media (max-width: 680px) { padding: 0; overflow-x: auto; }
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; min-width: 140px; padding: 12px 10px 11px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
  &::before { content: ""; position: absolute; left: 10px; right: 10px; top: -1px; height: 3px; background: ${({ active, done }) => active ? colors.primary : done ? colors.textPrimary : "transparent"}; }
`;
const StepNumber = styled.span`font: 500 10px/1 ${mono}; margin-right: 8px;`;
const StepTitle = styled.span`font-size: 12px; font-weight: 650;`;
const StepDetail = styled.div`font-size: 10px; color: ${colors.textMuted}; margin: 4px 0 0 17px;`;

const Stage = styled.div`
  min-height: 0; overflow: auto; padding: 18px 24px 19px; display: grid; grid-template-rows: auto minmax(0, 1fr) auto;
  @media (max-width: 820px), (max-height: 700px) { overflow: visible; display: block; }
  @media (max-width: 620px) { padding: 20px 16px; }
`;
const StageHead = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 410px); align-items: end; gap: 42px; margin-bottom: 16px;
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 7px; }
`;
const StageState = styled.div`color: ${colors.primaryHover}; font-size: 11px; font-weight: 650; margin-bottom: 5px;`;
const StageTitle = styled.h1`font-size: clamp(21px, 2.5vw, 28px); line-height: 1.08; letter-spacing: -.03em; margin: 0; font-weight: 650;`;
const StageDetail = styled.p`color: ${colors.textSecondary}; font-size: 13px; line-height: 1.5; margin: 0;`;
const Evidence = styled.div`
  min-height: 0; display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, .7fr); gap: 22px; align-items: stretch;
  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const RecordCheck = styled.section`
  min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; border-top: 1px solid ${colors.borderStrong}; border-bottom: 1px solid ${colors.borderStrong};
`;
const RecordHead = styled.div`
  display: flex; justify-content: space-between; gap: 20px; padding: 10px 0; border-bottom: 1px solid ${colors.border};
  h2 { margin: 0; font-size: 13px; } span { color: ${colors.textMuted}; font-size: 11px; }
`;
const RecordGrid = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 74px minmax(0, 1fr); align-items: stretch;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const RecordSide = styled.div`
  padding: 16px 0; min-width: 0;
  h3 { margin: 0 0 11px; color: ${colors.textSecondary}; font-size: 12px; font-weight: 600; }
`;
const RecordSideRight = styled(RecordSide)`text-align: right; @media (max-width: 720px) { text-align: left; }`;
const RecordRow = styled.div`
  display: grid; grid-template-columns: 82px minmax(0, 1fr); gap: 12px; margin-top: 8px; align-items: baseline;
  span { color: ${colors.textMuted}; font-size: 10px; }
  code { font: 500 10px/1.4 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
const RecordRowRight = styled(RecordRow)`
  grid-template-columns: minmax(0, 1fr) 82px;
  @media (max-width: 720px) { grid-template-columns: 82px minmax(0, 1fr); span { order: 0; } code { order: 1; } }
`;
const ClampBridge = styled.div`
  position: relative; display: grid; place-items: center;
  &::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: ${colors.primary}; }
  img { position: relative; z-index: 1; background: ${colors.surface}; padding: 8px; }
  @media (max-width: 720px) { min-height: 56px; &::before { left: 50%; right: auto; top: 0; bottom: 0; width: 1px; height: auto; } }
`;
const CheckResult = styled.div`
  display: flex; align-items: center; gap: 9px; min-height: 38px; border-top: 1px solid ${colors.border}; font-size: 12px;
  span:first-of-type { width: 7px; height: 7px; background: ${colors.primary}; }
  strong { font-weight: 650; }
  em { margin-left: auto; color: ${colors.textMuted}; font-style: normal; font-size: 11px; }
`;

const FeeSimulation = styled.section`
  min-height: 0; padding: 16px 18px; background: ${colors.surfaceSecondary}; display: grid; grid-template-rows: auto minmax(0, 1fr);
`;
const FeeHead = styled.div`
  padding-bottom: 12px;
  h2 { margin: 0 0 5px; font-size: 13px; }
  p { margin: 0; color: ${colors.textSecondary}; font-size: 11px; line-height: 1.45; }
`;
const FeeMeasure = styled.div`display: grid; grid-template-rows: repeat(3, 1fr); border-top: 1px solid ${colors.borderStrong};`;
const Measure = styled.div`
  min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-rows: auto auto; align-content: center; gap: 4px 16px; padding: 9px 0;
  & + & { border-top: 1px solid ${colors.border}; }
  span { color: ${colors.textMuted}; font-size: 10px; }
  strong { grid-column: 2; grid-row: 1 / 3; align-self: center; font: 500 clamp(23px, 3vw, 34px)/1 ${mono}; letter-spacing: -.05em; }
  small { color: ${colors.textSecondary}; font-size: 10px; }
`;

const Bottom = styled.div`
  margin-top: 16px; display: flex; align-items: end; justify-content: space-between; gap: 20px;
  @media (max-width: 620px) { align-items: stretch; flex-direction: column; }
`;
const Readout = styled.dl`
  margin: 0; display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 4px 10px; color: ${colors.textMuted}; font-size: 10px;
  dt { margin: 0; } dd { margin: 0; color: ${colors.textSecondary}; font: 400 10px/1.35 ${mono}; }
`;
const Actions = styled.div`display: flex; gap: 9px; justify-content: flex-end;`;
const Next = styled.button`
  border: 1px solid ${colors.primary}; padding: 11px 17px; background: ${colors.primary}; color: ${colors.textPrimary}; cursor: pointer;
  font-weight: 700; font-size: 12px; min-width: 154px;
  &:hover { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; color: white; }
  &:disabled { cursor: wait; opacity: .65; }
`;
const Reset = styled.button`
  border: 1px solid ${colors.borderStrong}; padding: 11px 14px; background: transparent; color: ${colors.textSecondary}; cursor: pointer; font-weight: 600; font-size: 12px;
  &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
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

export function DemoTerminal() {
  const { stage, busy, launch, canonical, comparison, attestation, enforcement, advance, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = copy[stage];
  const found = canonical?.status === "found";
  const matched = comparison?.status === "match";
  const record = launch?.canonicalPool ?? null;
  const requested = current >= stageIndex("request");
  const enforced = enforcement !== null;
  const chain = found ? canonical.chainId.toString() : record ? record.chainId.toString() : "Waiting";
  const manager = found ? short(canonical.poolManager) : "Waiting for resolution";
  const poolId = found ? short(canonical.poolId) : record ? short(record.poolId) : "Waiting";

  return (
    <Shell>
      <Instrument translate="no">
        <InstrumentHead>
          <TraceName><LiveMark complete={stage === "complete"} />Verification trace 01</TraceName>
          <Network>Sepolia fixture, chain 11155111</Network>
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
          <Evidence>
            <RecordCheck>
              <RecordHead><h2>Canonical route comparison</h2><span>{matched ? "1 route branch checked" : record ? "Record available" : "Awaiting declaration"}</span></RecordHead>
              <RecordGrid>
                <RecordSide>
                  <h3>ENSv2 record</h3>
                  <RecordRow><span>Chain</span><code>{chain}</code></RecordRow>
                  <RecordRow><span>PoolManager</span><code>{manager}</code></RecordRow>
                  <RecordRow><span>PoolId</span><code>{poolId}</code></RecordRow>
                </RecordSide>
                <ClampBridge aria-hidden="true"><Mark size={56} /></ClampBridge>
                <RecordSideRight>
                  <h3>Proposed route</h3>
                  <RecordRowRight><code>{matched ? chain : "Waiting"}</code><span>Chain</span></RecordRowRight>
                  <RecordRowRight><code>{matched ? manager : "Waiting"}</code><span>PoolManager</span></RecordRowRight>
                  <RecordRowRight><code>{matched ? poolId : "Waiting"}</code><span>PoolId</span></RecordRowRight>
                </RecordSideRight>
              </RecordGrid>
              <CheckResult><span /><strong>{matched ? "Route matched" : record ? "Canonical pool declared" : "Verification not started"}</strong><em>{found ? `Source: ${canonical.source}` : "Strict resolution required"}</em></CheckResult>
            </RecordCheck>
            <FeeSimulation>
              <FeeHead><h2>Phase 2 fee simulation</h2><p>Local preview, not a guarantee in the current contract build.</p></FeeHead>
              <FeeMeasure>
                <Measure><span>Requested by hook logic</span><strong style={{ color: requested ? colors.danger : colors.textMuted }}>{requested ? "30.00%" : "—"}</strong><small>{requested ? "3,000 bps" : "Waiting for step 3"}</small></Measure>
                <Measure><span>Configured maximum</span><strong>1.00%</strong><small>{attestation ? `${attestation.capBps} bps fixture` : "100 bps fixture"}</small></Measure>
                <Measure><span>Applied by simulation</span><strong style={{ color: enforced ? colors.primaryHover : colors.textMuted }}>{enforced ? "1.00%" : "—"}</strong><small>{enforcement ? "Request was capped" : "Waiting for step 4"}</small></Measure>
              </FeeMeasure>
            </FeeSimulation>
          </Evidence>
          <Bottom>
            <Readout>
              <dt>Transaction</dt><dd>{launch ? short(launch.txHash) : "Not submitted"}</dd>
              <dt>Issuer</dt><dd>{record ? `${record.issuerProof}, ${short(record.issuer)}` : "Awaiting issuer proof"}</dd>
              <dt>Route</dt><dd>{matched ? `Match from ${comparison.source}` : comparison?.status ?? "Pending"}</dd>
            </Readout>
            <Actions>
              {stage !== "idle" && <Reset onClick={reset}>Reset</Reset>}
              <Next onClick={() => advance()} disabled={busy}>{actionLabel(stage, busy)}</Next>
            </Actions>
          </Bottom>
        </Stage>
      </Instrument>
    </Shell>
  );
}
