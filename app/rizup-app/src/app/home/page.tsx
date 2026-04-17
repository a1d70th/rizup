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


export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [, setHabits] = useState({ done: 0, total: 0 });
  const [morningDone, setMorningDone] = useState(false);
  const [eveningDone, setEveningDone] = useState(false);
  const [, setMorningMood] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const startY = useRef<number | null>(null);
  const [charAnimal, setCharAnimal] = useState<AnimalKind | null>(null);
  const [charName, setCharName] = useState<string>("");
  const [lastWritten, setLastWritten] = useState<Date | null>(null);
  const [justPosted, setJustPosted] = useState(false);
  const [milestoneModal, setMilestoneModal] = useState<{ days: number; message: string } | null>(null);
  const [snackGiven, setSnackGiven] = useState(false);
  const [munching, setMunching] = useState(false);

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
      try {
        const snackKey = `rizup_snack_${today}`;
        setSnackGiven(!!localStorage.getItem(snackKey));
      } catch {}
      setLoading(false);
    })();
  }, []);

  // URL パラメータから posted=true を検知
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("posted") === "true") {
      setJustPosted(true);
      // URLからパラメータを消す
      window.history.replaceState({}, "", "/home");
      // 今日の花カウントをインクリメント
      try {
        const flowerKey = `rizup_flowers_${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" })}`;
        const current = parseInt(localStorage.getItem(flowerKey) || '0');
        localStorage.setItem(flowerKey, String(current + 1));
      } catch {}
      // 3秒後に消す
      const t = setTimeout(() => setJustPosted(false), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // マイルストーン到達チェック
  useEffect(() => {
    if (streak <= 0) return;
    const companion = charName && charName.trim() ? charName : "もも";
    const milestones: Record<number, string> = {
      3: `3日続いた！${companion}が喜んでるよ🌱`,
      7: "1週間！すごい、本当にすごいよ✨",
      14: "2週間続けた。これは本物だ🔥",
      30: "1ヶ月！あなたは変わった🌟",
    };
    const msg = milestones[streak];
    if (!msg) return;
    const key = `rizup_milestone_${streak}`;
    if (typeof window !== "undefined" && !localStorage.getItem(key)) {
      localStorage.setItem(key, new Date().toISOString());
      setMilestoneModal({ days: streak, message: msg });
    }
  }, [streak, charName]);

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

  // lastWritten から「最後に書いてからの日数」を計算
  const daysSinceLastPost = (() => {
    if (!lastWritten) return 999;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    const lastDay = new Date(lastWritten).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    if (today === lastDay) return 0;
    const diff = Math.floor((new Date(today).getTime() - new Date(lastDay).getTime()) / 86400000);
    return diff;
  })();

  return (
    <main onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
      className="min-h-screen bg-[#fafafa] dark:bg-[#111111] pb-20">
      {/* マイルストーンモーダル + 紙吹雪 */}
      {milestoneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in overflow-hidden">
          {/* 紙吹雪 */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 32 }).map((_, i) => {
              const left = (i * 37) % 100;
              const delay = (i % 8) * 0.12;
              const duration = 2.6 + ((i * 7) % 18) / 10;
              const colors = ["#6ecbb0", "#f4976c", "#ffd479", "#a78bfa", "#f472b6", "#60a5fa"];
              const bg = colors[i % colors.length];
              return (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${left}%`,
                    background: bg,
                    animationDelay: `${delay}s`,
                    animationDuration: `${duration}s`,
                  }}
                />
              );
            })}
          </div>
          <div className="relative bg-white dark:bg-[#1a1a1a] rounded-3xl p-8 mx-6 max-w-sm text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-3xl font-extrabold mb-2 dark:text-gray-100">{milestoneModal.days}日連続！</p>
            <p className="text-sm text-text-mid dark:text-gray-300 mb-6 leading-relaxed">{milestoneModal.message}</p>
            <button
              onClick={() => setMilestoneModal(null)}
              className="bg-mint text-white font-extrabold px-8 py-3 rounded-full shadow-lg shadow-mint/30 active:scale-95 transition"
            >
              ありがとう🌸
            </button>
          </div>
        </div>
      )}
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
          <div className="bg-gradient-to-b from-[#ecfdf5] to-white dark:from-[#0d2818] dark:to-[#1a1a1a] rounded-2xl border border-mint/20 dark:border-[#2a3a34] shadow-sm px-4 py-8 mb-3 flex flex-col items-center relative">
            <MyCharacter
              streak={streak}
              name={charName}
              animal={charAnimal || "rabbit"}
              lastWritten={lastWritten}
              size={160}
              mood={justPosted ? 'good' : munching ? 'good' : snackGiven ? 'good' : (daysSinceLastPost >= 2 && daysSinceLastPost < 999) ? 'bad' : 'neutral'}
            />
            {justPosted && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {["🌸", "✨", "⭐", "🌷", "💫", "🌟", "🎉", "🌿"].map((emoji, i) => {
                  const angle = (i / 8) * Math.PI * 2;
                  return (
                    <span key={i} className="particle text-lg absolute"
                      style={{
                        left: '50%', top: '40%',
                        '--tx': `${Math.cos(angle) * 60}px`,
                        '--ty': `${Math.sin(angle) * 60}px`,
                        animationDelay: `${i * 0.05}s`,
                      } as React.CSSProperties}>
                      {emoji}
                    </span>
                  );
                })}
              </div>
            )}
            {!charAnimal && (
              <Link href="/character-setup" className="mt-2 text-[11px] font-bold text-mint border border-mint rounded-full px-3 py-1 hover:bg-mint-light transition">
                🌱 相棒を選ぶ
              </Link>
            )}
            {/* プログレスバー: 次のステージまで（🥚 あと◯日で◯◯に変身！） */}
            {(() => {
              const thresholds = [0, 3, 7, 21, 45, 75, 100];
              const stageNames = ["", "赤ちゃん", "子供", "大人", "村人", "村長", "伝説"];
              const currentStageIdx = thresholds.findIndex((t, i) => i < thresholds.length - 1 && streak >= t && streak < thresholds[i + 1]);
              if (currentStageIdx === -1 || currentStageIdx >= thresholds.length - 1) return null;
              const nextThreshold = thresholds[currentStageIdx + 1];
              const currentThreshold = thresholds[currentStageIdx];
              const remaining = nextThreshold - streak;
              const progress = (streak - currentThreshold) / (nextThreshold - currentThreshold);
              const nextName = stageNames[currentStageIdx + 1] || "";
              if (!nextName) return null;
              return (
                <div className="w-full mt-3 px-2">
                  <p className="text-[12px] font-extrabold text-center text-text-mid dark:text-gray-200 mb-1.5">
                    🥚 あと{remaining}日で{nextName}に変身！
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-[#2a2a2a] rounded-full h-2 overflow-hidden">
                    <div className="rounded-full h-2 transition-all duration-700"
                      style={{ width: `${Math.max(Math.round(progress * 100), 4)}%`, background: "linear-gradient(90deg, #6ecbb0, #4ecba0)" }} />
                  </div>
                </div>
              );
            })()}
            {/* ストリーク危機バナー（22:00〜23:59・今日未投稿） */}
            {(() => {
              const hour = new Date().getHours();
              const remaining = 24 - hour;
              if (hour >= 22 && hour <= 23 && !morningDone && !eveningDone) {
                const companion = charName && charName.trim() ? charName : "もも";
                return (
                  <div className="w-full mt-2 bg-amber-50 dark:bg-[#2a2515] border border-amber-200 dark:border-[#4a3a20] rounded-xl px-4 py-3 animate-fade-in flex flex-col items-center gap-2">
                    <p className="text-xs font-extrabold text-amber-700 dark:text-amber-300 text-center">
                      ⏰ あと{remaining}時間で連続が途切れちゃう...{companion}が待ってるよ
                    </p>
                    <Link href="/journal"
                      className="bg-amber-500 text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-md active:scale-95 transition">
                      今すぐ書く
                    </Link>
                  </div>
                );
              }
              return null;
            })()}
            {/* おやつボタン（1日1回） */}
            {!snackGiven && !justPosted && (
              <button
                onClick={() => {
                  localStorage.setItem(`rizup_snack_${todayJST()}`, 'true');
                  setSnackGiven(true);
                  setMunching(true);
                  setTimeout(() => setMunching(false), 1500);
                }}
                className="mt-2 text-[11px] font-bold text-orange border border-orange rounded-full px-3 py-1.5 hover:bg-orange-light transition"
              >
                🍪 おやつをあげる
              </button>
            )}
            {munching && (
              <p className="mt-1 text-sm font-extrabold text-orange animate-fade-in">
                もぐもぐ... おいしい！🍪
              </p>
            )}
            {/* ジャーナル誘導（常時表示） */}
            {justPosted && (
              <p className="mt-2 text-sm font-extrabold text-mint animate-fade-in">
                書いてくれたね！ありがとう🌱
              </p>
            )}
            {!justPosted && daysSinceLastPost >= 2 && daysSinceLastPost < 999 && (
              <p className="mt-2 text-sm font-extrabold text-mint animate-fade-in">
                おかえり！待ってたよ🌱
              </p>
            )}
            {!morningDone ? (
              <Link href="/journal" className="mt-3 bg-mint text-white text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md shadow-mint/30 active:scale-95 transition">
                今日のひとことを書く 📝
              </Link>
            ) : !eveningDone ? (
              <Link href="/journal" className="mt-3 bg-[#f4976c] text-white text-sm font-extrabold px-5 py-2.5 rounded-full shadow-md shadow-orange/30 active:scale-95 transition">
                今日の振り返りを書く 🌙
              </Link>
            ) : null}
          </div>

          {/* 今日のステータス（シンプル1行） */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm px-4 py-3 mb-3 flex items-center justify-between">
            <span className="text-sm dark:text-gray-100">
              {morningDone || eveningDone ? "☀️ 今日のひとこと済み ✅" : "📝 今日のひとことまだ"}
            </span>
            <div className="flex items-center gap-1">
              <span className="streak-fire">🔥</span>
              <span className="font-extrabold text-orange">{streak}</span>
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
