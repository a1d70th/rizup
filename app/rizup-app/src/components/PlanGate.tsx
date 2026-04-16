"use client";
import Image from "next/image";
import { effectiveRank } from "@/lib/plan";

const RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

const planInfo: Record<string, { name: string; price: string; color: string; features: string[] }> = {
  pro: {
    name: "Pro",
    price: "¥780/月",
    color: "text-mint",
    features: ["AIフィードバック", "Rizup Insight", "成長グラフ全指標", "毎日のこと・なりたい自分 無制限", "避けたい未来"],
  },
  premium: {
    name: "Premium",
    price: "¥1,480/月",
    color: "text-orange",
    features: ["Pro の全機能", "月次/週次PDFレポート", "ポジティブ度分析レポート"],
  },
};

interface PlanGateProps {
  currentPlan: string;
  requiredPlan: "pro" | "premium";
  trialEndsAt?: string | null;
  children: React.ReactNode;
}

export default function PlanGate({ currentPlan, requiredPlan, trialEndsAt, children }: PlanGateProps) {
  const current = effectiveRank({ plan: currentPlan, trial_ends_at: trialEndsAt });
  const required = RANK[requiredPlan] ?? 1;

  if (current >= required) return <>{children}</>;

  const info = planInfo[requiredPlan];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <Image src="/icons/icon-192.png" alt="Rizup" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
      <h2 className="text-xl font-extrabold mb-2">この機能は{info.name}プラン限定だよ</h2>
      <p className="text-sm text-text-mid mb-6">7日間無料トライアルで全機能を体験できます</p>
      <div className="bg-mint-light/40 rounded-2xl p-5 max-w-xs w-full mb-6 text-left border border-mint/30">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-lg font-extrabold ${info.color}`}>{info.name}</span>
          <span className="text-sm font-bold text-text-mid">{info.price}</span>
        </div>
        <ul className="space-y-1.5">
          {info.features.map((f, i) => (
            <li key={i} className="text-xs text-text-mid flex items-center gap-2">
              <span className="text-mint">✓</span> {f}
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
