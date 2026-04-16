"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import MyCharacter, { AnimalKind } from "@/components/MyCharacter";
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
  const r = 28; const c = 2 * Math.PI * r;
  const dash = `${(c * Math.min(pct, 1)).toFixed(1)} ${c.toFixed(1)}`;
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={`${label} ${Math.round(pct * 100)}%`}>
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor"
            className="text-gray-200 dark:text-[#2a2a2a]" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeLinecap="round" strokeDasharray={dash}
            style={{ transition: "stroke-dasharray 600ms ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl">{emoji}</span>
      </div>
      <span className="text-xs font-bold text-text-mid">{label}</span>
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
  const [morningMood, setMorningMood] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const [charAnimal, setCharAnimal] = useState<AnimalKind | null>(null);
  const [charName, setCharName] = useState<string>("");
  const [lastWritten, setLastWritten] = useState<Date | null>(null);

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
            .select("streak, is_admin, character_animal, character_name").eq("id", user.id).single();
          let animalLocal: AnimalKind | null = null;
          let nameLocal = "";
          if (p) {
            setStreak(p.streak || 0);
            if (p.is_admin) setIsAdmin(true);
            if (p.character_animal) { animalLocal = p.character_animal as AnimalKind; }
            if (p.character_name) { nameLocal = p.character_name; }
          }
          // fallback to localStorage if profile columns not yet migrated
          if (typeof window !== "undefined") {
            try {
              const la = localStorage.getItem("rizup_character_animal") as AnimalKind | null;
              const ln = localStorage.getItem("rizup_character_name");
              if (la && !animalLocal) animalLocal = la;
              if (ln && !nameLocal) nameLocal = ln;
            } catch { /* ignore */ }
          }
          if (animalLocal) setCharAnimal(animalLocal);
          if (nameLocal) setCharName(nameLocal);
          // 最新の投稿日（lastWritten）
          try {
            const { data: lp } = await supabase.from("posts")
              .select("created_at").eq("user_id", user.id)
              .order("created_at", { ascending: false }).limit(1).maybeSingle();
            if (lp?.created_at) setLastWritten(new Date(lp.created_at));
          } catch { /* ignore */ }
          const morningPost = await findTodayPost(supabase, user.id, "morning");
          setMorningDone(!!morningPost);
          if (morningPost?.mood) setMorningMood(morningPost.mood);
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

  const habitPct = habits.total > 0 ? habits.done / habits.total : 0;

  return (
    <main onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      className="min-h-screen bg-[#fafafa] dark:bg-[#111111] pb-20">
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
          {/* My Character：村の住人・毎日の相棒 */}
          <div className="bg-gradient-to-b from-mint-light/50 to-white dark:from-[#162621] dark:to-[#1a1a1a] rounded-2xl border border-mint/20 dark:border-[#2a3a34] shadow-sm px-4 py-5 mb-3 flex flex-col items-center">
            <MyCharacter
              streak={streak}
              name={charName}
              animal={charAnimal || "rabbit"}
              lastWritten={lastWritten}
              size={130}
            />
            {!charAnimal && (
              <Link href="/character-setup" className="mt-2 text-[11px] font-bold text-mint border border-mint rounded-full px-3 py-1 hover:bg-mint-light transition">
                🌱 相棒を選ぶ
              </Link>
            )}
            {/* 時間帯別ジャーナル誘導 */}
            {(() => {
              const h = new Date().getHours();
              if (h >= 5 && h < 12 && !morningDone) {
                return (
                  <Link href="/journal" className="mt-3 bg-mint text-white text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md shadow-mint/30 active:scale-95 transition">
                    今日のひとことを書く ☀️
                  </Link>
                );
              }
              if (h >= 18 && h < 24 && !eveningDone) {
                return (
                  <Link href="/journal" className="mt-3 bg-[#f4976c] text-white text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md shadow-orange/30 active:scale-95 transition">
                    今日の振り返りを書く 🌙
                  </Link>
                );
              }
              return null;
            })()}
          </div>

          {/* 3リング可視化（朝/夜/毎日のこと）＋ 連続日数 */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm px-4 py-5 mb-3">
            <div className="flex items-center justify-around">
              <Ring pct={morningDone ? 1 : 0} color="#6ecbb0" label="朝" emoji={morningDone ? (morningMood >= 4 ? "😊" : morningMood > 0 ? "😔" : "☀️") : "☀️"} />
              <Ring pct={eveningDone ? 1 : 0} color="#f4976c" label="夜" emoji="🌙" />
              <Ring pct={habitPct} color="#5b8def" label="毎日のこと" emoji="🔄" />
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-16 h-16 rounded-full bg-orange-light dark:bg-[#2a1f15] flex items-center justify-center">
                  <span className="text-orange font-extrabold text-lg"><span className="streak-fire">🔥</span>{streak}</span>
                </div>
                <span className="text-xs font-bold text-text-mid">連続</span>
              </div>
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
            <div className="flex flex-col gap-0 bg-[#fafafa] dark:bg-[#111111]">
              {posts.map(p => (
                <div key={p.id} className="bg-[#fafafa] dark:bg-[#111111] border-b border-gray-100 dark:border-[#2a2a2a]">
                  <PostCard post={p} userId={userId} isAdmin={isAdmin}
                    onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} />
                </div>
              ))}
              <p className="text-center text-xs text-text-light py-6 bg-[#fafafa] dark:bg-[#111111]">ここまでだよ🌿</p>
            </div>
          )}
        </div>
      </div>
      {/* FAB: 新規投稿 */}
      <Link
        href="/journal"
        aria-label="ジャーナルを書く"
        className="fixed right-4 bottom-20 z-40 w-14 h-14 rounded-full bg-mint text-white shadow-xl shadow-mint/40 flex items-center justify-center text-2xl font-extrabold active:scale-95 transition">
        ＋
      </Link>
      <button
        onClick={refresh}
        disabled={refreshing}
        aria-label="タイムラインを更新"
        className="fixed right-4 bottom-40 z-40 w-11 h-11 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] text-text-mid shadow-lg flex items-center justify-center disabled:opacity-50 active:scale-95 transition">
        {refreshing ? "…" : "🔄"}
      </button>
      <BottomNav />
    </main>
  );
}
