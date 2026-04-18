"use client";
import Link from "next/link";

export default function Header() {
  return (
    <header
      className="bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-[#2a2a2a] sticky top-0 z-30"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <Link href="/home" className="flex items-center" aria-label="ホームへ">
          <span
            className="select-none"
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              color: "transparent",
              fontSize: "1.4rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              fontFamily: "'Inter','SF Pro Display','Helvetica Neue',-apple-system,system-ui,sans-serif",
            }}
          >
            RIZUP
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/notifications"
            className="relative flex items-center justify-center w-11 h-11"
            aria-label="通知"
          >
            <span className="text-xl">🔔</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#06b6d4] rounded-full" aria-hidden="true" />
          </Link>
          <Link
            href="/settings"
            className="flex items-center justify-center w-11 h-11"
            aria-label="設定"
          >
            <span className="text-xl">⚙️</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
