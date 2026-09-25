"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { colors, layout, mono } from "@/styles/tokens";

const Nav = styled.header`
  position: absolute; inset: 0 0 auto; z-index: 10; width: 100%; max-width: ${layout.maxWidth};
  margin: 0 auto; padding: 24px; display: flex; align-items: center; justify-content: space-between;
  @media (max-width: 620px) { padding: 18px 16px; }
`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.02em;`;
const NavLinks = styled.nav`
  display: flex; align-items: center; gap: 28px; color: ${colors.textSecondary}; font-size: 13px;
  a { padding: 5px 0; border-bottom: 1px solid transparent; }
  a:hover { color: ${colors.textPrimary}; border-color: ${colors.borderStrong}; }
  @media (max-width: 540px) { a:first-of-type { display: none; } }
`;

const Hero = styled.main`
  min-height: 100dvh; max-width: ${layout.maxWidth}; margin: 0 auto; padding: 116px 24px 68px;
  display: grid; align-items: center;
  @media (max-width: 720px) { padding: 96px 16px 54px; }
`;
const HeroGrid = styled.div`
  display: grid; grid-template-columns: minmax(0, .92fr) minmax(460px, 1.08fr); gap: clamp(54px, 8vw, 112px); align-items: center;
  @media (max-width: 940px) { grid-template-columns: 1fr; gap: 58px; }
`;
const HeroCopy = styled.div`min-width: 0;`;
const Headline = styled.h1`
  font-size: clamp(44px, 5.5vw, 66px); line-height: .98; letter-spacing: -.052em; margin: 0 0 28px;
  max-width: 660px; font-weight: 650;
`;
const Lead = styled.p`
  font-size: clamp(17px, 1.8vw, 21px); line-height: 1.55; letter-spacing: -.015em; color: ${colors.textSecondary};
  margin: 0; max-width: 620px;
`;
const HeroAction = styled.a`
  display: inline-grid; grid-template-columns: 7px auto; align-items: stretch; gap: 13px; margin-top: 36px;
  border: 1px solid ${colors.textPrimary}; min-height: 44px; padding: 0 16px 0 0; font-size: 14px; font-weight: 600;
  span:first-of-type { background: ${colors.primary}; width: 7px; }
  span:last-of-type { display: flex; align-items: center; }
  &:hover { border-color: ${colors.primary}; color: ${colors.primaryHover}; }
`;

const Verification = styled.figure`margin: 0; min-width: 0;`;
const VerificationHead = styled.div`
  display: flex; align-items: baseline; justify-content: space-between; gap: 20px; padding-bottom: 14px;
  border-bottom: 2px solid ${colors.textPrimary};
  h2 { margin: 0; font-size: 16px; letter-spacing: -.01em; }
  span { color: ${colors.textMuted}; font-size: 12px; }
`;
const Compare = styled.div`display: grid; grid-template-columns: minmax(0, 1fr) 72px minmax(0, 1fr); align-items: stretch;`;
const DataColumn = styled.div`padding: 22px 0 18px; min-width: 0;`;
const DataColumnRight = styled(DataColumn)`text-align: right;`;
const DataTitle = styled.h3`font-size: 13px; line-height: 1.3; margin: 0 0 18px; font-weight: 600; color: ${colors.textSecondary};`;
const DataRow = styled.div`
  margin-top: 13px;
  span { display: block; color: ${colors.textMuted}; font-size: 11px; margin-bottom: 4px; }
  code { display: block; color: ${colors.textPrimary}; font: 500 11px/1.45 ${mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
`;
const ClampJoin = styled.div`
  position: relative; display: grid; place-items: center;
  &::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 1px; background: ${colors.primary}; }
  img { position: relative; z-index: 1; background: ${colors.background}; padding: 7px; }
`;
const Match = styled.figcaption`
  border-top: 1px solid ${colors.borderStrong}; padding: 14px 0 0 15px; position: relative; font-size: 13px; color: ${colors.textSecondary};
  &::before { content: ""; position: absolute; left: 0; top: 16px; width: 7px; height: 7px; background: ${colors.primary}; }
  strong { color: ${colors.textPrimary}; font-weight: 650; }
`;

const Boundary = styled.section`border-top: 1px solid ${colors.border}; padding: 92px 24px 100px;`;
const BoundaryInner = styled.div`max-width: ${layout.maxWidth}; margin: 0 auto;`;
const BoundaryIntro = styled.div`
  display: grid; grid-template-columns: 320px minmax(0, 600px); gap: 72px; align-items: start; margin-bottom: 52px;
  h2 { font-size: clamp(32px, 4vw, 48px); line-height: 1; letter-spacing: -.045em; margin: 0; font-weight: 650; }
  p { margin: 2px 0 0; color: ${colors.textSecondary}; font-size: 16px; line-height: 1.65; }
  @media (max-width: 760px) { grid-template-columns: 1fr; gap: 18px; margin-bottom: 38px; }
`;
const BoundaryGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; border-top: 2px solid ${colors.textPrimary};
  @media (max-width: 680px) { grid-template-columns: 1fr; }
`;
const BoundaryColumn = styled.div`
  padding: 28px 34px 32px 0;
  & + & { border-left: 1px solid ${colors.border}; padding-left: 34px; padding-right: 0; }
  h3 { margin: 0 0 22px; font-size: 18px; }
  ul { list-style: none; margin: 0; padding: 0; }
  li { display: grid; grid-template-columns: 9px 1fr; gap: 12px; padding: 9px 0; color: ${colors.textSecondary}; font-size: 14px; line-height: 1.5; }
  li::before { content: ""; width: 5px; height: 5px; margin-top: 8px; background: ${colors.textPrimary}; }
  @media (max-width: 680px) { padding: 26px 0; & + & { border-left: 0; border-top: 1px solid ${colors.border}; padding: 26px 0; } }
`;
const PhaseTwo = styled.aside`
  display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 72px; align-items: baseline;
  border-top: 1px solid ${colors.borderStrong}; margin-top: 26px; padding-top: 24px;
  h3 { margin: 0; font-size: 15px; }
  p { margin: 0; color: ${colors.textSecondary}; line-height: 1.6; font-size: 14px; }
  strong { color: ${colors.primaryHover}; font-weight: 650; }
  @media (max-width: 680px) { grid-template-columns: 1fr; gap: 8px; }
`;
const Footer = styled.footer`
  max-width: ${layout.maxWidth}; margin: 0 auto; padding: 28px 24px 42px; border-top: 1px solid ${colors.border};
  display: flex; justify-content: space-between; color: ${colors.textMuted}; font-size: 12px;
  @media (max-width: 620px) { margin: 0 16px; padding: 24px 0 34px; flex-direction: column; gap: 8px; }
`;
const FooterBrand = styled.span`display: inline-flex; align-items: center; gap: 8px;`;

export default function Home() {
  return (
    <>
      <Nav>
        <Brand href="#top"><Mark />Klamp</Brand>
        <NavLinks aria-label="Primary navigation"><a href="#architecture">How it verifies</a><a href="/demo/">View demo</a></NavLinks>
      </Nav>
      <Hero id="top">
        <HeroGrid>
          <HeroCopy>
            <Headline>A token issuer declares one canonical pool.</Headline>
            <Lead>Klamp lets clients compare every proposed route against that ENSv2 record before execution.</Lead>
            <HeroAction href="/demo/"><span aria-hidden="true" /><span>View a verification trace</span></HeroAction>
          </HeroCopy>
          <Verification>
            <VerificationHead><h2>Canonical route check</h2><span>Illustrative Sepolia fixture</span></VerificationHead>
            <Compare>
              <DataColumn>
                <DataTitle>ENSv2 record</DataTitle>
                <DataRow><span>Chain</span><code>11155111</code></DataRow>
                <DataRow><span>PoolManager</span><code>0xE03A…3543</code></DataRow>
                <DataRow><span>PoolId</span><code>0x91f6…e46b0</code></DataRow>
              </DataColumn>
              <ClampJoin aria-hidden="true"><Mark size={58} priority /></ClampJoin>
              <DataColumnRight>
                <DataTitle>Proposed route</DataTitle>
                <DataRow><span>Chain</span><code>11155111</code></DataRow>
                <DataRow><span>PoolManager</span><code>0xE03A…3543</code></DataRow>
                <DataRow><span>PoolId</span><code>0x91f6…e46b0</code></DataRow>
              </DataColumnRight>
            </Compare>
            <Match><strong>Match.</strong> The route uses the issuer&apos;s recorded pool.</Match>
          </Verification>
        </HeroGrid>
      </Hero>
      <Boundary id="architecture">
        <BoundaryInner>
          <BoundaryIntro>
            <h2>A precise boundary</h2>
            <p>The contract establishes who may write a canonical pool record. The client resolves that record and decides whether a proposed route is safe to continue.</p>
          </BoundaryIntro>
          <BoundaryGrid>
            <BoundaryColumn>
              <h3>The contract proves</h3>
              <ul>
                <li>Issuer authority through CREATE2 or LiquidityLauncher graffiti</li>
                <li>The pool is deployed, initialized, and contains the token</li>
                <li>The canonical record can only be written once</li>
              </ul>
            </BoundaryColumn>
            <BoundaryColumn>
              <h3>The client checks</h3>
              <ul>
                <li>The resolver returns a valid, unambiguous record</li>
                <li>Chain, PoolManager, and PoolId match the proposed route</li>
                <li>Every declared branch that touches the token is checked</li>
              </ul>
            </BoundaryColumn>
          </BoundaryGrid>
          <PhaseTwo>
            <h3>Phase 2 is a simulation</h3>
            <p>The demo shows a CappedHook limiting a <strong>30% request</strong> to a <strong>1% cap</strong>. That enforcement is not part of the current contract build.</p>
          </PhaseTwo>
        </BoundaryInner>
      </Boundary>
      <Footer><FooterBrand><Mark size={20} />Klamp, ETHGlobal Tokyo 2026</FooterBrand><span>ENSv2 identity and Uniswap v4 enforcement</span></Footer>
    </>
  );
}
