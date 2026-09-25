"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { DemoTerminal } from "@/components/demo/DemoTerminal";
import { colors, layout, mono } from "@/styles/tokens";

const Header = styled.header`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; @media (max-width: 620px) { padding: 18px 16px; }`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 780; letter-spacing: -.025em;`;
const Back = styled.a`font: 600 11px/1 ${mono}; color: ${colors.textSecondary}; border-bottom: 1px solid ${colors.borderStrong}; padding-bottom: 5px; &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }`;
const Intro = styled.main`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 94px 24px 34px; display: grid; grid-template-columns: minmax(0, 1fr) 430px; align-items: end; gap: 64px; h1 { margin: 0; font-size: clamp(42px, 6vw, 72px); line-height: 1; letter-spacing: -.055em; } p { margin: 0; color: ${colors.textSecondary}; font-size: 14px; line-height: 1.65; } @media (max-width: 720px) { padding: 64px 16px 26px; grid-template-columns: 1fr; gap: 20px; }`;
const Scope = styled.div`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 30px; display: flex; gap: 8px; flex-wrap: wrap; @media (max-width: 720px) { padding: 0 16px 24px; }`;
const ScopeItem = styled.span`border: 1px solid ${colors.border}; padding: 7px 9px; font: 500 10px/1 ${mono}; color: ${colors.textSecondary};`;
const Footer = styled.footer`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 29px 24px 48px; border-top: 1px solid ${colors.border}; display: flex; justify-content: space-between; color: ${colors.textMuted}; font: 500 10px/1.5 ${mono}; @media (max-width: 620px) { margin: 0 16px; padding: 24px 0 36px; flex-direction: column; gap: 8px; }`;
const FooterBrand = styled.span`display: inline-flex; align-items: center; gap: 8px;`;

export default function DemoPage() {
  return (
    <>
      <Header>
        <Brand href="/"><Mark />KLAMP</Brand>
        <Back href="/">← Project overview</Back>
      </Header>
      <Intro>
        <h1>Protocol trace</h1>
        <p>Replay the implemented Phase 1 resolution and route comparison, followed by an explicitly simulated Phase 2 fee-cap interaction.</p>
      </Intro>
      <Scope aria-label="Demo scope">
        <ScopeItem>Phase 1 · implemented</ScopeItem>
        <ScopeItem>Phase 2 · mock</ScopeItem>
        <ScopeItem>Network · Sepolia fixture</ScopeItem>
      </Scope>
      <DemoTerminal />
      <Footer><FooterBrand><Mark size={20} />KLAMP · ETHGLOBAL TOKYO 2026</FooterBrand><span>ENSv2 IDENTITY / UNISWAP v4 ENFORCEMENT</span></Footer>
    </>
  );
}
