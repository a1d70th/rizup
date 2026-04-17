"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import MyCharacter, { AnimalKind } from "@/components/MyCharacter";
import Image from "next/image";
import Link from "next/link";
import { SkeletonTimeline } from "@/components/Skeleton";
import { safeInsertPost } from "@/lib/safe-insert";
import { showToast } from "@/components/Toast";

const FETCH_LIMIT = 20;

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
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayCount, setTodayCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
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
  // Quick-post モーダル（ホームで完結投稿）
  const initRan = useRef(false);
  const [postOpen, setPostOpen] = useState(false);
  const [postMood, setPostMood] = useState(0);
  const [postContent, setPostContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [happyAnim, setHappyAnim] = useState(false);

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
    if (data) {
      const arr = data as PostWithProfile[];
      setPosts(arr);
      // 今日の記録者数をタイムラインから派生（JST 基準・ユーザー重複排除）
      const todayJstStr = todayJST();
      const uniqUsers = new Set(
        arr
          .filter(p => new Date(p.created_at).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" }) === todayJstStr)
          .map(p => p.user_id),
      );
      setTodayCount(uniqUsers.size);
    }
  };

  useEffect(() => {
    // StrictMode の二重実行や親再レンダによる useEffect 再呼び出しを 1 回に制限
    if (initRan.current) return;
    initRan.current = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { await fetchPosts(); setLoading(false); return; }
        setUserId(user.id);

        // ── プロフィール取得（カラム未マイグレ環境でも落ちないよう多段フォールバック） ──
        type Prof = { streak?: number; is_admin?: boolean; character_animal?: string; character_name?: string | null };
        let p: Prof | null = null;
        const tryColumns = async (cols: string): Promise<Prof | null> => {
          const { data, error } = await supabase.from("profiles").select(cols).eq("id", user.id).maybeSingle();
          if (error) return null;
          return data as unknown as Prof;
        };
        p = await tryColumns("streak, is_admin, character_animal, character_name");
        if (!p) p = await tryColumns("streak, is_admin");
        if (!p) p = await tryColumns("id");

        let animalLocal: AnimalKind | null = null;
        let nameLocal = "";
        if (p) {
          if (typeof p.streak === "number") setStreak(p.streak || 0);
          if (p.is_admin) setIsAdmin(true);
          if (p.character_animal) animalLocal = p.character_animal as AnimalKind;
          if (p.character_name) nameLocal = p.character_name;
        }
        // localStorage フォールバック（DB カラム未マイグレでも UI は動く）
        try {
          const la = localStorage.getItem("rizup_character_animal") as AnimalKind | null;
          const ln = localStorage.getItem("rizup_character_name");
          if (la && !animalLocal) animalLocal = la;
          if (ln && !nameLocal) nameLocal = ln;
        } catch { /* ignore */ }
        // 不正値（役職名など）を除去
        const BAD_NAMES = new Set(["アシスタントマネージャー", "マネージャー", "アシスタント", "undefined", "null"]);
        if (nameLocal && BAD_NAMES.has(nameLocal.trim())) {
          nameLocal = "";
          try { localStorage.removeItem("rizup_character_name"); } catch {}
          try { await supabase.from("profiles").update({ character_name: null }).eq("id", user.id); } catch {}
        }
        if (animalLocal) setCharAnimal(animalLocal);
        if (nameLocal) setCharName(nameLocal);
        // 初回ユーザーは自動遷移せず、ホーム上のバナーで誘導（下で描画）

        // ── 今日分データをまとめて 1クエリで取得（JST 0:00〜翌0:00） ──
        const nowJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
        const dayStart = new Date(nowJst); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);

        // 自分の今日の投稿（朝/夜判定用）
        try {
          const { data: myToday } = await supabase.from("posts")
            .select("id, type, mood, created_at")
            .eq("user_id", user.id)
            .gte("created_at", dayStart.toISOString())
            .lt("created_at", dayEnd.toISOString())
            .order("created_at", { ascending: false });
          if (myToday) {
            const morning = myToday.find(p => p.type === "morning");
            const evening = myToday.find(p => p.type === "evening");
            setMorningDone(!!morning);
            setEveningDone(!!evening);
            if (morning?.mood) setMorningMood(morning.mood);
            if (myToday.length > 0) setLastWritten(new Date(myToday[0].created_at));
          }
        } catch { /* ignore */ }

        // peer 効果バッジ（今日の記録者数）は fetchPosts の結果から派生させる
        // → 追加の HEAD count クエリを撤去して 503 を回避

        // サーバー再計算は 2 秒後に遅延実行（体感速度を優先）
        setTimeout(() => {
          fetch("/api/check-progress", { method: "POST" })
            .then(r => r.json())
            .then(d => { if (typeof d?.streak === "number") setStreak(d.streak); })
            .catch(() => {});
        }, 2000);

        await fetchPosts();
      } catch (e) { console.error("[Home]", e); }
      setLoading(false);
    })();
  }, [router]);

  // Quick-post 送信ハンドラ
  const submitQuickPost = async () => {
    if (!userId || postMood === 0 || posting) return;
    setPosting(true);
    const now = new Date();
    const type = now.getHours() < 15 ? "morning" : "evening";
    const payload: Record<string, unknown> = {
      user_id: userId,
      type,
      content: postContent.trim(),
      mood: postMood,
    };
    const { data, error } = await safeInsertPost<{ id: string }>(supabase, payload);
    if (error) {
      if (error.code === "23505") {
        showToast("info", "今日はもう投稿済みだよ");
      } else {
        showToast("error", `投稿に失敗：${error.message}`);
      }
      setPosting(false);
      return;
    }
    // streak 更新（クライアント主導）
    try {
      const { data: recent } = await supabase.from("posts")
        .select("created_at").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(120);
      const toJst = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      const dateSet = new Set((recent || []).map(p => toJst(p.created_at)));
      const todayJstStr = todayJST();
      let newStreak = 0;
      const cursor = new Date(todayJstStr + "T00:00:00");
      if (!dateSet.has(todayJstStr)) cursor.setDate(cursor.getDate() - 1);
      for (let i = 0; i < 120; i++) {
        const k = cursor.toLocaleDateString("en-CA");
        if (dateSet.has(k)) { newStreak++; cursor.setDate(cursor.getDate() - 1); }
        else break;
      }
      setStreak(newStreak);
      try { await supabase.from("profiles").update({ streak: newStreak }).eq("id", userId); } catch {}
    } catch { setStreak(s => s + 1); }
    if (type === "morning") setMorningDone(true); else setEveningDone(true);
    // サーバー同期（非同期）
    fetch("/api/check-progress", { method: "POST" }).catch(() => {});
    fetch("/api/analyze/score", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: data?.id, content: postContent.trim() }),
    }).catch(() => {});
    // タイムラインを更新
    await fetchPosts();
    // UI クローズ＋お祝い演出
    setPostOpen(false);
    setPostMood(0);
    setPostContent("");
    setPosting(false);
    setThanks(true);
    setHappyAnim(true);
    setTimeout(() => setHappyAnim(false), 1500);
    setTimeout(() => setThanks(false), 3000);
  };

  // URL パラメータから subscribed=true を検知（Stripe 成功 → Pro 昇格）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscribed") === "true") {
      showToast("success", "✨ Pro にアップグレードしたよ！ありがとう🌱");
      window.history.replaceState({}, "", "/home");
    }
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
        {/* 初回ユーザー誘導バナー（キャラ未設定時のみ） */}
        {!loading && !charAnimal && (
          <div className="max-w-md mx-auto px-4 pt-3">
            <Link
              href="/character-setup"
              className="block bg-gradient-to-r from-mint to-[#4ecba0] text-white rounded-2xl px-5 py-4 shadow-lg shadow-mint/30 active:scale-[.98] transition">
              <p className="text-base font-extrabold">🌱 キャラを選んでスタート</p>
              <p className="text-[12px] opacity-90 mt-0.5">まずは相棒の動物を選ぼう。30秒で終わるよ</p>
            </Link>
          </div>
        )}
        <div className="max-w-md mx-auto px-4 py-2">
          {/* My Character：村の住人・毎日の相棒 */}
          <div className={`bg-gradient-to-b from-[#ecfdf5] to-white dark:from-[#0d2818] dark:to-[#1a1a1a] rounded-2xl border border-mint/20 dark:border-[#2a3a34] shadow-sm px-4 py-8 mb-3 flex flex-col items-center relative ${happyAnim ? "animate-pet" : ""}`}>
            <MyCharacter
              streak={streak}
              name={charName}
              animal={charAnimal || "rabbit"}
              lastWritten={lastWritten}
              size={160}
              mood={justPosted || happyAnim ? 'good' : (daysSinceLastPost >= 2 && daysSinceLastPost < 999) ? 'bad' : 'neutral'}
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
            {!charAnimal ? (
              <Link href="/character-setup" className="mt-2 text-[11px] font-bold text-mint border border-mint rounded-full px-3 py-1 hover:bg-mint-light transition">
                🌱 相棒を選ぶ
              </Link>
            ) : (
              <Link href="/character-setup?edit=1" className="mt-2 text-[10px] font-bold text-text-light hover:text-mint transition underline-offset-2 hover:underline">
                ✏️ 名前・動物を変更
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
            {/* 書いてくれたね！メッセージ */}
            {thanks && (
              <p className="mt-2 text-sm font-extrabold text-mint animate-fade-in">
                書いてくれてありがとう🌱
              </p>
            )}
            {justPosted && !thanks && (
              <p className="mt-2 text-sm font-extrabold text-mint animate-fade-in">
                書いてくれたね！ありがとう🌱
              </p>
            )}
            {!justPosted && !thanks && daysSinceLastPost >= 2 && daysSinceLastPost < 999 && (
              <p className="mt-2 text-sm font-extrabold text-mint animate-fade-in">
                おかえり！待ってたよ🌱
              </p>
            )}
            {/* 大きな streak バッジ */}
            {streak > 0 && (
              <div className="mt-4 flex items-baseline gap-1 text-mint">
                <span className="text-2xl">🔥</span>
                <span className="text-[24px] font-extrabold leading-none">{streak}</span>
                <span className="text-sm font-extrabold">日連続！</span>
              </div>
            )}
            {/* 今日の記録者数（peer effect） */}
            {todayCount > 0 && (
              <p className="mt-1 text-[12px] font-bold text-orange">
                🔥 今日 {todayCount}人 が記録したよ
              </p>
            )}
            {/* メインアクション: ホーム内モーダルで投稿 */}
            {!morningDone ? (
              <button
                onClick={() => { setPostMood(0); setPostContent(""); setPostOpen(true); }}
                className="mt-4 w-full max-w-xs bg-mint text-white text-base font-extrabold px-6 py-4 rounded-full shadow-lg shadow-mint/30 active:scale-95 transition">
                📝 今日のひとことを書く
              </button>
            ) : !eveningDone ? (
              <button
                onClick={() => { setPostMood(0); setPostContent(""); setPostOpen(true); }}
                className="mt-4 w-full max-w-xs bg-[#f4976c] text-white text-base font-extrabold px-6 py-4 rounded-full shadow-lg shadow-orange/30 active:scale-95 transition">
                🌙 今日の振り返りを書く
              </button>
            ) : (
              <p className="mt-3 text-xs font-bold text-text-mid">今日はもう書いたよ。ゆっくり休んでね🌙</p>
            )}
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
      {/* Quick-post モーダル（ホームで完結） */}
      {postOpen && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm animate-fade-in"
          onClick={() => !posting && setPostOpen(false)}>
          <div
            role="dialog" aria-modal="true" aria-label="今日のひとこと"
            className="bg-white dark:bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-lg font-extrabold dark:text-gray-100">今日のひとこと</p>
                <p className="text-xs text-text-mid">気分を選んで、送るだけでOK</p>
              </div>
              <button onClick={() => setPostOpen(false)} aria-label="閉じる"
                disabled={posting}
                className="w-9 h-9 rounded-full text-text-light hover:bg-gray-100 dark:hover:bg-[#2a2a2a] flex items-center justify-center">✕</button>
            </div>
            <div className="flex gap-3 justify-center mb-4">
              {[
                { v: 4, emoji: "😊", label: "いい感じ", cls: "bg-mint-light border-mint text-mint" },
                { v: 2, emoji: "😔", label: "しんどい", cls: "bg-[#1a2030] border-[#2a3a50] text-[#8aa0c0]" },
              ].map(m => (
                <button key={m.v}
                  onClick={() => setPostMood(m.v)}
                  className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border-2 min-h-[88px] transition-all ${
                    postMood === m.v
                      ? m.cls + " scale-105 shadow-md"
                      : "bg-gray-50 dark:bg-[#2a2a3a] border-gray-200 dark:border-[#3a3a4a] opacity-60"
                  }`}>
                  <span className="text-4xl">{m.emoji}</span>
                  <span className="text-sm font-extrabold">{m.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={postContent}
              onChange={e => setPostContent(e.target.value)}
              placeholder="今日一言（任意）"
              maxLength={500}
              className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#111111] rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-mint mb-4"
            />
            <button
              onClick={submitQuickPost}
              disabled={postMood === 0 || posting}
              className="w-full bg-mint text-white font-extrabold py-4 rounded-full shadow-lg shadow-mint/30 disabled:opacity-40 active:scale-95 transition text-base">
              {posting ? "送信中..." : "送る✨"}
            </button>
            <button
              onClick={() => setPostOpen(false)}
              disabled={posting}
              className="w-full mt-2 text-[15px] text-emerald-400 font-bold py-2">
              今日は書かなくていい
            </button>
          </div>
        </div>
      )}
      <BottomNav />
    </main>
  );
}
