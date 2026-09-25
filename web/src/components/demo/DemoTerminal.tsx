"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "verify", "request", "enforce", "complete"];

const copy = {
  idle: { state: "Ready to run", title: "The trace starts with the issuer record", detail: "Run the fixture to write the canonical pool, resolve it through ENSv2, and compare the proposed route." },
  launch: { state: "Writing the record", title: "The issuer declares one canonical pool", detail: "The fixture checks issuer authority and writes a permanent record after pool initialization." },
  verify: { state: "Resolving ENSv2", title: "The client checks the proposed route", detail: "Chain, PoolManager, and PoolId must all match the canonical record." },
  request: { state: "Phase 2 simulation", title: "The hook requests a 30% fee", detail: "This request is simulated locally after the Phase 1 route check succeeds." },
  enforce: { state: "Applying the mock cap", title: "Klamp limits the request to 1%", detail: "The simulated result uses the lower of the requested fee and the configured cap." },
  complete: { state: "Trace complete", title: "The route matches and the mock cap holds", detail: "Phase 1 passed against the fixture. Phase 2 applied 1% instead of the requested 30%." },
};

const steps = [
  { stage: "launch" as const, index: "1", title: "Declare", detail: "Issuer proof" },
  { stage: "verify" as const, index: "2", title: "Verify", detail: "ENSv2 lookup" },
  { stage: "request" as const, index: "3", title: "Request", detail: "30% mock fee" },
  { stage: "enforce" as const, index: "4", title: "Enforce", detail: "1% mock cap" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }
function short(value: string) { return `${value.slice(0, 8)}…${value.slice(-6)}`; }

const Shell = styled.section`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 112px;
  @media (max-width: 720px) { padding: 0 16px 72px; }
`;
const Instrument = styled.div`border-top: 3px solid ${colors.textPrimary}; border-bottom: 1px solid ${colors.borderStrong}; background: ${colors.surface};`;
const InstrumentHead = styled.div`
  min-height: 52px; padding: 0 18px; display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid ${colors.border}; font-size: 13px;
`;
const TraceName = styled.div`display: flex; align-items: center; gap: 9px; font-weight: 600;`;
const LiveMark = styled.span<{ complete: boolean }>`width: 7px; height: 7px; background: ${({ complete }) => complete ? colors.primary : colors.textPrimary};`;
const Network = styled.div`color: ${colors.textMuted};`;

const Progress = styled.ol`
  list-style: none; margin: 0; padding: 0 18px; display: grid; grid-template-columns: repeat(4, 1fr); border-bottom: 1px solid ${colors.border};
  @media (max-width: 680px) { padding: 0; overflow-x: auto; }
`;
const ProgressItem = styled.li<{ active: boolean; done: boolean }>`
  position: relative; padding: 16px 12px 15px; min-width: 142px; color: ${({ active, done }) => active || done ? colors.textPrimary : colors.textMuted};
  &::before { content: ""; position: absolute; left: 12px; right: 12px; top: -1px; height: 3px; background: ${({ active, done }) => active || done ? colors.primary : "transparent"}; }
`;
const StepNumber = styled.span`font: 500 11px/1 ${mono}; margin-right: 9px;`;
const StepTitle = styled.span`font-size: 13px; font-weight: 650;`;
const StepDetail = styled.div`font-size: 11px; color: ${colors.textMuted}; margin: 5px 0 0 20px;`;

const Stage = styled.div`padding: 36px 38px 34px; @media (max-width: 620px) { padding: 28px 18px 24px; }`;
const StageHead = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 420px); align-items: end; gap: 56px; margin-bottom: 32px;
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 12px; }
`;
const StageState = styled.div`color: ${colors.primaryHover}; font-size: 12px; font-weight: 650; margin-bottom: 9px;`;
const StageTitle = styled.h2`font-size: clamp(25px, 3.2vw, 38px); line-height: 1.08; letter-spacing: -.035em; margin: 0; font-weight: 650;`;
const StageDetail = styled.p`color: ${colors.textSecondary}; font-size: 14px; line-height: 1.6; margin: 0;`;

const RecordCheck = styled.section`border-top: 1px solid ${colors.borderStrong}; border-bottom: 1px solid ${colors.borderStrong};`;
const RecordHead = styled.div`
  display: flex; justify-content: space-between; gap: 20px; padding: 14px 0; border-bottom: 1px solid ${colors.border};
  h3 { margin: 0; font-size: 14px; }
  span { color: ${colors.textMuted}; font-size: 12px; }
`;
const RecordGrid = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr); align-items: stretch;
  @media (max-width: 720px) { grid-template-columns: 1fr; }
`;
const RecordSide = styled.div`
  padding: 24px 0 26px; min-width: 0;
  h4 { margin: 0 0 17px; color: ${colors.textSecondary}; font-size: 13px; font-weight: 600; }
  @media (max-width: 720px) { padding: 22px 0; }
`;
const RecordSideRight = styled(RecordSide)`
  text-align: right;
  @media (max-width: 720px) { text-align: left; }
`;
const RecordRow = styled.div`
  display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 14px; margin-top: 12px; align-items: baseline;
  span { color: ${colors.textMuted}; font-size: 11px; }
  code { font: 500 11px/1.45 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
const RecordRowRight = styled(RecordRow)`
  grid-template-columns: minmax(0, 1fr) 92px;
  @media (max-width: 720px) { grid-template-columns: 92px minmax(0, 1fr); span { order: 0; } code { order: 1; } }
`;
const ClampBridge = styled.div`
  position: relative; display: grid; place-items: center;
  &::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: ${colors.primary}; }
  img { position: relative; z-index: 1; background: ${colors.surface}; padding: 8px; }
  @media (max-width: 720px) { min-height: 62px; &::before { left: 50%; right: auto; top: 0; bottom: 0; width: 1px; height: auto; } }
`;
const CheckResult = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 13px 0; border-top: 1px solid ${colors.border}; font-size: 13px;
  span:first-of-type { width: 7px; height: 7px; background: ${colors.primary}; }
  strong { font-weight: 650; }
  em { margin-left: auto; color: ${colors.textMuted}; font-style: normal; font-size: 12px; }
`;

const FeeSimulation = styled.section`
  margin-top: 34px; padding: 24px; background: ${colors.surfaceSecondary}; border-left: 5px solid ${colors.borderStrong};
  @media (max-width: 620px) { padding: 20px 16px; }
`;
const FeeHead = styled.div`
  display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 28px; margin-bottom: 24px;
  h3 { margin: 0; font-size: 14px; }
  p { margin: 0; color: ${colors.textSecondary}; font-size: 13px; line-height: 1.55; }
  @media (max-width: 620px) { grid-template-columns: 1fr; gap: 7px; }
`;
const FeeMeasure = styled.div`
  display: grid; grid-template-columns: 1fr 1fr 1fr; border-top: 1px solid ${colors.borderStrong};
  @media (max-width: 580px) { grid-template-columns: 1fr; }
`;
const Measure = styled.div`
  padding: 18px 20px 8px 0; min-width: 0;
  & + & { border-left: 1px solid ${colors.border}; padding-left: 20px; }
  span { display: block; color: ${colors.textMuted}; font-size: 11px; margin-bottom: 12px; }
  strong { font: 500 clamp(25px, 4vw, 42px)/1 ${mono}; letter-spacing: -.055em; }
  small { display: block; margin-top: 9px; color: ${colors.textSecondary}; font-size: 11px; }
  @media (max-width: 580px) { padding: 17px 0; & + & { border-left: 0; border-top: 1px solid ${colors.border}; padding-left: 0; } }
`;

const Bottom = styled.div`
  margin-top: 28px; display: flex; align-items: flex-end; justify-content: space-between; gap: 22px;
  @media (max-width: 620px) { align-items: stretch; flex-direction: column; }
`;
const Readout = styled.dl`
  margin: 0; display: grid; grid-template-columns: 70px minmax(0, 1fr); gap: 6px 12px; color: ${colors.textMuted}; font-size: 11px;
  dt { margin: 0; } dd { margin: 0; color: ${colors.textSecondary}; font: 400 11px/1.4 ${mono}; }
`;
const Actions = styled.div`display: flex; gap: 9px;`;
const Run = styled.button`
  border: 1px solid ${colors.primary}; padding: 12px 17px; background: ${colors.primary}; color: ${colors.textPrimary}; cursor: pointer;
  font-weight: 700; font-size: 13px; min-width: 126px;
  &:hover { background: ${colors.primaryHover}; border-color: ${colors.primaryHover}; color: white; }
  &:disabled { cursor: wait; opacity: .65; }
`;
const Reset = styled.button`
  border: 1px solid ${colors.borderStrong}; padding: 12px 15px; background: transparent; color: ${colors.textSecondary}; cursor: pointer; font-weight: 600; font-size: 13px;
  &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
`;

export function DemoTerminal() {
  const { stage, busy, launch, canonical, comparison, attestation, enforcement, runDemo, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = copy[stage];
  const found = canonical?.status === "found";
  const matched = comparison?.status === "match";
  const record = launch?.canonicalPool ?? null;
  const requested = current >= stageIndex("request");
  const enforced = current >= stageIndex("enforce");
  const chain = found ? canonical.chainId.toString() : "Waiting";
  const manager = found ? short(canonical.poolManager) : "Waiting";
  const poolId = found ? short(canonical.poolId) : "Waiting";

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
            const active = stage === item.stage;
            return (
              <ProgressItem key={item.stage} active={active} done={current > index} aria-current={active ? "step" : undefined}>
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
          <RecordCheck>
            <RecordHead><h3>Canonical route comparison</h3><span>{matched ? "1 route branch checked" : "Awaiting comparison"}</span></RecordHead>
            <RecordGrid>
              <RecordSide>
                <h4>ENSv2 record</h4>
                <RecordRow><span>Chain</span><code>{chain}</code></RecordRow>
                <RecordRow><span>PoolManager</span><code>{manager}</code></RecordRow>
                <RecordRow><span>PoolId</span><code>{poolId}</code></RecordRow>
              </RecordSide>
              <ClampBridge aria-hidden="true"><Mark size={62} /></ClampBridge>
              <RecordSideRight>
                <h4>Proposed route</h4>
                <RecordRowRight><code>{matched ? chain : "Waiting"}</code><span>Chain</span></RecordRowRight>
                <RecordRowRight><code>{matched ? manager : "Waiting"}</code><span>PoolManager</span></RecordRowRight>
                <RecordRowRight><code>{matched ? poolId : "Waiting"}</code><span>PoolId</span></RecordRowRight>
              </RecordSideRight>
            </RecordGrid>
            <CheckResult><span /><strong>{matched ? "Route matched" : found ? "Record resolved" : "Verification not started"}</strong><em>{found ? `Source: ${canonical.source}` : "Strict resolution required"}</em></CheckResult>
          </RecordCheck>
          <FeeSimulation>
            <FeeHead>
              <h3>Phase 2 fee simulation</h3>
              <p>This section previews the proposed CappedHook. It is not an onchain guarantee in the current build.</p>
            </FeeHead>
            <FeeMeasure>
              <Measure><span>Requested by hook logic</span><strong style={{ color: requested ? colors.danger : colors.textMuted }}>{requested ? "30.00%" : "—"}</strong><small>{requested ? "3,000 bps" : "Waiting for request"}</small></Measure>
              <Measure><span>Configured maximum</span><strong>1.00%</strong><small>{attestation ? `${attestation.capBps} bps fixture` : "100 bps fixture"}</small></Measure>
              <Measure><span>Applied by simulation</span><strong style={{ color: enforced ? colors.primaryHover : colors.textMuted }}>{enforced ? "1.00%" : "—"}</strong><small>{enforcement ? "Request was capped" : "Waiting for enforcement"}</small></Measure>
            </FeeMeasure>
          </FeeSimulation>
          <Bottom>
            <Readout>
              <dt>Transaction</dt><dd>{launch ? short(launch.txHash) : "Not submitted"}</dd>
              <dt>Issuer</dt><dd>{record ? `${record.issuerProof}, ${short(record.issuer)}` : "Awaiting issuer proof"}</dd>
              <dt>Route</dt><dd>{matched ? `Match from ${comparison.source}` : comparison?.status ?? "Pending"}</dd>
            </Readout>
            <Actions>
              {stage !== "idle" && <Reset onClick={reset}>Reset trace</Reset>}
              <Run onClick={() => runDemo()} disabled={busy}>{busy ? "Running…" : stage === "complete" ? "Run again" : "Run trace"}</Run>
            </Actions>
          </Bottom>
        </Stage>
      </Instrument>
    </Shell>
  );
}
