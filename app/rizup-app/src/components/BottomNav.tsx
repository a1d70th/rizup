"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/home", icon: "🏠", label: "ホーム" },
  { href: "/journal", icon: "📝", label: "ジャーナル" },
  { href: "/notifications", icon: "🔔", label: "通知" },
  { href: "/profile", icon: "👤", label: "マイページ" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
      <div className="flex justify-around py-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${active ? "text-mint" : "text-text-light"}`}>
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
