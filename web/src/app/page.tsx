"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { colors, layout, mono } from "@/styles/tokens";

const omz = {
  background: "#002B36",
  surface: "#073642",
  muted: "#839496",
  text: "#EEE8D5",
  cyan: "#2AA198",
  green: "#859900",
  yellow: "#B58900",
  blue: "#268BD2",
} as const;

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
  display: inline-flex; align-items: center; margin-top: 36px; min-height: 44px; padding: 0 17px;
  background: ${colors.primary}; color: ${colors.textPrimary}; font-size: 14px; font-weight: 650;
  &:hover { background: ${colors.primaryHover}; color: white; }
`;

const ProtocolTerminal = styled.aside`
  min-width: 0; overflow: hidden; border: 1px solid #B8B8B5; border-radius: 10px;
  background: ${omz.background}; color: ${omz.text}; font-family: ${mono};
  box-shadow: 0 18px 45px rgba(32, 32, 30, .14), 0 2px 7px rgba(32, 32, 30, .1);
`;
const MacTitleBar = styled.div`
  min-height: 30px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 11px;
  background: #EAEAE8; border-bottom: 1px solid #C8C8C5; color: #4F4F4C;
  font: 500 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`;
const WindowControls = styled.div`
  display: flex; align-items: center; gap: 7px;
  i { display: block; width: 10px; height: 10px; border-radius: 50%; }
  i:nth-of-type(1) { background: #FF5F57; border: 1px solid #E0443E; }
  i:nth-of-type(2) { background: #FEBC2E; border: 1px solid #DFA123; }
  i:nth-of-type(3) { background: #28C840; border: 1px solid #1AAB29; }
`;
const MacTitle = styled.span`grid-column: 2; white-space: nowrap;`;
const TuiBar = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 10px 13px;
  background: ${omz.surface}; color: ${omz.cyan}; font-size: 11px; line-height: 1;
  span:last-of-type { color: ${omz.blue}; }
`;
const TuiTarget = styled.div`
  display: grid; grid-template-columns: 78px minmax(0, 1fr) auto; gap: 12px; padding: 14px 13px; font-size: 11px; line-height: 1.4;
  span:first-of-type { color: ${omz.muted}; }
  span:last-of-type { color: ${omz.cyan}; }
  code { color: ${omz.text}; font: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @media (max-width: 520px) { grid-template-columns: 60px minmax(0, 1fr); span:last-of-type { display: none; } }
`;
const TuiSection = styled.section`border-top: 1px solid ${omz.muted};`;
const TuiSectionHead = styled.h2`
  display: flex; align-items: center; gap: 10px; margin: 0; padding: 8px 13px; background: ${omz.surface};
  color: ${omz.text}; font: 500 11px/1 ${mono};
  span { color: ${omz.yellow}; }
`;
const TuiRows = styled.div`padding: 12px 13px 14px; display: grid; gap: 9px;`;
const TuiRow = styled.div`
  display: grid; grid-template-columns: 128px minmax(0, 1fr) auto; gap: 12px; align-items: baseline; font-size: 11px; line-height: 1.45;
  span:first-of-type { color: ${omz.muted}; }
  code { color: ${omz.text}; font: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  span:last-of-type { color: ${omz.green}; }
  @media (max-width: 520px) { grid-template-columns: 106px minmax(0, 1fr); span:last-of-type { display: none; } }
`;
const TuiChecks = styled.div`
  display: grid; grid-template-columns: repeat(3, 1fr); border-bottom: 1px solid ${omz.muted};
  div { display: flex; justify-content: space-between; gap: 12px; padding: 11px 13px; color: ${omz.text}; font-size: 11px; }
  div + div { border-left: 1px solid ${omz.muted}; }
  strong { color: ${omz.green}; font-weight: 600; }
  @media (max-width: 520px) { grid-template-columns: 1fr; div + div { border-left: 0; border-top: 1px solid ${omz.muted}; } }
`;
const TuiStatus = styled.div`
  display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; background: ${omz.surface}; color: ${omz.text}; font-size: 11px;
  strong { align-self: stretch; display: flex; align-items: center; padding: 12px 13px; background: ${omz.green}; color: ${omz.background}; font-weight: 700; }
  span { padding: 0 13px; }
  span:last-of-type { color: ${omz.cyan}; }
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
const FeeCapNote = styled.aside`
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
            <Lead>Klamp records it in ENSv2. Routers read it with standard ENS tools and requote around look-alike hook pools before the trader signs.</Lead>
            <HeroAction href="/demo/">View a verification trace</HeroAction>
          </HeroCopy>
          <ProtocolTerminal aria-label="Illustrative Klamp verification output">
            <MacTitleBar>
              <WindowControls aria-hidden="true"><i /><i /><i /></WindowControls>
              <MacTitle>klamp — zsh — 80×24</MacTitle>
            </MacTitleBar>
            <TuiBar><span>klamp.verify</span><span>sepolia:11155111</span></TuiBar>
            <TuiTarget><span>target</span><code>KHOOK 0x4cB41E85…eE948b96</code><span>0.0005 ETH</span></TuiTarget>
            <TuiSection>
              <TuiSectionHead><span>01</span>resolve canonical record</TuiSectionHead>
              <TuiRows>
                <TuiRow><span>ensv2</span><code>0x4cb4…8b96.tokens.klamp.eth</code><span>[registered]</span></TuiRow>
                <TuiRow><span>resolver</span><code>0xa783…dC18 (pinned)</code><span>[ok]</span></TuiRow>
                <TuiRow><span>poolId</span><code>0xcd97…95f6</code><span>[ok]</span></TuiRow>
                <TuiRow><span>text vs data</span><code>PoolKey hash</code><span>[ok]</span></TuiRow>
              </TuiRows>
            </TuiSection>
            <TuiSection>
              <TuiSectionHead><span>02</span>judge quoted route</TuiSectionHead>
              <TuiChecks><div><span>static</span><strong>no</strong></div><div><span>declared</span><strong>no</strong></div><div><span>verdict</span><strong>requote</strong></div></TuiChecks>
              <TuiRows><TuiRow><span>requote</span><code>declared pool · 196,119.71</code><span>[verify ok]</span></TuiRow></TuiRows>
            </TuiSection>
            <TuiStatus><strong>REQUOTE</strong><span>undeclared pool skipped</span><span>exit 0</span></TuiStatus>
          </ProtocolTerminal>
        </HeroGrid>
      </Hero>
      <Boundary id="architecture">
        <BoundaryInner>
          <BoundaryIntro>
            <h2>A precise boundary</h2>
            <p>The contract establishes who may write a canonical pool record, once. The client resolves that record, judges the quoted route, requotes when needed and checks the calldata it signs.</p>
          </BoundaryIntro>
          <BoundaryGrid>
            <BoundaryColumn>
              <h3>The contract proves</h3>
              <ul>
                <li>Issuer authority: the CREATE2 launchpad, or the Pools.trade creator via LiquidityLauncher graffiti (direct or through a disposable contract)</li>
                <li>The token is deployed, is in the PoolKey, and the pool is initialized</li>
                <li>The canonical record can only be written once; no upgrades</li>
              </ul>
            </BoundaryColumn>
            <BoundaryColumn>
              <h3>The client checks</h3>
              <ul>
                <li>The pinned resolver answers, and the text and data records agree</li>
                <li>Declared and static pools pass; other hook pools are requoted</li>
                <li>The Universal Router calldata names the judged PoolKey before signing</li>
              </ul>
            </BoundaryColumn>
          </BoundaryGrid>
          <FeeCapNote>
            <h3>Roadmap: capped hooks</h3>
            <p>A <strong>CappedHookProxy</strong> would let hook pools that are not declared still route, by recording an immutable fee cap under <strong>hooks.klamp.eth</strong>. It is designed, not built: nothing in this demo or the deployed contracts enforces a fee cap.</p>
          </FeeCapNote>
        </BoundaryInner>
      </Boundary>
      <Footer><FooterBrand><Mark size={20} />Klamp, ETHGlobal Tokyo 2026</FooterBrand><span>Canonical pools in ENSv2 for Uniswap v4 routing</span></Footer>
    </>
  );
}
