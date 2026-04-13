"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import Link from "next/link";
import { isPremium } from "@/lib/plan";

type Range = "30d" | "90d" | "all";

interface PostRow {
  created_at: string;
  mood: number;
  sleep_hours: number | null;
  positivity_score: number | null;
  content: string;
}

function rangeStart(r: Range): Date | null {
  if (r === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - (r === "30d" ? 30 : 90));
  return d;
}

export default function GrowthPage() {
  const [range, setRange] = useState<Range>("30d");
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalPosts, setTotalPosts] = useState(0);
  const [plan, setPlan] = useState<string>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles")
        .select("streak, plan, trial_ends_at").eq("id", user.id).single();
      if (p) { setStreak(p.streak || 0); setPlan(p.plan || "free"); setTrialEndsAt(p.trial_ends_at); }

      let q = supabase.from("posts")
        .select("created_at, mood, sleep_hours, positivity_score, content")
        .eq("user_id", user.id).order("created_at", { ascending: true });
      const s = rangeStart(range);
      if (s) q = q.gte("created_at", s.toISOString());
      const { data } = await q;
      if (data) {
        // Fallback: sleep_hours が null のケースでも content から抽出
        const enriched = data.map((p) => {
          if (p.sleep_hours == null && typeof p.content === "string") {
            const m = p.content.match(/昨夜の睡眠：([\d.]+)時間/);
            if (m) return { ...p, sleep_hours: parseFloat(m[1]) };
          }
          return p;
        });
        setPosts(enriched);
      }

      const { count } = await supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      setTotalPosts(count || 0);

      setLoading(false);
    })();
  }, [range]);

  const series = useMemo(() => {
    return posts.map(p => ({
      date: p.created_at,
      mood: p.mood,
      sleep: p.sleep_hours ?? null,
      positivity: p.positivity_score ?? null,
    }));
  }, [posts]);

  const avgMood = posts.length > 0 ? Math.round((posts.reduce((s, p) => s + p.mood, 0) / posts.length) * 10) / 10 : 0;
  const sleepRows = posts.filter(p => p.sleep_hours != null);
  const avgSleep = sleepRows.length > 0
    ? Math.round((sleepRows.reduce((s, p) => s + (p.sleep_hours || 0), 0) / sleepRows.length) * 10) / 10
    : 0;
  const posRows = posts.filter(p => p.positivity_score != null);
  const avgPositivity = posRows.length > 0
    ? Math.round(posRows.reduce((s, p) => s + (p.positivity_score || 0), 0) / posRows.length)
    : 0;

  const premium = isPremium({ plan, trial_ends_at: trialEndsAt });

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-1">📈 成長グラフ</h2>
        <p className="text-xs text-text-light mb-4">気分・睡眠・ポジティブ度の時系列</p>

        {/* 期間切替 */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-4">
          {(["30d", "90d", "all"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${range === r ? "bg-mint-light text-mint" : "text-text-light"}`}>
              {r === "30d" ? "30日" : r === "90d" ? "90日" : "全期間"}
            </button>
          ))}
        </div>

        {/* 数値サマリ */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="連続" value={`🔥 ${streak}`} />
          <StatCard label="総投稿" value={`${totalPosts}`} />
          <StatCard label="期間" value={`${posts.length}件`} />
        </div>

        {/* グラフ: 気分 */}
        <ChartCard title="🌤 気分" avg={avgMood ? `${avgMood}/5` : "—"} color="#6ecbb0"
          data={series.map(s => s.mood ?? null)} domainMax={5} />

        {/* グラフ: 睡眠 */}
        <ChartCard title="😴 睡眠時間" avg={avgSleep ? `${avgSleep}h` : "—"} color="#818cf8"
          data={series.map(s => s.sleep ?? null)} domainMax={10} />

        {/* グラフ: ポジティブ度 */}
        <ChartCard title="✨ ポジティブ度" avg={avgPositivity ? `${avgPositivity}%` : "—"} color="#f4976c"
          data={series.map(s => s.positivity ?? null)} domainMax={100} />

        {/* PDF ダウンロード（Premium） */}
        {premium ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">📄 成長レポート</h3>
            <div className="space-y-2">
              <a href="/api/report/monthly" download
                className="flex items-center gap-3 p-3 bg-mint-light rounded-xl hover:opacity-80 transition">
                <span className="text-lg">📅</span>
                <p className="text-xs font-bold text-mint flex-1">月次レポート（PDF）</p>
                <span className="text-xs text-mint">→</span>
              </a>
              <a href="/api/report/weekly" download
                className="flex items-center gap-3 p-3 bg-orange-light rounded-xl hover:opacity-80 transition">
                <span className="text-lg">📋</span>
                <p className="text-xs font-bold text-orange flex-1">週次レポート（PDF）</p>
                <span className="text-xs text-orange">→</span>
              </a>
            </div>
          </div>
        ) : (
          <Link href="/settings" className="block bg-white rounded-2xl p-4 border border-orange/30 shadow-sm mb-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">🎁</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-orange">Premium で月次PDFレポート</p>
                <p className="text-[10px] text-text-light">¥1,480/月 → 設定から</p>
              </div>
              <span className="text-text-light">→</span>
            </div>
          </Link>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center">
      <div className="text-base font-extrabold text-text">{value}</div>
      <div className="text-[10px] text-text-light mt-0.5">{label}</div>
    </div>
  );
}

function ChartCard({ title, avg, color, data, domainMax }: {
  title: string; avg: string; color: string; data: (number | null)[]; domainMax: number;
}) {
  const points = data.map((v, i) => ({ x: i, v }));
  const valid = points.filter(p => p.v != null);
  const hasData = valid.length > 0;

  const W = 320, H = 80, PAD = 4;
  const xOf = (i: number) => {
    if (data.length <= 1) return W / 2;
    return PAD + (i / (data.length - 1)) * (W - PAD * 2);
  };
  const yOf = (v: number) => PAD + (1 - v / domainMax) * (H - PAD * 2);

  const path = hasData
    ? valid.map((p, idx) => `${idx === 0 ? "M" : "L"} ${xOf(p.x)} ${yOf(p.v as number)}`).join(" ")
    : "";

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold">{title}</h3>
        <span className="text-xs font-extrabold" style={{ color }}>{avg}</span>
      </div>
      {hasData ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
          <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {valid.map((p, i) => (
            <circle key={i} cx={xOf(p.x)} cy={yOf(p.v as number)} r="2.5" fill={color} />
          ))}
        </svg>
      ) : (
        <p className="text-xs text-text-light text-center py-6">まだデータがありません</p>
      )}
    </div>
  );
}
