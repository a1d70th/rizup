"use client";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-100">
      <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
        <Link href="/home" className="flex items-center" aria-label="ホームへ">
          {/* ライト用ロゴ */}
          <Image src="/logo.svg" alt="Rizup" width={100} height={26} priority className="block dark:hidden" />
          {/* ダーク用ロゴ */}
          <Image src="/logo-white.svg" alt="Rizup" width={100} height={26} priority className="hidden dark:block" />
        </Link>
        <Link href="/notifications" className="relative flex items-center justify-center w-11 h-11" aria-label="通知">
          <span className="text-xl">🔔</span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange rounded-full" aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
