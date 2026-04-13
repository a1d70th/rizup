"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Confetti from "@/components/Confetti";
import CountUp from "@/components/CountUp";
import PushOptIn from "@/components/PushOptIn";
import { showToast } from "@/components/Toast";
import Image from "next/image";
import Link from "next/link";
import { SkeletonTimeline } from "@/components/Skeleton";
import { compoundPercent } from "@/lib/compound";
import { findTodayPost } from "@/lib/safe-insert";

interface PostWithProfile {
  id: string; user_id: string; type: string; content: string;
  mood: number; ai_feedback: string | null; created_at: string;
  image_url?: string | null;
  profiles: { name: string; avatar_url: string | null };
}

interface Todo { id: string; title: string; is_done: boolean; vision_id: string | null; }

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [streak, setStreak] = useState(0);
  const [shoInsight, setShoInsight] = useState("おはよう。今日も1%、積んでいこう。");
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [habitsCompleted, setHabitsCompleted] = useState({ done: 0, total: 0 });
  const [hasMorningPost, setHasMorningPost] = useState(false);
  const [hasEveningPost, setHasEveningPost] = useState(false);
  const [compoundScoreToday, setCompoundScoreToday] = useState<number | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  const today = todayJST();
  const hour = new Date().getHours();
  const isMorning = hour < 15;

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase.from("profiles")
            .select("name, streak, zodiac, birthday, rizup_type, mbti, trial_ends_at, plan, is_admin")
            .eq("id", user.id).single();
          if (profile) {
            setUserName(profile.name || "");
            setStreak(profile.streak || 0);
            if (profile.is_admin) setIsAdmin(true);
            if (profile.trial_ends_at) {
              const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000);
              if (daysLeft > 0) setTrialDaysLeft(daysLeft);
            }
            const cacheKey = `sho_insight_${today}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              setShoInsight(cached);
            } else {
              fetch("/api/sho-insight", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  zodiac: profile.zodiac, birthday: profile.birthday,
                  rizupType: profile.rizup_type, mbti: profile.mbti, name: profile.name,
                }),
              }).then(r => r.json()).then(d => {
                if (d.insight) { setShoInsight(d.insight); localStorage.setItem(cacheKey, d.insight); }
              }).catch(() => {});
            }
          }

          // 今日のToDo（テーブル未存在でも落ちない）
          try {
            const { data: todos } = await supabase.from("todos")
              .select("id, title, is_done, vision_id")
              .eq("user_id", user.id).eq("due_date", today)
              .order("is_done").order("created_at").limit(5);
            if (todos) setTodayTodos(todos);
          } catch { /* ignore */ }

          // 今日の朝夜ジャーナル（posted_date 依存解除）
          const morningP = await findTodayPost(supabase, user.id, "morning");
          setHasMorningPost(!!morningP);
          const eveningP = await findTodayPost(supabase, user.id, "evening");
          setHasEveningPost(!!eveningP);

          if (eveningP) {
            try {
              const { data: e } = await supabase.from("posts")
                .select("compound_score_today").eq("id", eveningP.id).maybeSingle();
              if (e?.compound_score_today != null) setCompoundScoreToday(e.compound_score_today);
            } catch { /* ignore */ }
          }

          // 今日の習慣達成
          try {
            const { data: allHabits } = await supabase.from("habits")
              .select("id").eq("user_id", user.id).is("archived_at", null);
            if (allHabits) {
              const { data: logs } = await supabase.from("habit_logs")
                .select("habit_id").eq("user_id", user.id).eq("logged_date", today);
              setHabitsCompleted({ done: (logs || []).length, total: allHabits.length });
            }
          } catch { /* ignore */ }

          fetch("/api/check-progress", { method: "POST" }).then(r => r.json()).then(d => {
            if (d.streak !== undefined) setStreak(d.streak);
          }).catch(() => {});
        }

        const { data } = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)")
          .order("created_at", { ascending: false }).limit(20);
        if (data) setPosts(data as PostWithProfile[]);
      } catch (err) {
        console.error("[Home]", err);
      }
      setLoading(false);
    };
    init();
  }, [today]);

  const handleToggleTodo = async (t: Todo) => {
    const newDone = !t.is_done;
    try {
      const { error } = await supabase.from("todos")
        .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
        .eq("id", t.id);
      if (error) { showToast("error", "更新できませんでした"); return; }
      setTodayTodos(prev => prev.map(x => x.id === t.id ? { ...x, is_done: newDone } : x));
      if (newDone) {
        setCelebrating(t.id);
        setConfettiKey(k => k + 1);
        setTimeout(() => setCelebrating(null), 700);
      }
    } catch { showToast("error", "ネットワークエラー"); }
  };

  const doneTodos = todayTodos.filter(t => t.is_done).length;
  const totalTodos = todayTodos.length;
  const allDone = totalTodos > 0 && doneTodos === totalTodos;
  const compoundPct = compoundPercent(streak);

  // Sho の今日の案内
  const nextActionHint = (() => {
    if (!hasMorningPost) return { label: "朝ジャーナルを書く", href: "/journal", emoji: "☀️" };
    if (totalTodos === 0) return { label: "今日やること3つを決める", href: "/today", emoji: "✅" };
    if (!allDone) return { label: "ToDoを1つ完了する", href: "/today", emoji: "✓" };
    if (habitsCompleted.total > 0 && habitsCompleted.done < habitsCompleted.total)
      return { label: "習慣をチェックする", href: "/habits", emoji: "🔄" };
    if (!isMorning && !hasEveningPost) return { label: "夜ジャーナルで振り返る", href: "/journal", emoji: "🌙" };
    return { label: "成長グラフを見る", href: "/growth", emoji: "📈" };
  })();

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Confetti trigger={confettiKey} />
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* ── Sho 挨拶 + 次の一歩 ─────────────────────────────────────── */}
        <div className="glass-mint rounded-3xl p-5 mb-4 animate-slide-up shadow-lg shadow-mint/10">
          <div className="flex items-center gap-3 mb-2">
            <Image src="/sho.png" alt="Sho" width={44} height={44} className="rounded-full animate-sho-float" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-mint tracking-wide">Sho から</p>
              <p className="text-base font-extrabold truncate">おはよう、{userName || "あなた"}！</p>
            </div>
            {streak > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-text-mid">連続</p>
                <p className="text-lg font-extrabold text-orange leading-none"><span className="streak-fire">🔥</span>{streak}</p>
              </div>
            )}
          </div>
          <p className="text-sm text-text leading-relaxed mb-3">{shoInsight}</p>
          <Link href={nextActionHint.href}
            className="flex items-center gap-3 bg-white/70 rounded-2xl p-3 hover:bg-white transition">
            <span className="text-2xl" aria-hidden="true">{nextActionHint.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-mint">今日はこれをやろう</p>
              <p className="text-sm font-extrabold truncate">{nextActionHint.label}</p>
            </div>
            <span className="text-mint text-lg">→</span>
          </Link>
          {trialDaysLeft !== null && trialDaysLeft <= 3 && (
            <p className="text-[10px] text-orange mt-2 font-bold text-center">⏰ トライアル残り{trialDaysLeft}日</p>
          )}
        </div>

        {/* ── 今日のダッシュボード（4マス） ──────────────────────────── */}
        <div className="bg-white rounded-3xl p-4 border border-mint/20 shadow-sm mb-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-extrabold">📊 今日のダッシュボード</h2>
            <span className="text-[10px] text-text-light">
              {new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/journal" className="bg-bg rounded-2xl p-3 hover:bg-mint-light/50 transition">
              <p className="text-[10px] text-text-mid mb-1">📝 ジャーナル</p>
              <p className="text-sm font-extrabold flex gap-2">
                <span className={hasMorningPost ? "text-mint" : "text-text-light"}>☀️{hasMorningPost ? "✅" : "⬜"}</span>
                <span className={hasEveningPost ? "text-mint" : "text-text-light"}>🌙{hasEveningPost ? "✅" : "⬜"}</span>
              </p>
            </Link>
            <Link href="/today" className="bg-bg rounded-2xl p-3 hover:bg-mint-light/50 transition">
              <p className="text-[10px] text-text-mid mb-1">✅ ToDo</p>
              <p className="text-sm font-extrabold text-mint">
                <CountUp value={doneTodos} />/{totalTodos || "—"}
                <span className="text-[10px] text-text-light ml-1 font-normal">完了</span>
              </p>
            </Link>
            <Link href="/habits" className="bg-bg rounded-2xl p-3 hover:bg-mint-light/50 transition">
              <p className="text-[10px] text-text-mid mb-1">🔄 習慣</p>
              <p className="text-sm font-extrabold text-mint">
                <CountUp value={habitsCompleted.done} />/{habitsCompleted.total || "—"}
                <span className="text-[10px] text-text-light ml-1 font-normal">チェック</span>
              </p>
            </Link>
            <Link href="/growth" className="bg-bg rounded-2xl p-3 hover:bg-mint-light/50 transition">
              <p className="text-[10px] text-text-mid mb-1">✨ 複利成長</p>
              {compoundScoreToday !== null ? (
                <p className="text-sm font-extrabold text-orange">
                  <CountUp value={compoundScoreToday} />
                  <span className="text-[10px] text-text-light ml-1 font-normal">点</span>
                </p>
              ) : (
                <p className="text-sm font-extrabold text-orange">+<CountUp value={compoundPct} suffix="%" /></p>
              )}
            </Link>
          </div>
        </div>

        {/* ── 今日のToDo詳細 ──────────────────────────────────────────── */}
        {totalTodos > 0 && (
          <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm mb-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">✅</span>
              <h3 className="text-sm font-extrabold flex-1">今日やること</h3>
              <span className="text-[10px] font-bold text-mint bg-mint-light px-2 py-0.5 rounded-full">
                {doneTodos}/{totalTodos}
              </span>
            </div>
            <div className="flex flex-col gap-2 mb-2">
              {todayTodos.map((t, i) => {
                const celebrate = celebrating === t.id;
                return (
                  <div key={t.id}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl transition animate-slide-up ${t.is_done ? "bg-mint-light" : "bg-bg"}`}
                    style={{ animationDelay: `${i * 40}ms` }}>
                    <button onClick={() => handleToggleTodo(t)}
                      aria-label={t.is_done ? `${t.title}を未完了にする` : `${t.title}を完了にする`}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition shrink-0 ${t.is_done ? "bg-mint border-mint text-white animate-check-pulse" : "border-gray-300"}`}>
                      {t.is_done ? "✓" : ""}
                    </button>
                    <p className={`text-sm font-medium flex-1 break-words ${t.is_done ? "line-through text-text-light" : ""}`}>{t.title}</p>
                    {celebrate && (
                      <Image src="/sho.png" alt="Sho" width={32} height={32} className="rounded-full animate-sho-bounce shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
            {allDone && (
              <div className="glass-mint rounded-2xl p-3 flex items-center gap-2 animate-slide-up">
                <Image src="/sho.png" alt="Sho" width={32} height={32} className="rounded-full animate-sho-bounce" />
                <p className="text-xs font-extrabold text-mint flex-1">今日のToDoぜんぶクリア🎉</p>
              </div>
            )}
            <Link href="/today" className="block text-center text-xs text-mint font-bold py-2">
              すべて見る →
            </Link>
          </div>
        )}

        {/* ── Push通知オプトイン ───────────────────────────────────────── */}
        <div className="mb-4">
          <PushOptIn />
        </div>

        {/* ── クイックアクセス ─────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { href: "/vision", icon: "🎯", label: "ビジョン" },
            { href: "/anti-vision", icon: "🚫", label: "アンチ" },
            { href: "/recommend", icon: "📖", label: "おすすめ" },
          ].map(x => (
            <Link key={x.href} href={x.href}
              className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center hover:border-mint transition active:scale-95">
              <div className="text-2xl mb-1" aria-hidden="true">{x.icon}</div>
              <p className="text-[11px] font-bold text-text-mid">{x.label}</p>
            </Link>
          ))}
        </div>

        {/* ── タイムライン ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold">💬 みんなの今日</h3>
          <Link href="/journal" className="text-xs text-mint font-bold">＋投稿</Link>
        </div>
        {loading ? (
          <SkeletonTimeline />
        ) : posts.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-2xl border border-gray-100">
            <Image src="/sho.png" alt="Sho" width={48} height={48} className="rounded-full mx-auto mb-2 animate-sho-float" />
            <p className="text-sm font-bold mb-1">まだ投稿がないよ</p>
            <p className="text-xs text-text-mid mb-3">最初の一歩になってみる？</p>
            <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
              📝 書いてみる
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map(post => (
              <PostCard key={post.id} post={post} userId={userId}
                isAdmin={isAdmin}
                onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
