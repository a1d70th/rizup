"use client";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

const rankColors = ["bg-yellow-400", "bg-gray-400", "bg-amber-600"];

function RankCard({ title, emoji, items }: { title: string; emoji: string; items: { name: string; value: string }[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 animate-fade-in">
      <h3 className="text-sm font-bold mb-3">{emoji} {title}</h3>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full ${rankColors[i] || "bg-gray-300"} text-white text-xs font-extrabold flex items-center justify-center`}>
              {i + 1}
            </div>
            <span className="flex-1 text-sm font-semibold">{item.name}</span>
            <span className="text-xs font-bold text-mint">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RankingPage() {
  // Demo data — in production, fetch from Supabase
  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-1">🏆 ランキング</h2>
        <p className="text-xs text-text-light mb-4">今週のランキング</p>

        <RankCard
          title="励まし TOP3"
          emoji="💪"
          items={[
            { name: "はなさん", value: "応援 48回" },
            { name: "ゆうきさん", value: "応援 35回" },
            { name: "みおさん", value: "応援 28回" },
          ]}
        />

        <RankCard
          title="連続投稿ランキング"
          emoji="🔥"
          items={[
            { name: "たかしさん", value: "21日連続" },
            { name: "ゆうきさん", value: "14日連続" },
            { name: "あやさん", value: "10日連続" },
          ]}
        />

        <RankCard
          title="感謝されランキング"
          emoji="🙏"
          items={[
            { name: "ゆうきさん", value: "感謝 22回" },
            { name: "はなさん", value: "感謝 18回" },
            { name: "れいなさん", value: "感謝 15回" },
          ]}
        />

        {/* Monthly MVP */}
        <div className="bg-orange-light rounded-2xl p-5 text-center animate-fade-in">
          <Image src="/sho.png" alt="Sho" width={36} height={36} className="rounded-full mx-auto mb-2" />
          <p className="text-xs font-bold text-orange mb-1">⭐ 月間MVP</p>
          <p className="text-lg font-extrabold">はなさん</p>
          <p className="text-xs text-text-mid mt-1">総合スコア1位 — Sho が選出</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
