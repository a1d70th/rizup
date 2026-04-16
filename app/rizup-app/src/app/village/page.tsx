"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import MyCharacter, { AnimalKind } from "@/components/MyCharacter";
import Link from "next/link";
import { showToast } from "@/components/Toast";

interface VillageMember {
  id: string;
  name: string;
  avatar_url: string | null;
  character_animal: AnimalKind | null;
  character_name: string | null;
  streak: number | null;
  plan?: string | null;
  is_self?: boolean;
  latest_post?: { id: string; type: string; content: string; created_at: string } | null;
}

// Season: JST 月で判定
function currentSeason(): "spring" | "summer" | "autumn" | "winter" | "night" {
  const h = new Date().getHours();
  if (h >= 0 && h < 5) return "night";
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

const SEASON_BG: Record<string, string> = {
  spring: "from-pink-50 via-mint-light to-white",
  summer: "from-yellow-50 via-mint-light to-sky-50",
  autumn: "from-orange-light via-amber-50 to-mint-light",
  winter: "from-sky-50 via-slate-50 to-white",
  night: "from-indigo-900 via-slate-900 to-black",
};

const SEASON_LABEL: Record<string, string> = {
  spring: "🌸 桜咲く村",
  summer: "🌻 ひまわりの村",
  autumn: "🍁 紅葉の村",
  winter: "❄️ 雪の村",
  night: "✨ 星降る村",
};

export default function VillagePage() {
  const [self, setSelf] = useState<VillageMember | null>(null);
  const [members, setMembers] = useState<VillageMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [selected, setSelected] = useState<VillageMember | null>(null);
  const [showTransform, setShowTransform] = useState(false);
  const [transformText, setTransformText] = useState("");
  const [showStrength, setShowStrength] = useState(false);
  const [strengthText, setStrengthText] = useState("");
  const [sending, setSending] = useState(false);

  const season = useMemo(() => currentSeason(), []);
  const maxFriends = isPro ? 7 : 5;

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        const { data: me } = await supabase.from("profiles")
          .select("id, name, avatar_url, character_animal, character_name, streak, plan")
          .eq("id", user.id).single();
        if (me) {
          setIsPro(me.plan === "pro" || me.plan === "premium");
          const { data: myLatest } = await supabase.from("posts")
            .select("id, type, content, created_at")
            .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          setSelf({ ...me, latest_post: myLatest, is_self: true });
        }

        // friends 関係を取得（未マイグレなら空で OK）
        let friendIds: string[] = [];
        try {
          const { data: f } = await supabase.from("friends")
            .select("friend_id").eq("owner_id", user.id).eq("status", "accepted");
          if (f) friendIds = f.map((x: { friend_id: string }) => x.friend_id);
        } catch { /* ignore */ }

        if (friendIds.length > 0) {
          const { data: profs } = await supabase.from("profiles")
            .select("id, name, avatar_url, character_animal, character_name, streak")
            .in("id", friendIds).limit(maxFriends);
          if (profs) {
            // 最新投稿を各自拾う（失敗しても無視）
            const withPosts: VillageMember[] = await Promise.all(profs.map(async (pr) => {
              try {
                const { data: lp } = await supabase.from("posts")
                  .select("id, type, content, created_at")
                  .eq("user_id", pr.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
                return { ...pr, latest_post: lp || null };
              } catch { return { ...pr, latest_post: null }; }
            }));
            setMembers(withPosts);
          }
        }
      } catch (e) { console.error("[village]", e); }
      setLoading(false);
    })();
  }, [maxFriends]);

  const sendTransform = async () => {
    if (!userId || !selected || !transformText.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("journal_transformations").insert({
        from_id: userId,
        to_id: selected.id,
        body: transformText.trim(),
        source_post_id: selected.latest_post?.id ?? null,
      });
      if (error) throw error;
      // notifications
      try {
        await supabase.from("notifications").insert({
          user_id: selected.id,
          type: "transform",
          content: `🎭 あなたの今日の一言を、${self?.name || "誰か"}が自分なりに感じてくれたよ`,
        });
      } catch { /* ignore */ }
      showToast("success", "送ったよ🌿");
      setShowTransform(false);
      setTransformText("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "送れませんでした";
      showToast("error", msg);
    }
    setSending(false);
  };

  const sendStrength = async () => {
    if (!userId || !selected || !strengthText.trim() || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("strength_gifts").insert({
        from_id: userId,
        to_id: selected.id,
        body: strengthText.trim(),
        source_post_id: selected.latest_post?.id ?? null,
      });
      if (error) throw error;
      try {
        await supabase.from("notifications").insert({
          user_id: selected.id,
          type: "strength",
          content: `✨ あなたの強みを見つけてくれた人がいるよ`,
        });
      } catch { /* ignore */ }
      showToast("success", "強みを贈ったよ✨");
      setShowStrength(false);
      setStrengthText("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "送れませんでした";
      showToast("error", msg);
    }
    setSending(false);
  };

  const House = ({ m, isSelf, size }: { m: VillageMember; isSelf: boolean; size: number }) => (
    <button
      onClick={() => { setSelected(m); setShowTransform(false); setShowStrength(false); }}
      className="flex flex-col items-center gap-1 focus:outline-none active:scale-95 transition"
      aria-label={`${m.character_name || m.name}の家`}
    >
      <div
        className={`relative bg-white dark:bg-[#1a1a1a] rounded-2xl border-2 ${isSelf ? "border-mint shadow-md shadow-mint/30" : "border-gray-100 dark:border-[#2a2a2a]"} flex items-center justify-center`}
        style={{ width: size, height: size }}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: `${size / 4}px solid transparent`,
            borderRight: `${size / 4}px solid transparent`,
            borderBottom: `${size / 5}px solid ${isSelf ? "#6ecbb0" : "#f4976c"}`,
          }}
        />
        <MyCharacter
          streak={m.streak || 0}
          name={m.character_name || m.name}
          animal={(m.character_animal as AnimalKind) || "rabbit"}
          size={size - 40}
        />
      </div>
      <span className="text-[10px] font-bold text-text-mid dark:text-gray-200 truncate max-w-[80px]">
        {isSelf ? "あなたの家" : (m.character_name || m.name)}
      </span>
    </button>
  );

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#111111] pb-20">
      <Header />
      <div className={`max-w-md mx-auto bg-gradient-to-b ${SEASON_BG[season]} dark:from-[#111111] dark:via-[#131716] dark:to-[#111111]`}>
        <div className="px-4 py-4">
          {/* 森のシルエット背景 */}
          <div className="relative mb-2 overflow-hidden rounded-2xl" style={{ height: 60 }}>
            <svg viewBox="0 0 400 60" className="w-full h-full opacity-10 dark:opacity-5">
              <path d="M0,60 L20,20 L40,60 L60,15 L80,60 L100,25 L120,60 L140,10 L160,60 L180,20 L200,60 L220,18 L240,60 L260,12 L280,60 L300,22 L320,60 L340,8 L360,60 L380,25 L400,60 Z" fill="#6ecbb0" />
            </svg>
          </div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-extrabold dark:text-gray-100">{SEASON_LABEL[season]}</h2>
            <span className="text-[11px] font-bold text-mint bg-white/70 dark:bg-[#1a1a1a]/70 rounded-full px-3 py-1">
              仲間 {members.length}/{maxFriends}{!isPro && "（Proで+2）"}
            </span>
          </div>

          {loading ? (
            <p className="text-center text-xs text-text-light py-12">読み込み中…</p>
          ) : (
            <>
              {/* 自分の家（中央・大） */}
              <div className="flex justify-center my-4">
                {self && <House m={self} isSelf={true} size={160} />}
              </div>

              {/* 仲間の家（グリッド） */}
              {members.length === 0 ? (
                <div className="bg-white/80 dark:bg-[#1a1a1a]/80 rounded-2xl p-6 text-center mb-4">
                  <p className="text-sm font-extrabold mb-5 dark:text-gray-100">仲間が増えると、ここに家が建つよ</p>

                  <div className="flex flex-col gap-5 mb-6">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">🏠</span>
                      <p className="text-xs font-extrabold dark:text-gray-100">ホームのタイムラインを見る</p>
                    </div>
                    <span className="text-text-light text-lg">↓</span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">🌱</span>
                      <p className="text-xs font-extrabold dark:text-gray-100">気になる投稿に「わかる」を押す</p>
                    </div>
                    <span className="text-text-light text-lg">↓</span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-3xl">✨</span>
                      <p className="text-xs font-extrabold dark:text-gray-100">お互いが押したら村人になれる</p>
                    </div>
                  </div>

                  <Link href="/home" className="inline-block bg-mint text-white font-extrabold px-6 py-3 rounded-full shadow-lg shadow-mint/30 text-sm">
                    タイムラインを見てみる →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {members.map(m => (
                    <House key={m.id} m={m} isSelf={false} size={100} />
                  ))}
                </div>
              )}

              {/* 選択時のアクションカード */}
              {selected && !showTransform && !showStrength && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-mint/30 dark:border-[#2a3a34] rounded-2xl p-4 shadow-md animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-extrabold dark:text-gray-100">
                      {selected.is_self ? "あなたの家" : `${selected.character_name || selected.name}の家`}
                    </p>
                    <button onClick={() => setSelected(null)} className="text-text-light text-xs">✕</button>
                  </div>
                  {selected.latest_post ? (
                    <div className="bg-mint-light/50 dark:bg-[#162621] rounded-xl px-3 py-2 mb-3">
                      <p className="text-[11px] font-bold text-mint mb-1">
                        {selected.latest_post.type === "morning" ? "☀️ 今日のひとこと" : "🌙 今夜のふりかえり"}
                      </p>
                      <p className="text-[13px] text-text dark:text-gray-100 leading-relaxed whitespace-pre-wrap break-words">
                        {selected.latest_post.content?.slice(0, 160) || "（本文なし）"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-light mb-3">まだ投稿がないみたい</p>
                  )}
                  {!selected.is_self && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          showToast("success", "わかる🌱 を贈ったよ");
                        }}
                        className="w-full bg-mint-light text-mint text-xs font-extrabold py-2 rounded-full"
                      >
                        🌱 わかる
                      </button>
                      <button
                        onClick={() => setShowStrength(true)}
                        className="w-full bg-orange-light text-orange text-xs font-extrabold py-2 rounded-full"
                      >
                        ✨ 強みを贈る
                      </button>
                      <button
                        onClick={() => setShowTransform(true)}
                        className="w-full border-2 border-mint text-mint text-xs font-extrabold py-2 rounded-full"
                      >
                        🎭 変身する（自分ならこう感じる）
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* 変身モーダル（インライン） */}
              {selected && showTransform && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-mint/30 rounded-2xl p-4 shadow-md animate-fade-in">
                  <p className="text-sm font-extrabold mb-2 dark:text-gray-100">🎭 自分ならこう感じる</p>
                  {selected.latest_post && (
                    <div className="bg-gray-50 dark:bg-[#222] rounded-xl px-3 py-2 mb-3 text-[12px] text-text-mid dark:text-gray-300">
                      {selected.latest_post.content?.slice(0, 120)}
                    </div>
                  )}
                  <textarea
                    value={transformText}
                    onChange={e => setTransformText(e.target.value)}
                    maxLength={300}
                    placeholder="相手の気持ちを、自分ならどう感じるか書いてみよう"
                    className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#111] rounded-xl p-3 text-sm outline-none focus:border-mint resize-none h-24 mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowTransform(false)} className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] text-text-mid py-2.5 rounded-full text-xs font-bold">
                      やめる
                    </button>
                    <button onClick={sendTransform} disabled={!transformText.trim() || sending}
                      className="flex-[2] bg-mint text-white py-2.5 rounded-full text-xs font-extrabold disabled:opacity-30">
                      {sending ? "送信中..." : "送る"}
                    </button>
                  </div>
                </div>
              )}

              {/* 強み贈与モーダル */}
              {selected && showStrength && (
                <div className="bg-white dark:bg-[#1a1a1a] border border-orange/30 rounded-2xl p-4 shadow-md animate-fade-in">
                  <p className="text-sm font-extrabold mb-2 dark:text-gray-100">✨ 強みを発見した</p>
                  <p className="text-[11px] text-text-mid mb-2">{selected.character_name || selected.name}さんのここが素敵だと思った</p>
                  <textarea
                    value={strengthText}
                    onChange={e => setStrengthText(e.target.value)}
                    maxLength={200}
                    placeholder="例：続ける力が本当にすごい"
                    className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#111] rounded-xl p-3 text-sm outline-none focus:border-orange resize-none h-20 mb-2"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowStrength(false)} className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] text-text-mid py-2.5 rounded-full text-xs font-bold">
                      やめる
                    </button>
                    <button onClick={sendStrength} disabled={!strengthText.trim() || sending}
                      className="flex-[2] bg-orange text-white py-2.5 rounded-full text-xs font-extrabold disabled:opacity-30">
                      {sending ? "送信中..." : "贈る"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
