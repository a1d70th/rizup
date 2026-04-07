"use client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

export default function SettingsPage() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const settingsItems = [
    { icon: "👤", label: "プロフィール編集", href: "#" },
    { icon: "🔔", label: "通知設定", href: "#" },
    { icon: "💳", label: "プラン管理", href: "#" },
    { icon: "📜", label: "利用規約", href: "/legal/terms-of-service.html" },
    { icon: "🔒", label: "プライバシーポリシー", href: "/legal/privacy-policy.html" },
    { icon: "📋", label: "特定商取引法", href: "/legal/tokushoho.html" },
  ];

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">⚙️ 設定</h2>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          {settingsItems.map((item, i) => (
            <a
              key={i}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <span className="text-text-light text-sm">→</span>
            </a>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm py-3.5 text-sm font-bold text-red-400 hover:bg-red-50 transition"
        >
          ログアウト
        </button>

        <div className="text-center mt-8">
          <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-light">Rizup v1.0.0</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
