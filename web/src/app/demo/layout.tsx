import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protocol trace — Klamp",
  description: "Trace a Klamp launch, ENSv2 route verification, hook attestation, and fee-cap response.",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
