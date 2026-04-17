"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const baseItems = [
  { href: "/home", icon: "\u{1F3E0}", label: "ホーム" },
  { href: "/journal", icon: "\u{1F4DD}", label: "ジャーナル" },
  { href: "/growth", icon: "\u{1F4C8}", label: "成長" },
  { href: "/profile", icon: "\u{1F464}", label: "マイページ" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const [extraItems, setExtraItems] = useState<{ href: string; icon: string; label: string }[]>([]);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles")
        .select("is_admin").eq("id", user.id).single();
      if (profile?.is_admin) {
        setExtraItems([{ href: "/admin", icon: "\u{2699}\u{FE0F}", label: "管理" }]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      setKeyboardVisible(window.innerHeight < initialHeight - 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items = [...baseItems, ...extraItems];

  if (keyboardVisible) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-lg border-t border-gray-100 dark:border-[#2a2a2a] z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="メインナビゲーション"
    >
      <div className="flex justify-around py-1 max-w-md mx-auto">
        {items.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 text-xs font-medium transition-all active:scale-90 ${active ? "text-mint" : "text-text-light hover:text-text-mid"}`}
            >
              <span className={`text-xl transition-transform ${active ? "scale-110" : ""}`} aria-hidden="true">{item.icon}</span>
              <span className={`text-[10px] ${active ? "font-extrabold" : ""}`}>{item.label}</span>
              {active && <span className="w-1 h-1 bg-mint rounded-full mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
