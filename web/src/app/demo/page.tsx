"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { DemoTerminal } from "@/components/demo/DemoTerminal";
import { colors, layout } from "@/styles/tokens";

const Header = styled.header`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 24px; display: flex; align-items: center; justify-content: space-between;
  @media (max-width: 620px) { padding: 18px 16px; }
`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.02em;`;
const Back = styled.a`
  color: ${colors.textSecondary}; font-size: 13px; padding: 5px 0; border-bottom: 1px solid ${colors.borderStrong};
  &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
`;
const Intro = styled.main`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 92px 24px 42px;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, 480px); align-items: end; gap: 72px;
  h1 { margin: 0; max-width: 680px; font-size: clamp(40px, 5.2vw, 64px); line-height: .98; letter-spacing: -.05em; font-weight: 650; }
  p { margin: 0; color: ${colors.textSecondary}; font-size: 16px; line-height: 1.65; }
  @media (max-width: 760px) { padding: 62px 16px 32px; grid-template-columns: 1fr; gap: 22px; }
`;
const Scope = styled.dl`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 34px; display: grid; grid-template-columns: repeat(3, 1fr);
  div { border-top: 1px solid ${colors.borderStrong}; padding: 13px 18px 0 0; }
  dt { color: ${colors.textMuted}; font-size: 12px; margin-bottom: 4px; }
  dd { margin: 0; font-size: 13px; font-weight: 600; }
  @media (max-width: 720px) { padding: 0 16px 28px; grid-template-columns: 1fr; gap: 14px; }
`;
const Footer = styled.footer`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 28px 24px 42px; border-top: 1px solid ${colors.border};
  display: flex; justify-content: space-between; color: ${colors.textMuted}; font-size: 12px;
  @media (max-width: 620px) { margin: 0 16px; padding: 24px 0 34px; flex-direction: column; gap: 8px; }
`;
const FooterBrand = styled.span`display: inline-flex; align-items: center; gap: 8px;`;

export default function DemoPage() {
  return (
    <>
      <Header>
        <Brand href="/"><Mark />Klamp</Brand>
        <Back href="/">Project overview</Back>
      </Header>
      <Intro>
        <h1>Verify a route, then test the cap.</h1>
        <p>Run the implemented canonical-pool lookup and route comparison. The final fee interaction is a clearly separated preview of the proposed CappedHook.</p>
      </Intro>
      <Scope aria-label="Demo scope">
        <div><dt>Phase 1</dt><dd>Contract-backed verification</dd></div>
        <div><dt>Phase 2</dt><dd>Local simulation</dd></div>
        <div><dt>Network</dt><dd>Sepolia fixture</dd></div>
      </Scope>
      <DemoTerminal />
      <Footer><FooterBrand><Mark size={20} />Klamp, ETHGlobal Tokyo 2026</FooterBrand><span>ENSv2 identity and Uniswap v4 enforcement</span></Footer>
    </>
  );
}
