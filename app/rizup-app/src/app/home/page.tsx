"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";
import Link from "next/link";
import { SkeletonTimeline } from "@/components/Skeleton";

interface PostWithProfile {
  id: string; user_id: string; type: string; content: string;
  mood: number; ai_feedback: string | null; created_at: string;
  image_url?: string | null;
  profiles: { name: string; avatar_url: string | null };
}

interface Todo {
  id: string;
  title: string;
  is_done: boolean;
  vision_id: string | null;
}

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [streak, setStreak] = useState(0);
  const [shoInsight, setShoInsight] = useState("おはよう。今日も自分のペースで前に進もう。");
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [habitsCompleted, setHabitsCompleted] = useState({ done: 0, total: 0 });
  const [hasMorningPost, setHasMorningPost] = useState(false);
  const [hasEveningPost, setHasEveningPost] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [celebrating, setCelebrating] = useState<string | null>(null);

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
            // Sho Insight （キャッシュ）
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

          // 今日のToDo
          const { data: todos } = await supabase.from("todos")
            .select("id, title, is_done, vision_id")
            .eq("user_id", user.id).eq("due_date", today)
            .order("is_done").order("created_at").limit(5);
          if (todos) setTodayTodos(todos);

          // 今日の朝投稿チェック
          const { data: morningP } = await supabase.from("posts")
            .select("id").eq("user_id", user.id).eq("type", "morning").eq("posted_date", today).maybeSingle();
          setHasMorningPost(!!morningP);

          const { data: eveningP } = await supabase.from("posts")
            .select("id").eq("user_id", user.id).eq("type", "evening").eq("posted_date", today).maybeSingle();
          setHasEveningPost(!!eveningP);

          // 今日の習慣達成
          const { data: allHabits } = await supabase.from("habits")
            .select("id").eq("user_id", user.id).is("archived_at", null);
          if (allHabits) {
            const { data: logs } = await supabase.from("habit_logs")
              .select("habit_id").eq("user_id", user.id).eq("logged_date", today);
            setHabitsCompleted({ done: (logs || []).length, total: allHabits.length });
          }

          // 進捗 & streak
          fetch("/api/check-progress", { method: "POST" }).then(r => r.json()).then(d => {
            if (d.streak !== undefined) setStreak(d.streak);
          }).catch(() => {});
        }

        // タイムライン
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
    await supabase.from("todos")
      .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq("id", t.id);
    setTodayTodos(prev => prev.map(x => x.id === t.id ? { ...x, is_done: newDone } : x));
    if (newDone) {
      setCelebrating(t.id);
      setTimeout(() => setCelebrating(null), 700);
    }
  };

  const doneTodos = todayTodos.filter(t => t.is_done).length;
  const totalTodos = todayTodos.length;
  const allDone = totalTodos > 0 && doneTodos === totalTodos;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Sho 挨拶 */}
        <div className="bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 mb-4 border border-mint/20">
          <div className="flex items-center gap-2 mb-1">
            <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
            <span className="text-xs font-bold text-mint flex-1">Sho から</span>
            {streak > 0 && <span className="text-[10px] font-bold text-orange bg-white px-2 py-0.5 rounded-full">🔥 {streak}日連続</span>}
          </div>
          <p className="text-sm text-text leading-relaxed">
            {userName && `${userName}さん、`}{shoInsight}
          </p>
          {trialDaysLeft !== null && trialDaysLeft <= 3 && (
            <p className="text-[10px] text-orange mt-2 font-bold">⏰ トライアル残り{trialDaysLeft}日</p>
          )}
        </div>

        {/* ヒーローカード：今日やること */}
        <div className="bg-white rounded-2xl p-5 border-2 border-mint/30 shadow-sm mb-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✅</span>
            <h2 className="text-base font-extrabold flex-1">今日やること</h2>
            {totalTodos > 0 && (
              <span className="text-xs font-extrabold text-mint">{doneTodos}/{totalTodos}</span>
            )}
          </div>

          {!hasMorningPost && totalTodos === 0 ? (
            /* 朝まだ未投稿 */
            <Link href="/journal"
              className="flex items-center gap-3 bg-orange-light rounded-xl p-4 hover:opacity-80 transition">
              <span className="text-2xl">☀️</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-orange">朝ジャーナルで今日を始めよう</p>
                <p className="text-[10px] text-text-mid">気分と今日の3つを決めるだけ</p>
              </div>
              <span className="text-orange">→</span>
            </Link>
          ) : totalTodos === 0 ? (
            <Link href="/today"
              className="block text-center py-6 bg-mint-light/50 rounded-xl">
              <p className="text-sm font-bold text-mint">今日のToDoを決めよう ＋</p>
            </Link>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-3">
                {todayTodos.map(t => {
                  const celebrate = celebrating === t.id;
                  return (
                    <div key={t.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition ${t.is_done ? "bg-mint-light/50" : "bg-gray-50"}`}>
                      <button onClick={() => handleToggleTodo(t)}
                        aria-label={t.is_done ? `${t.title}を未完了にする` : `${t.title}を完了にする`}
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition shrink-0 ${t.is_done ? "bg-mint border-mint text-white animate-check-pulse" : "border-gray-300 bg-white"}`}>
                        {t.is_done ? "✓" : ""}
                      </button>
                      <p className={`text-sm font-medium flex-1 break-words ${t.is_done ? "line-through text-text-light" : ""}`}>{t.title}</p>
                      {celebrate && (
                        <Image src="/sho.png" alt="Sho" width={36} height={36} className="rounded-full animate-sho-bounce shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
              {allDone && (
                <div className="bg-mint-light rounded-xl p-3 flex items-center gap-2 mb-2">
                  <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full animate-sho-bounce" />
                  <p className="text-xs font-bold text-mint flex-1">すごい！今日のToDoぜんぶクリアしたね🎉</p>
                </div>
              )}
              <Link href="/today" className="block text-center text-xs text-mint font-bold py-2">
                すべて見る →
              </Link>
            </>
          )}
        </div>

        {/* 夜 & 夜ジャーナル未投稿 */}
        {!isMorning && !hasEveningPost && hasMorningPost && (
          <Link href="/journal" className="block bg-mint-light rounded-2xl p-4 mb-4 border border-mint/30 hover:opacity-80 transition">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌙</span>
              <div className="flex-1">
                <p className="text-sm font-bold text-mint">夜ジャーナルで今日を締めくくろう</p>
                <p className="text-[10px] text-text-mid">朝の目標の振り返りと感謝を書こう</p>
              </div>
              <span className="text-mint">→</span>
            </div>
          </Link>
        )}

        {/* 習慣サマリー */}
        {habitsCompleted.total > 0 && (
          <Link href="/habits"
            className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 hover:border-mint transition">
            <div className="relative w-12 h-12">
              <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6ecbb0" strokeWidth="3"
                  strokeDasharray={`${(habitsCompleted.done / habitsCompleted.total) * 100}, 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-mint">
                {habitsCompleted.done}/{habitsCompleted.total}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">🔄 今日の習慣</p>
              <p className="text-[10px] text-text-light">タップしてチェック</p>
            </div>
            <span className="text-text-light">→</span>
          </Link>
        )}

        {/* クイックアクセス */}
        <div className="flex gap-2 mb-5">
          <Link href="/vision" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-xs font-bold text-text-mid hover:border-mint transition">🎯 ビジョン</Link>
          <Link href="/anti-vision" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-xs font-bold text-text-mid hover:border-mint transition">🚫 アンチ</Link>
          <Link href="/growth" className="flex-1 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm text-center text-xs font-bold text-text-mid hover:border-mint transition">📈 成長</Link>
        </div>

        {/* タイムライン */}
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
