"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function PricingPage() {
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | "premium">("free");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        try {
          const { data: prof } = await supabase.from("profiles").select("plan").eq("id", user.id).maybeSingle();
          if (prof?.plan === "pro" || prof?.plan === "premium") setCurrentPlan(prof.plan);
        } catch { /* ignore */ }
      }
    })();
  }, []);

  const upgrade = async () => {
    setError(null);
    if (!userId) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "pro" }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error || "決済セッションを作れませんでした。少し時間を置いてもう一度お試しください。");
    } catch {
      setError("通信エラーが発生しました。");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#111111] pb-24">
      <Header />
      <div className="max-w-md mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-center mb-1 dark:text-gray-100">料金プラン</h1>
        <p className="text-sm text-text-mid text-center mb-6">ずっと無料でも、十分使えるよ🌱</p>

        {currentPlan !== "free" && (
          <div className="bg-mint-light border border-mint rounded-2xl p-4 mb-5 text-center">
            <p className="text-sm font-extrabold text-mint">
              ✨ 現在のプラン：{currentPlan === "pro" ? "Pro" : "Premium"}
            </p>
            <p className="text-xs text-text-mid mt-1">ご利用ありがとうございます！</p>
          </div>
        )}

        {/* Free */}
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-2xl p-5 mb-4">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-extrabold dark:text-gray-100">Free</h2>
            <p className="text-2xl font-extrabold text-text-mid">¥0<span className="text-xs font-bold">/月</span></p>
          </div>
          <ul className="text-sm text-text leading-relaxed space-y-1.5 mb-2">
            <li>🌱 朝のひとこと・夜のふりかえり</li>
            <li>🏡 キャラ育成・村で仲間を5人まで</li>
            <li>📈 成長グラフ・強み発見</li>
            <li>📝 ジャーナル投稿・写真添付</li>
          </ul>
          <p className="text-xs text-text-light">書き続けるだけなら、ずっとこのままでOK</p>
        </div>

        {/* Pro */}
        <div className="bg-gradient-to-br from-mint-light to-white dark:from-[#0d2818] dark:to-[#1a1a1a] border-2 border-mint rounded-2xl p-5 shadow-lg shadow-mint/20 relative overflow-hidden">
          <div className="absolute top-3 right-3 bg-mint text-white text-[10px] font-extrabold px-2 py-1 rounded-full">おすすめ</div>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-extrabold text-mint">Pro</h2>
            <p className="text-2xl font-extrabold text-mint">¥480<span className="text-xs font-bold">/月</span></p>
          </div>
          <ul className="text-sm text-text leading-relaxed space-y-1.5 mb-4">
            <li>✨ Free の全機能</li>
            <li>🏘️ 村の仲間を 7 人まで</li>
            <li>🎭 変身機能（ジャーナルの書き直し提案）</li>
            <li>📊 週次レポート（AI要約）</li>
            <li>🧊 ストリークフリーズ 月 3 回</li>
            <li>💪 強み贈与の無制限解放</li>
            <li>📅 過去データの全期間ダウンロード</li>
          </ul>
          {currentPlan === "free" ? (
            <button
              onClick={upgrade}
              disabled={loading}
              className="w-full bg-mint text-white font-extrabold py-4 rounded-full shadow-lg shadow-mint/40 active:scale-95 transition text-base disabled:opacity-50">
              {loading ? "準備中..." : "✨ Pro にアップグレード"}
            </button>
          ) : (
            <div className="w-full bg-mint-light text-mint text-center font-extrabold py-3 rounded-full border border-mint">
              ✅ 利用中
            </div>
          )}
          {error && (
            <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
          )}
          <p className="text-[11px] text-text-light mt-3 text-center leading-relaxed">
            Stripe 経由で安全に決済。いつでも解約でき、解約後も当月末まで使えます。
          </p>
        </div>

        <p className="text-center text-xs text-text-light mt-6">
          <Link href="/home" className="hover:text-mint transition">← ホームに戻る</Link>
        </p>
      </div>
      <BottomNav />
    </main>
  );
}
