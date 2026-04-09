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
          // iOS keyboard fix: dismiss keyboard on non-input tap & reset viewport
          document.addEventListener('touchend', function(e) {
            var tag = e.target && e.target.tagName;
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
              if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                document.activeElement.blur();
              }
            }
          });
          if (window.visualViewport) {
            var initialHeight = window.visualViewport.height;
            window.visualViewport.addEventListener('resize', function() {
              if (window.visualViewport.height >= initialHeight * 0.9) {
                setTimeout(function() { window.scrollTo(0, 0); }, 50);
                document.body.style.height = '';
              }
            });
          }
        `}} />
      </body>
    </html>
  );
}
