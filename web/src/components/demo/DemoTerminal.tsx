"use client";

import styled from "@emotion/styled";
import { useDemoStore, type DemoStage } from "@/store/demo-store";
import { colors, layout, mono } from "@/styles/tokens";

const stageOrder: DemoStage[] = ["idle", "launch", "verify", "request", "enforce", "complete"];

const copy = {
  idle: { code: "Ready", title: "Protocol demo is standing by", detail: "One run replays canonical resolution, route comparison, and the fee-cap mock." },
  launch: { code: "Step 1 / transaction", title: "Issuer declares the canonical pool", detail: "PoolManager.initialize → recordByCreate2 → permanent, write-once record" },
  verify: { code: "Step 2 / read", title: "Resolving the canonical route", detail: "Fixed resolver → strict ENS lookup → text/data match → PoolId recomputed." },
  request: { code: "Step 3 / Phase 2 mock", title: "Hook logic requests 30.00%", detail: "The mock hook requests a fee change after winning the route." },
  enforce: { code: "Step 4 / Phase 2 mock", title: "Klamp applies the configured cap", detail: "The simulation returns min(requested fee, cap)." },
  complete: { code: "Trace complete", title: "Requested 30.00%. Applied 1.00%.", detail: "Phase 1 verification passed; the Phase 2 cap result shown here is simulated." },
};

const steps = [
  { stage: "launch" as const, index: "01", title: "Declare", meta: "CREATE2 issuer proof" },
  { stage: "verify" as const, index: "02", title: "Verify", meta: "strict ENSv2 lookup" },
  { stage: "request" as const, index: "03", title: "Request", meta: "phase 2 mock · 30.00%" },
  { stage: "enforce" as const, index: "04", title: "Enforce", meta: "phase 2 mock · 1.00%" },
];

function stageIndex(stage: DemoStage) { return stageOrder.indexOf(stage); }

const Shell = styled.section`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 112px;
  @media (max-width: 720px) { padding: 0 16px 72px; }
`;

const Terminal = styled.div`
  border: 1px solid ${colors.borderStrong}; background: ${colors.surface}; border-radius: 3px; overflow: hidden;
`;

const Bar = styled.div`
  min-height: 48px; padding: 0 16px; border-bottom: 1px solid ${colors.border}; display: flex; align-items: center; justify-content: space-between; gap: 16px; background: ${colors.surfaceSecondary};
`;

const TerminalId = styled.div`
  font: 600 11px/1 ${mono}; letter-spacing: .08em; display: flex; align-items: center; gap: 9px; color: ${colors.textSecondary};
  span:first-of-type { width: 7px; height: 7px; background: ${colors.success}; border-radius: 50%; }
`;

const Network = styled.div`font: 500 11px/1 ${mono}; color: ${colors.textMuted};`;

const Grid = styled.div`
  display: grid; grid-template-columns: 260px minmax(0, 1fr);
  @media (max-width: 820px) { grid-template-columns: 1fr; }
`;

const Rail = styled.div`
  border-right: 1px solid ${colors.border}; background: #FCFCFA; padding: 22px 14px;
  @media (max-width: 820px) { border-right: 0; border-bottom: 1px solid ${colors.border}; display: grid; grid-template-columns: repeat(4, 1fr); padding: 10px; overflow-x: auto; }
`;

const Step = styled.div<{ active: boolean; done: boolean }>`
  position: relative; min-height: 79px; padding: 13px 12px 13px 42px; border-left: 2px solid ${({ active }) => active ? colors.primary : "transparent"}; background: ${({ active }) => active ? "#F8F7F3" : "transparent"};
  color: ${({ active, done }) => active ? colors.textPrimary : done ? colors.textSecondary : colors.textMuted};
  &::after { content: ""; position: absolute; left: 24px; top: 40px; width: 1px; height: 51px; background: ${({ done }) => done ? colors.primary : colors.border}; }
  &:last-of-type::after { display: none; }
  @media (max-width: 820px) { min-width: 150px; min-height: auto; padding: 10px; &::after { display: none; } }
`;

const Dot = styled.span<{ active: boolean; done: boolean }>`
  position: absolute; left: 18px; top: 18px; width: 13px; height: 13px; border-radius: 50%; border: 2px solid ${({ active, done }) => active || done ? colors.primary : colors.borderStrong}; background: ${({ active, done }) => active ? colors.primary : done ? colors.surface : colors.surface};
  @media (max-width: 820px) { display: none; }
`;

const StepLabel = styled.div`font: 650 12px/1.3 ${mono}; display: flex; gap: 8px;`;
const StepMeta = styled.div`font: 500 10px/1.5 ${mono}; margin-top: 5px;`;

const Stage = styled.div`min-width: 0; padding: 34px 38px 30px; @media (max-width: 620px) { padding: 26px 18px 22px; }`;
const StageCode = styled.div`font: 500 11px/1 ${mono}; color: ${colors.textMuted}; margin-bottom: 13px;`;
const StageTitle = styled.h2`font-size: clamp(24px, 3vw, 38px); line-height: 1.12; letter-spacing: -.035em; margin: 0; max-width: 690px;`;
const StageDetail = styled.p`color: ${colors.textSecondary}; font-size: 14px; line-height: 1.6; min-height: 44px; max-width: 700px; margin: 13px 0 28px;`;

const Flow = styled.div`display: grid; grid-template-columns: 1fr 56px 1fr 56px 1fr; align-items: stretch; @media (max-width: 680px) { grid-template-columns: 1fr; gap: 8px; }`;
const FlowCard = styled.div<{ accent?: boolean; danger?: boolean }>`
  min-height: 178px; border: 1px solid ${({ accent, danger }) => accent ? colors.primary : danger ? colors.danger : colors.border}; border-radius: 2px; padding: 17px; background: ${colors.surface}; display: flex; flex-direction: column; justify-content: space-between;
`;
const FlowLabel = styled.div`font: 550 11px/1 ${mono}; color: ${colors.textMuted};`;
const Fee = styled.div`font: 650 clamp(29px, 4vw, 47px)/1 ${mono}; letter-spacing: -.06em; margin: 20px 0 6px;`;
const FlowValue = styled.div`font: 600 12px/1.5 ${mono}; word-break: break-word; color: ${colors.textSecondary};`;
const Arrow = styled.div`display: grid; place-items: center; color: ${colors.textMuted}; font: 500 22px ${mono}; @media (max-width: 680px) { transform: rotate(90deg); height: 24px; }`;

const Footer = styled.div`border-top: 1px solid ${colors.border}; margin-top: 30px; padding-top: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; @media (max-width: 560px) { align-items: stretch; flex-direction: column; }`;
const Readout = styled.div`font: 500 11px/1.7 ${mono}; color: ${colors.textMuted}; span { color: ${colors.textPrimary}; }`;
const Actions = styled.div`display: flex; gap: 8px;`;
const Run = styled.button`
  border: 1px solid ${colors.primary}; border-radius: 2px; padding: 11px 16px; background: ${colors.primary}; color: white; cursor: pointer; font-weight: 700; font-size: 12px; min-width: 120px;
  &:hover { background: ${colors.primaryHover}; } &:disabled { cursor: wait; opacity: .65; }
`;
const Reset = styled.button`border: 1px solid ${colors.border}; border-radius: 2px; padding: 11px 14px; background: white; color: ${colors.textSecondary}; cursor: pointer; font-weight: 650; font-size: 12px;`;

export function DemoTerminal() {
  const { stage, busy, launch, canonical, comparison, attestation, enforcement, runDemo, reset } = useDemoStore();
  const current = stageIndex(stage);
  const view = copy[stage];
  const resolved = canonical?.status === "found";
  const record = launch?.canonicalPool ?? null;
  const requested = current >= stageIndex("request");
  const enforced = current >= stageIndex("enforce");

  return (
    <Shell id="demo">
      <Terminal translate="no">
        <Bar>
          <TerminalId><span />KLAMP / PROTOCOL TERMINAL / SESSION 01</TerminalId>
          <Network>SEPOLIA · 11155111</Network>
        </Bar>
        <Grid>
          <Rail>
            {steps.map((item) => {
              const idx = stageIndex(item.stage);
              return <Step key={item.stage} active={stage === item.stage} done={current > idx}><Dot active={stage === item.stage} done={current > idx} /><StepLabel><span>{item.index}</span>{item.title}</StepLabel><StepMeta>{item.meta}</StepMeta></Step>;
            })}
          </Rail>
          <Stage aria-live="polite">
            <StageCode>{view.code}</StageCode>
            <StageTitle>{view.title}</StageTitle>
            <StageDetail>{view.detail}</StageDetail>
            <Flow>
              <FlowCard>
                <FlowLabel>Canonical pool</FlowLabel>
                <Fee style={{ fontSize: 25 }}>{resolved ? "MATCH" : "PENDING"}</Fee>
                <FlowValue>{record?.ensName ?? "0x<token>.tokens.klamp.eth"}<br />{resolved ? `${canonical.source} · chain / manager / poolId` : "strict ENSv2 resolution required"}</FlowValue>
              </FlowCard>
              <Arrow>→</Arrow>
              <FlowCard danger={requested && !enforced}>
                <FlowLabel>Logic request · mock</FlowLabel>
                <Fee>{requested ? "30.00%" : "—"}</Fee>
                <FlowValue>{requested ? "beforeSwap fee override" : "waiting for hook call"}<br />{requested ? "3,000 bps" : "no request"}</FlowValue>
              </FlowCard>
              <Arrow>→</Arrow>
              <FlowCard accent={enforced}>
                <FlowLabel>Klamp applied fee · mock</FlowLabel>
                <Fee style={{ color: enforced ? colors.primary : colors.textPrimary }}>{enforced ? "1.00%" : "—"}</Fee>
                <FlowValue>{enforced ? "min(3,000, 100 bps)" : `cap · ${attestation?.capBps ?? 100} bps`}<br />{enforcement ? "quote protected" : "immutable proxy cap"}</FlowValue>
              </FlowCard>
            </Flow>
            <Footer>
              <Readout>
                tx <span>{launch ? `${launch.txHash.slice(0, 10)}…${launch.txHash.slice(-6)}` : "not submitted"}</span><br />
                issuer <span>{record ? `${record.issuerProof} · ${record.issuer.slice(0, 10)}…${record.issuer.slice(-6)}` : "awaiting issuer proof"}</span><br />
                route <span>{comparison?.status === "match" ? `match · ${comparison.source}` : comparison?.status ?? "pending"}</span>
              </Readout>
              <Actions>
                {stage !== "idle" && <Reset onClick={reset}>Reset</Reset>}
                <Run onClick={() => runDemo()} disabled={busy}>{busy ? "Running…" : stage === "complete" ? "Run again" : "Run demo"}</Run>
              </Actions>
            </Footer>
          </Stage>
        </Grid>
      </Terminal>
    </Shell>
  );
}
