"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Confetti from "@/components/Confetti";
import Image from "next/image";
import Link from "next/link";
import { SkeletonTimeline } from "@/components/Skeleton";
import { findTodayPost } from "@/lib/safe-insert";

type TimelineTab = "all" | "following" | "morning" | "evening";
const PAGE_SIZE = 10;

interface PostWithProfile {
  id: string; user_id: string; type: string; content: string;
  mood: number; ai_feedback: string | null; created_at: string;
  image_url?: string | null;
  morning_goal?: string | null;
  goal_achieved?: string | null;
  compound_score_today?: number | null;
  profiles: { name: string; avatar_url: string | null; streak?: number | null };
}

interface Todo { id: string; title: string; is_done: boolean; vision_id: string | null; }

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [habitsCompleted, setHabitsCompleted] = useState({ done: 0, total: 0 });
  const [hasMorningPost, setHasMorningPost] = useState(false);
  const [hasEveningPost, setHasEveningPost] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [confettiKey] = useState(0);

  // Timeline state
  const [tab, setTab] = useState<TimelineTab>("all");
  const [hasMore, setHasMore] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const latestSeenAtRef = useRef<string | null>(null);
  const timelineTopRef = useRef<HTMLDivElement | null>(null);

  const today = todayJST();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase.from("profiles")
            .select("name, streak, trial_ends_at, plan, is_admin")
            .eq("id", user.id).single();
          if (profile) {
            setStreak(profile.streak || 0);
            if (profile.is_admin) setIsAdmin(true);
            if (profile.trial_ends_at) {
              const daysLeft = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000);
              if (daysLeft > 0) setTrialDaysLeft(daysLeft);
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

        // フォロー中IDs
        if (user) {
          try {
            const { data: fol } = await supabase.from("follows")
              .select("followee_id").eq("follower_id", user.id);
            if (fol) setFollowingIds(new Set(fol.map((r: { followee_id: string }) => r.followee_id)));
          } catch { /* ignore */ }
        }

        // 初回タイムライン（streakカラム未作成でも落ちないフォールバック）
        const first = await supabase.from("posts")
          .select("*, profiles(name, avatar_url, streak)")
          .order("created_at", { ascending: false }).limit(PAGE_SIZE);
        let data = first.data;
        if (first.error) {
          const fb = await supabase.from("posts")
            .select("*, profiles(name, avatar_url)")
            .order("created_at", { ascending: false }).limit(PAGE_SIZE);
          data = fb.data;
        }
        if (data) {
          setPosts(data as PostWithProfile[]);
          if (data.length < PAGE_SIZE) setHasMore(false);
          if (data[0]) latestSeenAtRef.current = data[0].created_at;
        }
      } catch (err) {
        console.error("[Home]", err);
      }
      setLoading(false);
    };
    init();
  }, [today]);

  // タブ切替時にページングリセット（フィルターはクライアント側）
  useEffect(() => {
    setHasMore(true);
  }, [tab]);

  // 無限スクロール（依存をref化して IntersectionObserver の再登録ループを防ぐ）
  const postsRef = useRef<PostWithProfile[]>([]);
  const fetchingRef = useRef(false);
  const hasMoreRef = useRef(true);
  useEffect(() => { postsRef.current = posts; }, [posts]);
  useEffect(() => { fetchingRef.current = fetchingMore; }, [fetchingMore]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const fetchMore = useCallback(async () => {
    if (fetchingRef.current || !hasMoreRef.current || postsRef.current.length === 0) return;
    setFetchingMore(true);
    const oldest = postsRef.current[postsRef.current.length - 1].created_at;
    try {
      const first = await supabase.from("posts")
        .select("*, profiles(name, avatar_url, streak)")
        .lt("created_at", oldest)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      let data = first.data;
      if (first.error) {
        const fb = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)")
          .lt("created_at", oldest)
          .order("created_at", { ascending: false })
          .limit(PAGE_SIZE);
        data = fb.data;
      }
      if (data && data.length > 0) {
        setPosts(prev => [...prev, ...(data as PostWithProfile[])]);
        if (data.length < PAGE_SIZE) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("[fetchMore]", err);
      setHasMore(false);
    }
    setFetchingMore(false);
  }, []);

  useEffect(() => {
    if (!loaderRef.current) return;
    const el = loaderRef.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchMore();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [fetchMore, loading]);

  // 新着ポーリング（60秒ごと）
  useEffect(() => {
    const iv = setInterval(async () => {
      if (!latestSeenAtRef.current) return;
      try {
        const { count } = await supabase.from("posts")
          .select("id", { count: "exact", head: true })
          .gt("created_at", latestSeenAtRef.current);
        if (count && count > 0) setNewPostsCount(count);
      } catch { /* ignore */ }
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const refreshTimeline = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase.from("posts")
        .select("*, profiles(name, avatar_url, streak)")
        .order("created_at", { ascending: false }).limit(PAGE_SIZE);
      if (data) {
        setPosts(data as PostWithProfile[]);
        setHasMore(data.length >= PAGE_SIZE);
        if (data[0]) latestSeenAtRef.current = data[0].created_at;
      }
    } catch { /* ignore */ }
    setNewPostsCount(0);
    setRefreshing(false);
    timelineTopRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const filteredPosts = posts.filter(p => {
    if (tab === "all") return true;
    if (tab === "morning") return p.type === "morning";
    if (tab === "evening") return p.type === "evening";
    if (tab === "following") return p.user_id === userId || followingIds.has(p.user_id);
    return true;
  });

  const doneTodos = todayTodos.filter(t => t.is_done).length;
  const totalTodos = todayTodos.length;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Confetti trigger={confettiKey} />
      <Header />
      <div className="max-w-md mx-auto px-4 py-2">
        {/* ── 1行ステータスバー（朝夜・ToDo・習慣・🔥） ─────────────── */}
        <Link href="/today"
          className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2 mb-3 active:scale-[0.99] transition">
          <span className="flex items-center gap-0.5 text-[13px] font-bold">
            <span className={hasMorningPost ? "text-mint" : "text-text-light"}>{hasMorningPost ? "☀️✅" : "☀️⬜"}</span>
            <span className={hasEveningPost ? "text-mint" : "text-text-light"}>{hasEveningPost ? "🌙✅" : "🌙⬜"}</span>
          </span>
          <span className="h-4 w-px bg-gray-200" />
          <span className="text-[13px] font-bold text-mint">
            🔄 {habitsCompleted.done}/{habitsCompleted.total || 0}
          </span>
          <span className="h-4 w-px bg-gray-200" />
          <span className="text-[13px] font-bold text-mint">
            ✅ {doneTodos}/{totalTodos || 0}
          </span>
          <span className="h-4 w-px bg-gray-200" />
          <span className="text-[13px] font-bold text-orange ml-auto">
            <span className="streak-fire">🔥</span>{streak}日
          </span>
        </Link>

        {trialDaysLeft !== null && trialDaysLeft <= 3 && (
          <p className="text-[11px] text-orange mb-2 font-bold text-center">⏰ トライアル残り{trialDaysLeft}日</p>
        )}

        {/* ── タイムライン ────────────────────────────────────────────── */}
        <div ref={timelineTopRef} className="flex items-center justify-between mb-3">
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

        {/* タブフィルター */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-3 shadow-sm overflow-x-auto no-scrollbar">
          {([
            { key: "all", label: "全員", emoji: "🌿" },
            { key: "following", label: "フォロー中", emoji: "🫂" },
            { key: "morning", label: "朝", emoji: "☀️" },
            { key: "evening", label: "夜", emoji: "🌙" },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 min-w-fit px-3 py-2 rounded-xl text-[12px] font-extrabold transition-all whitespace-nowrap ${
                tab === t.key ? "bg-gradient-to-br from-mint-light to-white text-mint shadow-sm scale-[1.02]" : "text-text-light"
              }`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* 新着通知バナー */}
        {newPostsCount > 0 && (
          <button onClick={refreshTimeline}
            className="w-full bg-mint text-white text-[13px] font-extrabold py-2.5 rounded-full shadow-lg shadow-mint/30 mb-3 animate-slide-up hover:bg-mint/90 transition">
            ⬆ 新しい投稿が {newPostsCount} 件あります
          </button>
        )}

        {loading ? (
          <SkeletonTimeline />
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
            <Image src="/icons/icon-192.png" alt="Rizup" width={56} height={56} className="rounded-full mx-auto mb-2 animate-sho-float" />
            <p className="text-sm font-bold mb-1">
              {tab === "following" ? "フォロー中のユーザーの投稿はまだ" :
               tab === "morning" ? "朝の投稿はまだ" :
               tab === "evening" ? "夜の投稿はまだ" : "まだ投稿がないよ"}
            </p>
            <p className="text-xs text-text-mid mb-3">
              {tab === "all" ? "最初の一歩になってみる？" : "全員タブで色んな投稿を見てみよう"}
            </p>
            {tab === "all" ? (
              <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                📝 書いてみる
              </Link>
            ) : (
              <button onClick={() => setTab("all")} className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
                全員を見る
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} userId={userId}
                  isAdmin={isAdmin}
                  onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
              ))}
            </div>
            {/* 無限スクロールセンチネル */}
            {hasMore && (
              <div ref={loaderRef} className="py-6 flex justify-center">
                {fetchingMore ? (
                  <div className="flex items-center gap-2 text-xs text-text-light">
                    <Image src="/icons/icon-192.png" alt="Rizup" width={20} height={20} className="rounded-full animate-sho-float" />
                    読み込み中…
                  </div>
                ) : (
                  <span className="text-xs text-text-light">↓ スクロールでもっと見る</span>
                )}
              </div>
            )}
            {!hasMore && filteredPosts.length >= PAGE_SIZE && (
              <p className="text-center text-xs text-text-light py-6">ここまでだよ🌿</p>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
