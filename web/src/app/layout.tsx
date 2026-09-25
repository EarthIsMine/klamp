import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klamp — Verifiable fee bounds for Uniswap v4",
  description: "A protocol terminal that verifies canonical pools and enforces immutable hook fee caps.",
  icons: {
    icon: [{ url: "/klamp.svg", type: "image/svg+xml" }],
    shortcut: "/klamp.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
