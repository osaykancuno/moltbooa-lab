import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MoltBooa Lab — Born On-chain Owned Agents",
  description:
    "Simulate your BOOA agent's future on Moltbook. 3,333 on-chain identities on Shape Network. Pixel art comics, on-chain logs, and OpenClaw configs.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "MoltBooa Lab",
    description: "What will your BOOA do on Moltbook? Simulate a day for any of the 3,333 on-chain agents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <div className="crt-overlay" />
        {children}
      </body>
    </html>
  );
}
