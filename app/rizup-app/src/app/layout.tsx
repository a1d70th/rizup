import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rizup — 毎日1%の複利成長",
  description: "朝夜ジャーナリング × ビジョン × 習慣。毎日の1%が1年で37倍になる。",
  manifest: "/manifest.json",
  themeColor: "#6ecbb0",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rizup",
  },
  icons: {
    icon: "/sho.png",
    apple: "/sho.png",
  },
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
          // iOS: dismiss keyboard when tapping outside input fields
          document.addEventListener('touchend', function(e) {
            var tag = e.target && e.target.tagName;
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !e.target.closest('label')) {
              if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
              }
            }
          });
        `}} />
      </body>
    </html>
  );
}
