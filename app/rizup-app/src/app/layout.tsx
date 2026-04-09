import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rizup — 夢を、一人で抱えなくていい。",
  description: "毎日成長が見える、前向きな人だけが集まるSNS",
  manifest: "/manifest.json",
  themeColor: "#6ecbb0",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
          // iOS keyboard fix: reset scroll/height when keyboard closes
          if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
              if (window.visualViewport.height >= document.documentElement.clientHeight * 0.8) {
                window.scrollTo(0, 0);
                document.body.style.height = '';
              }
            });
          }
        `}} />
      </body>
    </html>
  );
}
