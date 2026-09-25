"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { colors, layout, mono } from "@/styles/tokens";

const Nav = styled.header`position: absolute; inset: 0 0 auto; z-index: 10; width: 100%; max-width: ${layout.maxWidth}; margin: 0 auto; padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; @media (max-width: 620px) { padding: 18px 16px; }`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 780; letter-spacing: -.025em;`;
const NavMeta = styled.div`display: flex; align-items: center; gap: 22px; font: 600 11px/1 ${mono}; color: ${colors.textSecondary}; a:hover { color: ${colors.textPrimary}; } @media (max-width: 540px) { a:first-of-type { display: none; } }`;

const Hero = styled.main`min-height: 100dvh; max-width: ${layout.maxWidth}; margin: 0 auto; padding: 112px 24px 72px; display: grid; align-items: center; @media (max-width: 720px) { padding: 92px 16px 54px; }`;
const HeroIdentity = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: clamp(44px, 7vw, 96px); align-items: start; @media (max-width: 900px) { grid-template-columns: 1fr; gap: 46px; }`;
const HeroCopy = styled.div`min-width: 0;`;
const Headline = styled.h1`font-size: clamp(46px, 6.3vw, 76px); line-height: .98; letter-spacing: -.058em; margin: 0 0 28px; max-width: 760px; font-weight: 720;`;
const Lead = styled.p`font-size: clamp(18px, 2vw, 23px); line-height: 1.5; letter-spacing: -.02em; color: ${colors.textSecondary}; margin: 0; max-width: 690px;`;
const HeroAction = styled.a`display: inline-flex; align-items: center; gap: 22px; margin-top: 34px; padding: 12px 0 10px; border-bottom: 1px solid ${colors.textPrimary}; font: 650 12px/1 ${mono}; transition: color .15s, border-color .15s; &:hover { color: ${colors.primary}; border-color: ${colors.primary}; }`;
const HeroAside = styled.aside`border-top: 1px solid ${colors.borderStrong};`;
const HeroMark = styled(Mark)`display: block; width: 136px; height: auto; margin: 0 0 34px auto; @media (max-width: 900px) { display: none; }`;
const Facts = styled.dl`margin: 0;`;
const Fact = styled.div`display: grid; grid-template-columns: 88px 1fr; gap: 14px; padding: 13px 0; border-bottom: 1px solid ${colors.border}; font-size: 12px; line-height: 1.5; dt { color: ${colors.textMuted}; font-family: ${mono}; } dd { margin: 0; color: ${colors.textSecondary}; }`;

const Story = styled.section`border-top: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; background: ${colors.surface}; margin-bottom: 92px;`;
const StoryInner = styled.div`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 74px 24px; display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 90px; @media (max-width: 760px) { padding: 56px 16px; grid-template-columns: 1fr; gap: 36px; }`;
const StoryTitle = styled.h2`font-size: clamp(30px, 4vw, 46px); line-height: 1.08; letter-spacing: -.045em; margin: 0 0 18px;`;
const StorySummary = styled.p`font-size: 14px; line-height: 1.65; color: ${colors.textSecondary}; margin: 0;`;
const Principles = styled.div`display: grid; gap: 0;`;
const Principle = styled.div`display: grid; grid-template-columns: minmax(145px, .55fr) 1fr; gap: 28px; border-top: 1px solid ${colors.border}; padding: 21px 0; &:last-of-type { border-bottom: 1px solid ${colors.border}; } @media (max-width: 560px) { grid-template-columns: 1fr; gap: 7px; }`;
const PrincipleText = styled.div`display: contents; h3 { font-size: 14px; line-height: 1.45; margin: 0; } p { margin: 0; color: ${colors.textSecondary}; line-height: 1.6; font-size: 14px; }`;

const Footer = styled.footer`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 29px 24px 48px; border-top: 1px solid ${colors.border}; display: flex; justify-content: space-between; color: ${colors.textMuted}; font: 500 10px/1.5 ${mono}; @media (max-width: 620px) { margin: 0 16px; padding: 24px 0 36px; flex-direction: column; gap: 8px; }`;
const FooterBrand = styled.span`display: inline-flex; align-items: center; gap: 8px;`;

export default function Home() {
  return (
    <>
      <Nav>
        <Brand href="#top"><Mark />KLAMP</Brand>
        <NavMeta><a href="#architecture">Architecture</a><a href="/demo/">Demo</a></NavMeta>
      </Nav>
      <Hero id="top">
        <HeroIdentity>
          <HeroCopy>
            <Headline>Verify the pool.<br />Constrain the fee.</Headline>
            <Lead>Klamp records a token issuer&apos;s canonical Uniswap v4 pool through ENSv2, then gives clients a strict route-verification result before execution.</Lead>
            <HeroAction href="/demo/"><span>Open the protocol trace</span><span>→</span></HeroAction>
          </HeroCopy>
          <HeroAside>
            <HeroMark size={136} priority />
            <Facts>
              <Fact><dt>Network</dt><dd>Sepolia · chain 11155111</dd></Fact>
              <Fact><dt>Phase 1</dt><dd>Canonical pool identity and route comparison</dd></Fact>
              <Fact><dt>Phase 2</dt><dd>Fee-cap interaction shown as a mock</dd></Fact>
            </Facts>
          </HeroAside>
        </HeroIdentity>
      </Hero>
      <Story id="architecture"><StoryInner>
        <div><StoryTitle>Protocol boundary</StoryTitle><StorySummary>Klamp separates what the current contracts verify from what remains client policy or a Phase 2 design.</StorySummary></div>
        <Principles>
          <Principle><PrincipleText><h3>Issuer declaration</h3><p>CREATE2 or LiquidityLauncher graffiti proves who may record the pool. Registration also checks deployment, token inclusion, pool initialization, and the write-once rule.</p></PrincipleText></Principle>
          <Principle><PrincipleText><h3>Resolver output</h3><p>The SDK returns found, missing, invalid, unavailable, or ambiguous. Failed resolution is never silently presented as an absent record.</p></PrincipleText></Principle>
          <Principle><PrincipleText><h3>Client comparison</h3><p>Every declared route branch that touches the token must match chain, PoolManager, and PoolId. Opaque execution calldata is outside this guarantee.</p></PrincipleText></Principle>
          <Principle><PrincipleText><h3>Fee cap preview</h3><p>The 30% request and 1% applied fee illustrate the Phase 2 CappedHook design. That enforcement is not part of the current contract build.</p></PrincipleText></Principle>
        </Principles>
      </StoryInner></Story>
      <Footer><FooterBrand><Mark size={20} />KLAMP · ETHGLOBAL TOKYO 2026</FooterBrand><span>ENSv2 IDENTITY / UNISWAP v4 ENFORCEMENT</span></Footer>
    </>
  );
}
