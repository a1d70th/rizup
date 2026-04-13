import type { Metadata, Viewport } from "next";
import "./globals.css";
import ToastContainer from "@/components/Toast";

export const metadata: Metadata = {
  title: "Rizup — 毎日1%の複利成長",
  description: "朝夜ジャーナリング × ビジョン × 習慣。毎日の1%が1年で37倍になる自己成長アプリ。",
  applicationName: "Rizup",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rizup",
    startupImage: [
      { url: "/sho.png", media: "(device-width: 390px)" },
    ],
  },
  icons: {
    icon: [
      { url: "/sho.png", sizes: "192x192", type: "image/png" },
      { url: "/sho.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/sho.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/sho.png",
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    title: "Rizup — 毎日1%の複利成長",
    description: "朝夜ジャーナリング × ビジョン × 習慣。昨日より今日を1%好きになる。",
    url: "https://rizup-app.vercel.app",
    siteName: "Rizup",
    locale: "ja_JP",
    type: "website",
    images: [{ url: "/sho.png", width: 512, height: 512, alt: "Rizup" }],
  },
  twitter: {
    card: "summary",
    title: "Rizup — 毎日1%の複利成長",
    description: "朝夜ジャーナリング × ビジョン × 習慣",
    images: ["/sho.png"],
  },
  robots: { index: true, follow: true },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Rizup",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6ecbb0" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1512" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/sho.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/sho.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/sho.png" />
        <meta name="theme-color" content="#6ecbb0" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f1512" media="(prefers-color-scheme: dark)" />
      </head>
      <body className="antialiased">
        <ToastContainer />
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
          document.addEventListener('touchend', function(e) {
            var tag = e.target && e.target.tagName;
            if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT' && !(e.target.closest && e.target.closest('label'))) {
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
