import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protocol trace — Klamp",
  description: "Trace a path A launch, the canonical pool lookup in ENSv2, the route verdict, the requote and the verified swap.",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
