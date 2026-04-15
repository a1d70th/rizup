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

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [habits, setHabits] = useState({ done: 0, total: 0 });
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
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

  return (
    <div onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      className="min-h-screen bg-bg pb-20">
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
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm px-3 py-2.5 mb-3">
            <span className="flex items-center gap-1 text-[12px] font-extrabold">
              <span className="text-text-mid">朝</span>
              <span className={morningDone ? "text-mint" : "text-text-light"}>{morningDone ? "☀️" : "⬜"}</span>
              <span className="text-text-mid ml-1">夜</span>
              <span className={eveningDone ? "text-mint" : "text-text-light"}>{eveningDone ? "🌙" : "⬜"}</span>
            </span>
            <span className="h-4 w-px bg-gray-200 dark:bg-[#2a2a2a]" />
            <span className="text-[12px] font-extrabold text-mint">🔄{habits.done}/{habits.total || 0}</span>
            <span className="text-[12px] font-extrabold text-orange ml-auto">
              <span className="streak-fire">🔥</span>{streak}
            </span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold">💬 みんなの今日</h3>
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
              <p className="text-sm font-bold mb-1">まだ投稿がないよ</p>
              <p className="text-xs text-text-mid mb-3">最初の一歩になってみる？</p>
              <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                📝 書いてみる
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
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
