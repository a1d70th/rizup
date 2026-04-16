"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { isTrialActive, effectiveRank } from "@/lib/plan";

export default function SettingsPage() {
  const [plan, setPlan] = useState("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark" | "auto">("auto");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles")
        .select("plan, trial_ends_at").eq("id", user.id).single();
      if (p) { setPlan(p.plan || "free"); setTrialEndsAt(p.trial_ends_at); }
    })();
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    if (stored === "dark" || stored === "light") setTheme(stored);
    else setTheme("auto");
  }, []);

  const applyTheme = (t: "light" | "dark" | "auto") => {
    setTheme(t);
    if (t === "auto") {
      localStorage.removeItem("theme");
      const sys = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", sys);
    } else {
      localStorage.setItem("theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "https://rizup-app.vercel.app/";
  };

  const handleCheckout = async (targetPlan: "pro" | "premium") => {
    setCheckoutLoading(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: targetPlan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("決済ページの作成に失敗しました。時間をおいて再度お試しください。");
    } catch {
      alert("通信エラー。時間をおいて再度お試しください。");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const items = [
    { icon: "👤", label: "プロフィール編集", href: "/profile" },
    { icon: "🔔", label: "通知", href: "/notifications" },
    { icon: "📜", label: "利用規約", href: "/legal/terms-of-service.html" },
    { icon: "🔒", label: "プライバシーポリシー", href: "/legal/privacy-policy.html" },
    { icon: "📋", label: "特定商取引法", href: "/legal/tokushoho.html" },
    { icon: "📩", label: "お問い合わせ", href: "mailto:a1d.70th@gmail.com?subject=Rizup お問い合わせ" },
  ];

  const currentRank = effectiveRank({ plan, trial_ends_at: trialEndsAt });
  const trialing = isTrialActive({ plan, trial_ends_at: trialEndsAt });

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">⚙️ 設定</h2>

        {/* 現在のプラン */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/icons/icon-192.png" alt="Rizup" width={28} height={28} className="rounded-full" />
            <p className="text-sm font-bold flex-1">
              現在のプラン：{plan === "premium" ? "Premium" : plan === "pro" ? "Pro" : trialing ? "トライアル中" : "Free"}
            </p>
          </div>
          {trialing && trialEndsAt && (
            <p className="text-xs text-text-mid">
              トライアル終了：{new Date(trialEndsAt).toLocaleDateString("ja-JP")}
            </p>
          )}
        </div>

        {/* プラン選択 */}
        <div className="space-y-3 mb-4">
          <PlanCard
            name="Pro" price="¥780/月" color="mint"
            features={["AIフィードバック", "Rizup Insight", "成長グラフ全指標", "なりたい自分・毎日のこと無制限", "避けたい未来"]}
            isCurrent={currentRank >= 1 && plan === "pro"}
            canUpgrade={currentRank < 1}
            loading={checkoutLoading === "pro"}
            onSelect={() => handleCheckout("pro")}
          />
          <PlanCard
            name="Premium" price="¥1,480/月" color="orange"
            features={["Pro の全機能", "月次/週次PDFレポート", "ポジティブ度分析"]}
            isCurrent={plan === "premium"}
            canUpgrade={currentRank < 2}
            loading={checkoutLoading === "premium"}
            onSelect={() => handleCheckout("premium")}
          />
        </div>

        {/* テーマ切替 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-sm font-bold mb-2">🌓 テーマ</p>
          <div className="flex bg-gray-50 rounded-xl p-1 gap-1">
            {([
              { k: "auto", label: "自動", emoji: "🌓" },
              { k: "light", label: "ライト", emoji: "☀️" },
              { k: "dark", label: "ダーク", emoji: "🌙" },
            ] as const).map(o => (
              <button key={o.k} onClick={() => applyTheme(o.k)}
                className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition ${
                  theme === o.k ? "bg-white text-mint shadow-sm" : "text-text-mid"
                }`}>
                {o.emoji} {o.label}
              </button>
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
          <Image src="/icons/icon-192.png" alt="Rizup" width={40} height={40} className="rounded-full mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-light">Rizup v3.1</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

function PlanCard({ name, price, color, features, isCurrent, canUpgrade, loading, onSelect }: {
  name: string; price: string; color: "mint" | "orange";
  features: string[]; isCurrent: boolean; canUpgrade: boolean;
  loading: boolean; onSelect: () => void;
}) {
  const colorClass = color === "mint"
    ? { border: "border-mint", text: "text-mint", bg: "bg-mint", light: "bg-mint-light" }
    : { border: "border-orange", text: "text-orange", bg: "bg-orange", light: "bg-orange-light" };

  return (
    <div className={`bg-white rounded-2xl p-4 border-2 ${isCurrent ? colorClass.border : "border-gray-100"} shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-base font-extrabold ${colorClass.text}`}>{name}</span>
        <span className="text-sm font-bold text-text-mid">{price}</span>
      </div>
      <ul className="space-y-1 mb-3">
        {features.map((f, i) => (
          <li key={i} className="text-xs text-text-mid flex items-center gap-1.5">
            <span className={colorClass.text}>✓</span> {f}
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <div className={`${colorClass.light} ${colorClass.text} text-xs font-bold py-2 rounded-full text-center`}>
          ご利用中
        </div>
      ) : canUpgrade ? (
        <button onClick={onSelect} disabled={loading}
          className={`w-full ${colorClass.bg} text-white font-bold py-2.5 rounded-full text-sm shadow-md disabled:opacity-40`}>
          {loading ? "決済ページへ..." : `${name} にする`}
        </button>
      ) : null}
    </div>
  );
}
