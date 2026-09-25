"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { DemoTerminal } from "@/components/demo/DemoTerminal";
import { colors, layout, mono } from "@/styles/tokens";

const Nav = styled.header`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 22px 24px; display: flex; align-items: center; justify-content: space-between; @media (max-width: 620px) { padding: 18px 16px; }`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 780; letter-spacing: -.025em;`;
const NavMeta = styled.div`display: flex; align-items: center; gap: 22px; font: 600 11px/1 ${mono}; color: ${colors.textSecondary}; a:hover { color: ${colors.textPrimary}; } @media (max-width: 540px) { a:first-of-type { display: none; } }`;
const Status = styled.span`display: inline-flex; align-items: center; gap: 7px; &::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: ${colors.success}; }`;

const Hero = styled.main`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 114px 24px 92px; @media (max-width: 720px) { padding: 72px 16px 64px; }`;
const HeroIdentity = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) clamp(160px, 18vw, 224px); gap: clamp(34px, 5vw, 72px); align-items: center; @media (max-width: 900px) { grid-template-columns: 1fr; }`;
const HeroCopy = styled.div`min-width: 0;`;
const HeroMark = styled(Mark)`width: 100%; height: auto; justify-self: end; @media (max-width: 900px) { display: none; }`;
const Kicker = styled.div`display: flex; align-items: center; gap: 12px; font: 650 11px/1 ${mono}; letter-spacing: .08em; color: ${colors.primary}; &::before { content: ""; display: block; width: 28px; height: 2px; background: ${colors.primary}; }`;
const Headline = styled.h1`font-size: clamp(49px, 7.7vw, 96px); line-height: .94; letter-spacing: -.067em; margin: 30px 0 32px; max-width: 900px; font-weight: 730; span { color: ${colors.primary}; }`;
const Intro = styled.div`display: grid; grid-template-columns: minmax(0, 610px) 1fr; gap: 60px; align-items: end; @media (max-width: 800px) { grid-template-columns: 1fr; gap: 34px; }`;
const Lead = styled.p`font-size: clamp(18px, 2.2vw, 25px); line-height: 1.45; letter-spacing: -.023em; color: ${colors.textSecondary}; margin: 0;`;
const HeroAction = styled.a`justify-self: end; display: inline-flex; align-items: center; justify-content: space-between; gap: 35px; min-width: 205px; padding: 15px 17px; border: 1px solid ${colors.textPrimary}; border-radius: 7px; font: 700 12px/1 ${mono}; transition: background .15s, color .15s; &:hover { background: ${colors.textPrimary}; color: white; } @media (max-width: 800px) { justify-self: start; }`;

const Proof = styled.section`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 46px; display: grid; grid-template-columns: repeat(3, 1fr); @media (max-width: 720px) { padding: 0 16px 32px; grid-template-columns: 1fr; }`;
const ProofCell = styled.div`border-top: 1px solid ${colors.borderStrong}; padding: 19px 4px 16px; &:not(:last-child) { margin-right: 28px; } @media (max-width: 720px) { margin-right: 0 !important; }`;
const ProofLabel = styled.div`font: 650 10px/1 ${mono}; letter-spacing: .08em; color: ${colors.textMuted}; margin-bottom: 10px;`;
const ProofValue = styled.div`font-size: 15px; line-height: 1.45; letter-spacing: -.01em;`;

const Story = styled.section`border-top: 1px solid ${colors.border}; border-bottom: 1px solid ${colors.border}; background: ${colors.surface}; margin-bottom: 92px;`;
const StoryInner = styled.div`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 82px 24px; display: grid; grid-template-columns: 1fr 1.4fr; gap: 90px; @media (max-width: 760px) { padding: 60px 16px; grid-template-columns: 1fr; gap: 40px; }`;
const SectionLabel = styled.div`font: 650 11px/1 ${mono}; color: ${colors.primary}; letter-spacing: .08em;`;
const StoryTitle = styled.h2`font-size: clamp(34px, 5vw, 58px); line-height: 1.02; letter-spacing: -.05em; margin: 15px 0 0;`;
const Principles = styled.div`display: grid; gap: 0;`;
const Principle = styled.div`display: grid; grid-template-columns: 42px 1fr; gap: 16px; border-top: 1px solid ${colors.border}; padding: 20px 0; &:last-of-type { border-bottom: 1px solid ${colors.border}; }`;
const Number = styled.div`font: 600 11px ${mono}; color: ${colors.primary};`;
const PrincipleText = styled.div`h3 { font-size: 17px; margin: 0 0 6px; } p { margin: 0; color: ${colors.textSecondary}; line-height: 1.55; font-size: 14px; }`;

const DemoIntro = styled.div`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 24px 31px; display: flex; justify-content: space-between; align-items: end; gap: 30px; h2 { margin: 12px 0 0; font-size: clamp(31px, 5vw, 58px); letter-spacing: -.05em; line-height: 1.04; } p { max-width: 430px; margin: 0; color: ${colors.textSecondary}; font-size: 14px; line-height: 1.6; } @media (max-width: 720px) { padding: 0 16px 26px; display: block; p { margin-top: 20px; } }`;
const Footer = styled.footer`max-width: ${layout.maxWidth}; margin: 0 auto; padding: 29px 24px 48px; border-top: 1px solid ${colors.border}; display: flex; justify-content: space-between; color: ${colors.textMuted}; font: 500 10px/1.5 ${mono}; @media (max-width: 620px) { margin: 0 16px; padding: 24px 0 36px; flex-direction: column; gap: 8px; }`;
const FooterBrand = styled.span`display: inline-flex; align-items: center; gap: 8px;`;

export default function Home() {
  return (
    <>
      <Nav>
        <Brand href="#top"><Mark />KLAMP</Brand>
        <NavMeta><a href="#architecture">Architecture</a><a href="#demo">Demo</a><Status>Sepolia ready</Status></NavMeta>
      </Nav>
      <Hero id="top">
        <HeroIdentity>
          <HeroCopy>
            <Kicker>CANONICAL POOL IDENTITY · VERIFIABLE FEE BOUNDS</Kicker>
            <Headline>Fees should be<br />a promise, <span>not a trap.</span></Headline>
          </HeroCopy>
          <HeroMark size={224} priority />
        </HeroIdentity>
        <Intro>
          <Lead>Klamp proves who issued a token, resolves its permanent canonical pool through ENSv2, and mechanically caps what a hook can charge.</Lead>
          <HeroAction href="#demo"><span>RUN PROTOCOL</span><span>↘</span></HeroAction>
        </Intro>
      </Hero>
      <Proof>
        <ProofCell><ProofLabel>CRYPTOGRAPHIC ISSUER</ProofLabel><ProofValue>The token address proves who may declare its pool.</ProofValue></ProofCell>
        <ProofCell><ProofLabel>IMMUTABLE LIMIT</ProofLabel><ProofValue>The proxy cap cannot be raised after deployment.</ProofValue></ProofCell>
        <ProofCell><ProofLabel>ZERO USER WORK</ProofLabel><ProofValue>No warnings, signatures, or trust decisions at swap time.</ProofValue></ProofCell>
      </Proof>
      <Story id="architecture"><StoryInner>
        <div><SectionLabel>THE GUARANTEE</SectionLabel><StoryTitle>Trust the path.<br />Constrain the hook.</StoryTitle></div>
        <Principles>
          <Principle><Number>01</Number><PrincipleText><h3>Only the issuer can declare</h3><p>CREATE2 or LiquidityLauncher graffiti proves the issuer. The registrar also checks token deployment, pool initialization, token inclusion, and the write-once rule.</p></PrincipleText></Principle>
          <Principle><Number>02</Number><PrincipleText><h3>ENSv2 makes the claim portable</h3><p>A single wildcard resolver serves every token under tokens.klamp.eth. The client distinguishes found, missing, invalid, unavailable, and ambiguous instead of treating every failure as absence.</p></PrincipleText></Principle>
          <Principle><Number>03</Number><PrincipleText><h3>Code enforces the promise</h3><p>CappedHookProxy returns the lower of the requested fee and its immutable cap. A 30% request becomes 1% onchain.</p></PrincipleText></Principle>
        </Principles>
      </StoryInner></Story>
      <DemoIntro><div><SectionLabel>LIVE HAPPY PATH</SectionLabel><h2>Watch the clamp engage.</h2></div><p>Phase 1 mirrors the implemented SDK: strict ENS resolution and route match. The fee-cap scene remains an explicit Phase 2 mock.</p></DemoIntro>
      <DemoTerminal />
      <Footer><FooterBrand><Mark size={20} />KLAMP · ETHGLOBAL TOKYO 2026</FooterBrand><span>ENSv2 IDENTITY / UNISWAP v4 ENFORCEMENT</span></Footer>
    </>
  );
}
