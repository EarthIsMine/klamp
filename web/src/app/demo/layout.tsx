import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protocol trace — Klamp",
  description: "Trace Klamp canonical pool verification and a simulated fee-cap response.",
};

export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
