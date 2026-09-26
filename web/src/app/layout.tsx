import type { Metadata } from "next";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klamp — Canonical Uniswap v4 pools in ENSv2",
  description: "Token issuers declare their canonical Uniswap v4 pool once in ENSv2, so routers skip look-alike hook pools.",
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
