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

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [habitsCompleted, setHabitsCompleted] = useState({ done: 0, total: 0 });
  const [hasMorningPost, setHasMorningPost] = useState(false);
  const [hasEveningPost, setHasEveningPost] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [pullOffset, setPullOffset] = useState(0);
  const pullStartYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase.from("profiles")
            .select("name, streak, is_admin").eq("id", user.id).single();
          if (profile) {
            setStreak(profile.streak || 0);
            if (profile.is_admin) setIsAdmin(true);
          }

          const morningP = await findTodayPost(supabase, user.id, "morning");
          setHasMorningPost(!!morningP);
          const eveningP = await findTodayPost(supabase, user.id, "evening");
          setHasEveningPost(!!eveningP);

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

        await fetchPosts();
      } catch (err) {
        console.error("[Home]", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  const refreshTimeline = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  // Pull-to-refresh (touch)
  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY > 0) { pullStartYRef.current = null; return; }
    pullStartYRef.current = e.touches[0].clientY;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (pullStartYRef.current == null) return;
    const dy = e.touches[0].clientY - pullStartYRef.current;
    if (dy > 0) setPullOffset(Math.min(dy * 0.5, 80));
  };
  const onTouchEnd = async () => {
    const start = pullStartYRef.current;
    pullStartYRef.current = null;
    if (start == null) { setPullOffset(0); return; }
    if (pullOffset > 60) {
      setPullOffset(40);
      await refreshTimeline();
    }
    setPullOffset(0);
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-h-screen bg-bg pb-20"
    >
      <Header />
      <div
        style={{
          transform: pullOffset ? `translateY(${pullOffset}px)` : undefined,
          transition: pullStartYRef.current ? "none" : "transform 200ms",
        }}
      >
        {pullOffset > 0 && (
          <div className="flex justify-center py-2 text-xs text-text-light">
            {refreshing ? "更新中…" : pullOffset > 60 ? "離して更新" : "↓ 引っ張って更新"}
          </div>
        )}
        <div className="max-w-md mx-auto px-4 py-2">
          {/* ステータスバー（ToDoなし・朝夜・習慣・🔥） */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm px-3 py-2.5 mb-3">
            <span className="flex items-center gap-1 text-[12px] font-extrabold">
              <span className="text-text-mid">朝</span>
              <span className={hasMorningPost ? "text-mint" : "text-text-light"}>{hasMorningPost ? "☀️" : "⬜"}</span>
              <span className="text-text-mid ml-1">夜</span>
              <span className={hasEveningPost ? "text-mint" : "text-text-light"}>{hasEveningPost ? "🌙" : "⬜"}</span>
            </span>
            <span className="h-4 w-px bg-gray-200 dark:bg-[#2a2a2a]" />
            <span className="text-[12px] font-extrabold text-mint">
              🔄{habitsCompleted.done}/{habitsCompleted.total || 0}
            </span>
            <span className="text-[12px] font-extrabold text-orange ml-auto">
              <span className="streak-fire">🔥</span>{streak}
            </span>
          </div>

          {/* タイムライン */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-extrabold">💬 みんなの今日</h3>
            <div className="flex items-center gap-2">
              <button onClick={refreshTimeline} disabled={refreshing}
                aria-label="タイムラインを更新"
                className="text-xs text-text-mid hover:text-mint transition disabled:opacity-50">
                {refreshing ? "更新中…" : "🔄"}
              </button>
              <Link href="/journal" className="text-xs text-mint font-extrabold">＋投稿</Link>
            </div>
          </div>

          {loading ? (
            <SkeletonTimeline />
          ) : posts.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
              <Image src="/icons/icon-192.png" alt="Rizup" width={56} height={56} className="rounded-full mx-auto mb-2 animate-sho-float" />
              <p className="text-sm font-bold mb-1">まだ投稿がないよ</p>
              <p className="text-xs text-text-mid mb-3">最初の一歩になってみる？</p>
              <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                📝 書いてみる
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map(post => (
                <PostCard key={post.id} post={post} userId={userId}
                  isAdmin={isAdmin}
                  onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
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
