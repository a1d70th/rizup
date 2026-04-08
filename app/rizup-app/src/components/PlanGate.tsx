"use client";
import Image from "next/image";

const planRank: Record<string, number> = { free: 0, pro: 1, premium: 2, vip: 3 };
const planInfo: Record<string, { name: string; price: string; color: string; features: string[] }> = {
  pro: { name: "Pro", price: "¥980/月", color: "text-mint", features: ["投稿・ジャーナリング全機能", "AIフィードバック", "感情グラフ・睡眠記録", "バッジ・ストリーク"] },
  premium: { name: "Premium", price: "¥1,980/月", color: "text-orange", features: ["Pro の全機能", "月次/週次PDFレポート", "感情分析の深掘り", "言葉の変化レポート"] },
  vip: { name: "VIP", price: "¥2,980/月", color: "text-purple-500", features: ["Premium の全機能", "Sho への直接相談（月1回）", "限定ノウハウコンテンツ", "先行機能プレビュー"] },
};

interface PlanGateProps {
  currentPlan: string;
  requiredPlan: "pro" | "premium" | "vip";
  children: React.ReactNode;
}

export default function PlanGate({ currentPlan, requiredPlan, children }: PlanGateProps) {
  const current = planRank[currentPlan] ?? 0;
  const required = planRank[requiredPlan] ?? 1;

  if (current >= required) return <>{children}</>;

  const info = planInfo[requiredPlan];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <Image src="/sho.png" alt="Sho" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
      <h2 className="text-xl font-extrabold mb-2">この機能は{info.name}プラン限定です</h2>
      <p className="text-sm text-text-mid mb-6">
        アップグレードして、すべての機能を使いましょう
      </p>
      <div className="bg-gray-50 rounded-2xl p-5 max-w-xs w-full mb-6 text-left">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-lg font-extrabold ${info.color}`}>{info.name} プラン</span>
          <span className="text-sm font-bold text-text-mid">{info.price}</span>
        </div>
        <ul className="space-y-1.5">
          {info.features.map((f, i) => (
            <li key={i} className="text-xs text-text-mid flex items-center gap-2">
              <span className="text-mint">✅</span> {f}
            </li>
          ))}
        </ul>
      </div>
      <a href="/settings" className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30 mb-3">
        アップグレードする
      </a>
      <a href="/home" className="text-xs text-text-light hover:text-mint transition">ホームに戻る</a>
    </div>
  );
}
