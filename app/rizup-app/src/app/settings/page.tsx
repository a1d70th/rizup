"use client";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

export default function SettingsPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "https://rizup-app.vercel.app/";
  };

  const items = [
    { icon: "👤", label: "プロフィール編集", href: "#" },
    { icon: "🔔", label: "通知設定", href: "#" },
    { icon: "💳", label: "プラン管理", href: "#" },
    { icon: "📜", label: "利用規約", href: "/legal/terms-of-service.html" },
    { icon: "🔒", label: "プライバシーポリシー", href: "/legal/privacy-policy.html" },
    { icon: "📋", label: "特定商取引法", href: "/legal/tokushoho.html" },
    { icon: "📩", label: "お問い合わせ", href: "mailto:a1d.70th@gmail.com?subject=Rizup お問い合わせ" },
  ];

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">⚙️ 設定</h2>

        {/* Pricing */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-4 p-4">
          <h3 className="text-sm font-bold mb-3">プラン一覧</h3>
          <div className="flex flex-col gap-2">
            {[
              { name: "無料", price: "¥0", desc: "タイムライン閲覧・リアクションのみ", color: "text-text-mid" },
              { name: "Pro", price: "¥980/月", desc: "投稿・ジャーナリング・AIフィードバック・感情グラフ", color: "text-mint" },
              { name: "Premium", price: "¥1,980/月", desc: "Pro全機能＋PDF成長レポート・詳細分析", color: "text-orange" },
              { name: "VIP", price: "¥2,980/月", desc: "Premium全機能＋限定コンテンツ・直接相談", color: "text-purple-500" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className={`text-sm font-bold ${p.color}`}>{p.name}</span>
                  <span className="text-xs text-text-light ml-2">{p.desc}</span>
                </div>
                <span className="text-xs font-bold text-text-mid">{p.price}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          {items.map((item, i) => (
            <a key={i} href={item.href}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <span className="text-text-light text-sm">→</span>
            </a>
          ))}
        </div>

        <button onClick={handleLogout}
          className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm py-3.5 text-sm font-bold text-red-400 hover:bg-red-50 transition">
          ログアウト
        </button>

        <div className="text-center mt-8">
          <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-light">Rizup v2.0.0</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
