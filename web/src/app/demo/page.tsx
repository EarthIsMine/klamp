"use client";

import styled from "@emotion/styled";
import { Mark } from "@/components/brand/Mark";
import { DemoTerminal } from "@/components/demo/DemoTerminal";
import { colors, layout } from "@/styles/tokens";

const Screen = styled.main`
  height: 100dvh; min-height: 100dvh; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden;
  @media (max-width: 820px), (max-height: 640px) { height: auto; overflow: visible; }
`;
const Header = styled.header`min-width: 0; border-bottom: 1px solid ${colors.border}; background: ${colors.background};`;
const HeaderInner = styled.div`
  max-width: ${layout.maxWidth}; min-height: 62px; margin: 0 auto; padding: 0 24px;
  display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px;
  @media (max-width: 820px) { min-height: 56px; padding: 0 16px; grid-template-columns: 1fr auto; }
`;
const Brand = styled.a`display: flex; align-items: center; gap: 10px; font-weight: 700; letter-spacing: -.02em; justify-self: start;`;
const Back = styled.a`
  justify-self: end; color: ${colors.textSecondary}; font-size: 13px; padding: 5px 0; border-bottom: 1px solid ${colors.borderStrong};
  &:hover { color: ${colors.textPrimary}; border-color: ${colors.textPrimary}; }
`;

export default function DemoPage() {
  return (
    <Screen>
      <Header>
        <HeaderInner>
          <Brand href="/"><Mark />Klamp</Brand>
          <Back href="/">Project overview</Back>
        </HeaderInner>
      </Header>
      <DemoTerminal />
    </Screen>
  );
}
