import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rizup — 夢を、一人で抱えなくていい。",
  description: "毎日成長が見える、前向きな人だけが集まるSNS",
  manifest: "/manifest.json",
  themeColor: "#6ecbb0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
