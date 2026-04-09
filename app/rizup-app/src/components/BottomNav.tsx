"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const baseItems = [
  { href: "/home", icon: "🏠", label: "ホーム" },
  { href: "/journal", icon: "📝", label: "ジャーナル" },
  { href: "/habits", icon: "✅", label: "習慣" },
  { href: "/notifications", icon: "🔔", label: "通知" },
  { href: "/profile", icon: "👤", label: "マイページ" },
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
        .select("plan, is_admin").eq("id", user.id).single();
      if (!profile) return;
      const extras: { href: string; icon: string; label: string }[] = [];
      if (profile.plan === "vip") extras.push({ href: "/vip", icon: "👑", label: "VIP" });
      if (profile.is_admin) extras.push({ href: "/admin", icon: "⚙️", label: "管理" });
      setExtraItems(extras);
    };
    load();
  }, []);

  useEffect(() => {
    const initialHeight = window.innerHeight;
    const handleResize = () => {
      const currentHeight = window.innerHeight;
      setKeyboardVisible(currentHeight < initialHeight - 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const items = [...baseItems, ...extraItems];

  if (keyboardVisible) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50"
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
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 text-xs font-medium transition-colors ${active ? "text-mint" : "text-text-light"}`}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
