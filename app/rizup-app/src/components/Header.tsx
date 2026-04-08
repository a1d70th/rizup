"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const [lastY, setLastY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 60 && y > lastY);
      setLastY(y);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });

  return (
    <header
      className="fixed left-0 right-0 bg-white/92 backdrop-blur-md border-b border-gray-100 z-50 transition-transform duration-300"
      style={{ top: 0, transform: hidden ? "translateY(-100%)" : "translateY(0)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <Link href="/home" className="flex items-center gap-2" aria-label="ホームへ">
          <Image src="/sho.png" alt="Rizup マスコット Sho" width={32} height={32} className="rounded-full" />
          <span className="text-lg font-extrabold text-mint">
            Riz<span className="text-orange">up</span>
          </span>
        </Link>
        <Link href="/notifications" className="relative flex items-center justify-center w-11 h-11" aria-label="通知">
          <span className="text-xl">🔔</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange rounded-full" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
