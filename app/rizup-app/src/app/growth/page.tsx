"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import CountUp from "@/components/CountUp";
import Image from "next/image";
import Link from "next/link";
import { isPremium } from "@/lib/plan";
import { compoundPercent, actualCompoundPercent } from "@/lib/compound";

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
  const [habitAchievement, setHabitAchievement] = useState(0); // 0〜1
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
        const enriched = data.map(p => {
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

      // 習慣達成率：過去14日
      const { data: hs } = await supabase.from("habits").select("id").eq("user_id", user.id).is("archived_at", null);
      if (hs && hs.length > 0) {
        const fourteenAgo = new Date();
        fourteenAgo.setDate(fourteenAgo.getDate() - 14);
        const { count: logCount } = await supabase.from("habit_logs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("logged_date", fourteenAgo.toISOString().split("T")[0]);
        const target = hs.length * 14;
        setHabitAchievement(target > 0 ? Math.min(1, (logCount || 0) / target) : 0);
      }

      setLoading(false);
    })();
  }, [range]);

  const series = useMemo(() => posts.map(p => ({
    date: p.created_at,
    mood: p.mood,
    sleep: p.sleep_hours ?? null,
    positivity: p.positivity_score ?? null,
  })), [posts]);

  const avgMood = posts.length > 0 ? Math.round((posts.reduce((s, p) => s + p.mood, 0) / posts.length) * 10) / 10 : 0;
  const sleepRows = posts.filter(p => p.sleep_hours != null);
  const avgSleep = sleepRows.length > 0
    ? Math.round((sleepRows.reduce((s, p) => s + (p.sleep_hours || 0), 0) / sleepRows.length) * 10) / 10 : 0;
  const posRows = posts.filter(p => p.positivity_score != null);
  const avgPositivity = posRows.length > 0
    ? Math.round(posRows.reduce((s, p) => s + (p.positivity_score || 0), 0) / posRows.length) : 0;

  // 複利予測: 理想 vs 実績（過去14日の習慣達成率を反映）
  const compoundRange = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const ideal30 = compoundPercent(30);
  const ideal90 = compoundPercent(90);
  const ideal365 = compoundPercent(365);
  const actualToNow = actualCompoundPercent(streak, habitAchievement);
  const idealToNow = compoundPercent(streak);

  const premium = isPremium({ plan, trial_ends_at: trialEndsAt });

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Rizup" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-2xl font-extrabold mb-1">📈 成長グラフ</h2>
        <p className="text-xs text-text-light mb-4">毎日の1%が、1年で37倍になる</p>

        {/* 複利カード */}
        <div className="glass-mint rounded-3xl p-5 mb-4 animate-slide-up shadow-lg shadow-mint/10">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✨</span>
            <h3 className="text-base font-extrabold flex-1">あなたの複利</h3>
            <span className="text-[10px] font-bold text-mint bg-white/60 px-2 py-0.5 rounded-full">連続{streak}日</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white/60 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-text-mid">今の成長</p>
              <p className="text-xl font-extrabold text-mint"><CountUp value={actualToNow} prefix="+" suffix="%" /></p>
            </div>
            <div className="bg-white/60 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-text-mid">理想ペース</p>
              <p className="text-xl font-extrabold text-orange"><CountUp value={idealToNow} prefix="+" suffix="%" /></p>
            </div>
          </div>
          <CompoundCurve streak={streak} habitAchievement={habitAchievement} days={compoundRange} />
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div><p className="text-[10px] text-text-mid">30日後</p><p className="text-sm font-extrabold text-mint">+{ideal30}%</p></div>
            <div><p className="text-[10px] text-text-mid">90日後</p><p className="text-sm font-extrabold text-mint">+{ideal90}%</p></div>
            <div><p className="text-[10px] text-text-mid">1年後</p><p className="text-sm font-extrabold text-orange">+{ideal365.toLocaleString()}%</p></div>
          </div>
        </div>

        {/* 期間切替 */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-4">
          {(["30d", "90d", "all"] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${range === r ? "bg-mint-light text-mint" : "text-text-light"}`}>
              {r === "30d" ? "30日" : r === "90d" ? "90日" : "全期間"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="連続" value={<><span className="streak-fire">🔥</span> <CountUp value={streak} /></>} />
          <StatCard label="総投稿" value={<CountUp value={totalPosts} />} />
          <StatCard label="期間" value={`${posts.length}件`} />
        </div>

        <ChartCard title="🌤 気分" avg={avgMood ? `${avgMood}/5` : "—"} color="#6ecbb0"
          data={series.map(s => s.mood ?? null)} domainMax={5} />
        <ChartCard title="😴 睡眠時間" avg={avgSleep ? `${avgSleep}h` : "—"} color="#818cf8"
          data={series.map(s => s.sleep ?? null)} domainMax={10} />
        <ChartCard title="✨ ポジティブ度" avg={avgPositivity ? `${avgPositivity}%` : "—"} color="#f4976c"
          data={series.map(s => s.positivity ?? null)} domainMax={100} />

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

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
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
  const xOf = (i: number) => data.length <= 1 ? W / 2 : PAD + (i / (data.length - 1)) * (W - PAD * 2);
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

// 複利曲線：理想 vs 実績
function CompoundCurve({ streak, habitAchievement, days }: { streak: number; habitAchievement: number; days: number }) {
  const W = 320, H = 100, PAD = 6;
  const maxMult = Math.pow(1.01, days);
  const step = Math.max(1, Math.floor(days / 60));
  const idealPts: [number, number][] = [];
  const actualPts: [number, number][] = [];
  for (let d = 0; d <= days; d += step) {
    idealPts.push([d, Math.pow(1.01, d)]);
    actualPts.push([d, Math.pow(1 + 0.01 * habitAchievement, d)]);
  }
  const xOf = (d: number) => PAD + (d / days) * (W - PAD * 2);
  const yOf = (m: number) => PAD + (1 - (m - 1) / Math.max(maxMult - 1, 0.01)) * (H - PAD * 2);

  const idealPath = idealPts.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p[0])} ${yOf(p[1])}`).join(" ");
  const actualPath = actualPts.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p[0])} ${yOf(p[1])}`).join(" ");
  const nowX = xOf(Math.min(streak, days));
  const nowY = yOf(Math.pow(1 + 0.01 * habitAchievement, Math.min(streak, days)));

  return (
    <div className="bg-white/70 rounded-2xl p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
        <path d={idealPath} fill="none" stroke="#f4976c" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
        <path d={actualPath} fill="none" stroke="#6ecbb0" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={nowX} cy={nowY} r="4" fill="#6ecbb0" stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="flex items-center gap-3 mt-1">
        <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-orange rounded-full" style={{borderTop:"2px dashed #f4976c"}} /><span className="text-[9px] text-text-light">理想1%/日</span></div>
        <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-mint rounded-full" /><span className="text-[9px] text-text-light">あなたの実績</span></div>
      </div>
    </div>
  );
}
