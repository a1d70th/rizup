"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PlanGate from "@/components/PlanGate";
import Image from "next/image";

const moodColors: Record<number, string> = { 1: "#ef4444", 2: "#f97316", 3: "#eab308", 4: "#6ecbb0", 5: "#5ab89d" };
const moodLabels: Record<number, string> = { 1: "つらい", 2: "ふつう", 3: "まあまあ", 4: "いい感じ", 5: "最高" };

export default function PremiumPage() {
  const [plan, setPlan] = useState<string>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moodData, setMoodData] = useState<{ mood: number; created_at: string; content: string }[]>([]);
  const [moodDistribution, setMoodDistribution] = useState<Record<number, number>>({});
  const [avgMood, setAvgMood] = useState(0);
  const [wordChanges, setWordChanges] = useState<{ week: string; positive: number; negative: number }[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("plan, trial_ends_at").eq("id", user.id).single();
      if (profile) { setPlan(profile.plan || "free"); setTrialEndsAt(profile.trial_ends_at); }

      // Get all posts for deep analysis
      const { data: posts } = await supabase.from("posts")
        .select("mood, content, created_at")
        .eq("user_id", user.id).order("created_at", { ascending: true });

      if (posts && posts.length > 0) {
        setMoodData(posts);

        // Distribution
        const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let total = 0;
        posts.forEach(p => { dist[p.mood] = (dist[p.mood] || 0) + 1; total += p.mood; });
        setMoodDistribution(dist);
        setAvgMood(Math.round((total / posts.length) * 10) / 10);

        // Word analysis by week
        const weeks: Record<string, { positive: number; negative: number }> = {};
        const positiveWords = ["嬉しい", "楽しい", "感謝", "ありがとう", "最高", "幸せ", "頑張", "成長", "できた", "良い"];
        const negativeWords = ["つらい", "辛い", "不安", "疲れ", "しんどい", "嫌", "悲しい", "できない", "ダメ"];

        posts.forEach(p => {
          const d = new Date(p.created_at);
          const weekStart = new Date(d);
          weekStart.setDate(d.getDate() - d.getDay());
          const key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}〜`;
          if (!weeks[key]) weeks[key] = { positive: 0, negative: 0 };
          positiveWords.forEach(w => { if (p.content.includes(w)) weeks[key].positive++; });
          negativeWords.forEach(w => { if (p.content.includes(w)) weeks[key].negative++; });
        });
        setWordChanges(Object.entries(weeks).slice(-8).map(([week, v]) => ({ week, ...v })));
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <PlanGate currentPlan={plan} requiredPlan="premium" trialEndsAt={trialEndsAt}>
      <div className="min-h-screen bg-bg pb-20">
        <Header />
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📊</span>
            <h2 className="text-lg font-extrabold">プレミアム分析</h2>
          </div>

          {/* PDF Downloads */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">📄 レポートダウンロード</h3>
            <div className="space-y-2">
              <a href="/api/report/monthly" download className="w-full flex items-center gap-3 p-3 bg-mint-light rounded-xl hover:bg-mint/20 transition">
                <span className="text-xl">📅</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-mint">月次レポート</p>
                  <p className="text-[10px] text-text-light">過去30日間の感情推移・気分分布・成長サマリー</p>
                </div>
                <span className="text-xs text-mint font-bold">PDF</span>
              </a>
              <a href="/api/report/weekly" download className="w-full flex items-center gap-3 p-3 bg-orange-light rounded-xl hover:bg-orange/20 transition">
                <span className="text-xl">📋</span>
                <div className="text-left flex-1">
                  <p className="text-sm font-bold text-orange">週次レポート</p>
                  <p className="text-[10px] text-text-light">今週の振り返り・日別気分・来週へのメッセージ</p>
                </div>
                <span className="text-xs text-orange font-bold">PDF</span>
              </a>
            </div>
          </div>

          {/* Deep Mood Analysis */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">🔍 感情分析の深掘り</h3>
            {moodData.length === 0 ? (
              <p className="text-xs text-text-light text-center py-4">データがまだありません</p>
            ) : (
              <>
                {/* Average mood */}
                <div className="flex items-center justify-between bg-mint-light rounded-xl p-3 mb-3">
                  <span className="text-xs font-bold">平均気分スコア</span>
                  <span className="text-xl font-extrabold text-mint">{avgMood} / 5</span>
                </div>

                {/* Distribution bar */}
                <p className="text-xs font-bold mb-2">気分の分布</p>
                <div className="space-y-1.5 mb-4">
                  {[5, 4, 3, 2, 1].map(mood => {
                    const count = moodDistribution[mood] || 0;
                    const pct = moodData.length > 0 ? (count / moodData.length) * 100 : 0;
                    return (
                      <div key={mood} className="flex items-center gap-2">
                        <span className="text-xs w-16">{moodLabels[mood]}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: moodColors[mood] }} />
                        </div>
                        <span className="text-[10px] text-text-light w-8 text-right">{count}回</span>
                      </div>
                    );
                  })}
                </div>

                {/* Mood timeline */}
                <p className="text-xs font-bold mb-2">気分の推移（全期間）</p>
                <div className="flex items-end gap-[2px] h-24 mb-2 overflow-x-auto">
                  {moodData.map((d, i) => (
                    <div key={i} className="rounded-t-sm min-w-[6px]" style={{
                      height: `${d.mood * 20}%`, background: moodColors[d.mood], flex: "1 1 0",
                    }} />
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-text-light">
                  <span>{new Date(moodData[0]?.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}</span>
                  <span>最新</span>
                </div>
              </>
            )}
          </div>

          {/* Word Change Report */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">📝 言葉の変化レポート</h3>
            {wordChanges.length === 0 ? (
              <p className="text-xs text-text-light text-center py-4">データが増えると表示されます</p>
            ) : (
              <>
                <div className="space-y-2">
                  {wordChanges.map((w, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-text-light w-16 shrink-0">{w.week}</span>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="bg-mint rounded-full h-3" style={{ width: `${Math.max(w.positive * 15, 4)}px` }} />
                        <span className="text-[10px] text-mint">{w.positive}</span>
                      </div>
                      <div className="flex-1 flex items-center gap-1">
                        <div className="bg-red-400 rounded-full h-3" style={{ width: `${Math.max(w.negative * 15, 4)}px` }} />
                        <span className="text-[10px] text-red-400">{w.negative}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-mint" /><span className="text-[10px] text-text-light">ポジティブ</span></div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-text-light">ネガティブ</span></div>
                </div>
              </>
            )}
          </div>
        </div>
        <BottomNav />
      </div>
    </PlanGate>
  );
}
