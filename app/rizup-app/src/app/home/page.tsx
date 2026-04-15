"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";
import Link from "next/link";
import { SkeletonTimeline } from "@/components/Skeleton";
import { findTodayPost } from "@/lib/safe-insert";

const FETCH_LIMIT = 500;

interface PostWithProfile {
  id: string; user_id: string; type: string; content: string;
  mood: number; ai_feedback: string | null; created_at: string;
  image_url?: string | null;
  morning_goal?: string | null;
  goal_achieved?: string | null;
  compound_score_today?: number | null;
  profiles: { name: string; avatar_url: string | null; streak?: number | null };
}

const todayJST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

function Ring({ pct, color, label, emoji }: { pct: number; color: string; label: string; emoji: string }) {
  const r = 22; const c = 2 * Math.PI * r;
  const dash = `${(c * Math.min(pct, 1)).toFixed(1)} ${c.toFixed(1)}`;
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${label} ${Math.round(pct * 100)}%`}>
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
          <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor"
            className="text-gray-200 dark:text-[#2a2a2a]" strokeWidth="5" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeLinecap="round" strokeDasharray={dash}
            style={{ transition: "stroke-dasharray 600ms ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-base">{emoji}</span>
      </div>
      <span className="text-[10px] font-bold text-text-mid">{label}</span>
    </div>
  );
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [habits, setHabits] = useState({ done: 0, total: 0 });
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [todayQuote, setTodayQuote] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);

  const fetchPosts = async () => {
    const first = await supabase.from("posts")
      .select("*, profiles(name, avatar_url, streak)")
      .order("created_at", { ascending: false }).limit(FETCH_LIMIT);
    let data = first.data;
    if (first.error) {
      const fb = await supabase.from("posts")
        .select("*, profiles(name, avatar_url)")
        .order("created_at", { ascending: false }).limit(FETCH_LIMIT);
      data = fb.data;
    }
    if (data) setPosts(data as PostWithProfile[]);
  };

  useEffect(() => {
    const today = todayJST();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: p } = await supabase.from("profiles")
            .select("streak, is_admin").eq("id", user.id).single();
          if (p) { setStreak(p.streak || 0); if (p.is_admin) setIsAdmin(true); }
          setMorningDone(!!(await findTodayPost(supabase, user.id, "morning")));
          setEveningDone(!!(await findTodayPost(supabase, user.id, "evening")));
          try {
            const { data: h } = await supabase.from("habits")
              .select("id").eq("user_id", user.id).is("archived_at", null);
            if (h) {
              const { data: logs } = await supabase.from("habit_logs")
                .select("habit_id").eq("user_id", user.id).eq("logged_date", today);
              setHabits({ done: (logs || []).length, total: h.length });
            }
          } catch { /* ignore */ }
          // 今日のひとこと：最も近い vision の title or description から1文
          try {
            const { data: vs } = await supabase.from("visions")
              .select("title, description, time_horizon").eq("user_id", user.id)
              .order("time_horizon").limit(5);
            if (vs && vs.length > 0) {
              const seed = vs[Math.floor(Date.now() / 86400000) % vs.length];
              setTodayQuote(seed.description?.split(/[。\n]/)[0]?.trim() || seed.title);
            }
          } catch { /* ignore */ }
          fetch("/api/check-progress", { method: "POST" })
            .then(r => r.json()).then(d => { if (d.streak !== undefined) setStreak(d.streak); })
            .catch(() => {});
        }
        await fetchPosts();
      } catch (e) { console.error("[Home]", e); }
      setLoading(false);
    })();
  }, []);

  const refresh = async () => { setRefreshing(true); await fetchPosts(); setRefreshing(false); };

  const onStart = (e: React.TouchEvent) => {
    startY.current = window.scrollY > 0 ? null : e.touches[0].clientY;
  };
  const onMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) setPull(Math.min(dy * 0.5, 80));
  };
  const onEnd = async () => {
    const s = startY.current; startY.current = null;
    if (s == null) { setPull(0); return; }
    if (pull > 60) { setPull(40); await refresh(); }
    setPull(0);
  };

  const habitPct = habits.total > 0 ? habits.done / habits.total : 0;

  return (
    <div onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      className="min-h-screen bg-bg dark:bg-[#111111] pb-20">
      <Header />
      <div style={{
        transform: pull ? `translateY(${pull}px)` : undefined,
        transition: startY.current ? "none" : "transform 200ms",
      }}>
        {pull > 0 && (
          <div className="flex justify-center py-2 text-xs text-text-light">
            {refreshing ? "更新中…" : pull > 60 ? "離して更新" : "↓ 引っ張って更新"}
          </div>
        )}
        <div className="max-w-md mx-auto px-4 py-2">
          {/* 3リング可視化（朝/夜/習慣）＋ 連続日数 */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm px-3 py-3 mb-3">
            <div className="flex items-center justify-around">
              <Ring pct={morningDone ? 1 : 0} color="#6ecbb0" label="朝" emoji="☀️" />
              <Ring pct={eveningDone ? 1 : 0} color="#f4976c" label="夜" emoji="🌙" />
              <Ring pct={habitPct} color="#5b8def" label="習慣" emoji="🔄" />
              <div className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-full bg-orange-light dark:bg-[#2a1f15] flex items-center justify-center">
                  <span className="text-orange font-extrabold text-base"><span className="streak-fire">🔥</span>{streak}</span>
                </div>
                <span className="text-[10px] font-bold text-text-mid">連続</span>
              </div>
            </div>
          </div>

          {/* 今日のひとこと（ビジョン抜粋） */}
          {todayQuote && (
            <div className="bg-mint-light dark:bg-[#1a2620] border border-mint/20 rounded-2xl px-3 py-2 mb-3 flex items-start gap-2">
              <span className="text-base">🎯</span>
              <p className="text-[12px] font-bold text-mint flex-1 leading-relaxed">{todayQuote}</p>
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold dark:text-gray-100">💬 みんなの今日</h3>
            <div className="flex items-center gap-2">
              <button onClick={refresh} disabled={refreshing} aria-label="タイムラインを更新"
                className="text-xs text-text-mid hover:text-mint transition disabled:opacity-50">
                {refreshing ? "更新中…" : "🔄"}
              </button>
              <Link href="/journal" className="text-xs text-mint font-extrabold">＋投稿</Link>
            </div>
          </div>

          {loading ? (
            <SkeletonTimeline />
          ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a]">
              <Image src="/icons/icon-192.png" alt="Rizup" width={56} height={56} className="rounded-full mx-auto mb-2 animate-sho-float" />
              <p className="text-sm font-bold mb-1 dark:text-gray-100">まだ投稿がないよ</p>
              <p className="text-xs text-text-mid mb-3">最初の一歩になってみる？</p>
              <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                📝 書いてみる
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {posts.map(p => (
                <PostCard key={p.id} post={p} userId={userId} isAdmin={isAdmin}
                  onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} />
              ))}
              <p className="text-center text-xs text-text-light py-6">ここまでだよ🌿</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
