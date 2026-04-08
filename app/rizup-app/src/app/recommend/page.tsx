"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { isProOrAbove } from "@/lib/plan";

const categories = [
  { value: "food", label: "グルメ", emoji: "🍽️", group: "place" },
  { value: "cafe", label: "カフェ", emoji: "☕", group: "place" },
  { value: "travel", label: "旅", emoji: "✈️", group: "place" },
  { value: "scenery", label: "絶景", emoji: "🏔️", group: "place" },
  { value: "movie", label: "映画", emoji: "🎬", group: "entertainment" },
  { value: "music", label: "音楽", emoji: "🎵", group: "entertainment" },
  { value: "book", label: "本", emoji: "📕", group: "entertainment" },
  { value: "youtube", label: "YouTube", emoji: "▶️", group: "entertainment" },
  { value: "quote", label: "言葉", emoji: "💬", group: "learn" },
  { value: "habit", label: "習慣", emoji: "🔄", group: "learn" },
  { value: "app", label: "アプリ", emoji: "📱", group: "learn" },
  { value: "study", label: "勉強法", emoji: "📝", group: "learn" },
  { value: "happiness", label: "今日の幸せ", emoji: "😊", group: "positive" },
  { value: "experience", label: "おすすめ体験", emoji: "✨", group: "positive" },
  { value: "motivation", label: "モチベ", emoji: "🔥", group: "positive" },
] as const;

type CategoryValue = typeof categories[number]["value"];

const placeCategories = new Set(["food", "cafe", "travel", "scenery"]);

function getCategoryInfo(type: string) {
  return categories.find(c => c.value === type) || { value: type, label: type, emoji: "📌", group: "other" };
}

function extractMapEmbed(mapUrl: string): string | null {
  // Extract place query from Google Maps URL for embed
  try {
    const url = new URL(mapUrl);
    if (url.hostname.includes("google") && url.pathname.includes("maps")) {
      // Extract query parameter or place name
      const q = url.searchParams.get("q") || url.pathname.split("place/")[1]?.split("/")[0] || "";
      if (q) return `https://www.google.com/maps?q=${encodeURIComponent(decodeURIComponent(q))}&output=embed`;
      return `https://www.google.com/maps?q=${encodeURIComponent(mapUrl)}&output=embed`;
    }
    if (url.hostname.includes("goo.gl") || url.hostname.includes("maps.app")) {
      return null; // Short URLs can't be embedded directly
    }
  } catch { /* invalid URL */ }
  return null;
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  url: string | null;
  map_url: string | null;
  user_id: string | null;
  likes: number;
  posted_by: string;
  created_at: string;
  profiles?: { name: string; avatar_url: string | null };
}

interface RecComment {
  id: string;
  content: string;
  created_at: string;
  profiles?: { name: string };
}

export default function RecommendPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [canPostRec, setCanPostRec] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Form state
  const [formType, setFormType] = useState<CategoryValue>("food");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formMapUrl, setFormMapUrl] = useState("");
  const [posting, setPosting] = useState(false);

  // Comments
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, RecComment[]>>({});
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase.from("profiles").select("plan, trial_ends_at").eq("id", user.id).single();
        if (prof) {
          setCanPostRec(isProOrAbove({ plan: prof.plan, trial_ends_at: prof.trial_ends_at }));
        }
        // Load liked recommendations from localStorage
        const likedKey = `rec_likes_${user.id}`;
        const saved = localStorage.getItem(likedKey);
        if (saved) setLikedIds(new Set(JSON.parse(saved)));
      }
      const { data } = await supabase.from("recommendations")
        .select("*, profiles(name, avatar_url)")
        .order("created_at", { ascending: false }).limit(50);
      if (data) setRecs(data as Recommendation[]);
      setLoading(false);
    };
    init();
  }, []);

  const canPost = canPostRec;

  const handlePost = async () => {
    if (!userId || !formTitle.trim()) return;
    (document.activeElement as HTMLElement)?.blur();
    setPosting(true);
    const { data, error } = await supabase.from("recommendations").insert({
      type: formType,
      title: formTitle.trim(),
      description: formDesc.trim(),
      url: formUrl.trim() || null,
      map_url: placeCategories.has(formType) && formMapUrl.trim() ? formMapUrl.trim() : null,
      user_id: userId,
      posted_by: "user",
      likes: 0,
    }).select("*, profiles(name, avatar_url)").single();
    if (!error && data) {
      setRecs(prev => [data as Recommendation, ...prev]);
      setFormTitle(""); setFormDesc(""); setFormUrl(""); setFormMapUrl("");
      setShowForm(false);
    }
    setPosting(false);
  };

  const handleLike = async (recId: string) => {
    if (!userId) return;
    const isLiked = likedIds.has(recId);
    const newLiked = new Set(likedIds);
    if (isLiked) {
      newLiked.delete(recId);
      await supabase.from("recommendations").update({ likes: Math.max(0, (recs.find(r => r.id === recId)?.likes || 1) - 1) }).eq("id", recId);
    } else {
      newLiked.add(recId);
      await supabase.from("recommendations").update({ likes: (recs.find(r => r.id === recId)?.likes || 0) + 1 }).eq("id", recId);
    }
    setLikedIds(newLiked);
    localStorage.setItem(`rec_likes_${userId}`, JSON.stringify(Array.from(newLiked)));
    setRecs(prev => prev.map(r => r.id === recId ? { ...r, likes: isLiked ? Math.max(0, r.likes - 1) : r.likes + 1 } : r));
  };

  const loadComments = async (recId: string) => {
    if (openComments === recId) { setOpenComments(null); return; }
    setOpenComments(recId);
    const { data } = await supabase.from("comments")
      .select("id, content, created_at, profiles(name)")
      .eq("post_id", recId).order("created_at", { ascending: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (data) setComments(prev => ({ ...prev, [recId]: data as any }));
  };

  const handleComment = async (recId: string) => {
    if (!userId || !commentText.trim()) return;
    (document.activeElement as HTMLElement)?.blur();
    const { data } = await supabase.from("comments")
      .insert({ post_id: recId, user_id: userId, content: commentText.trim() })
      .select("id, content, created_at, profiles(name)").single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (data) setComments(prev => ({ ...prev, [recId]: [...(prev[recId] || []), data as any] }));
    setCommentText("");
  };

  const filtered = filter === "all" ? recs : recs.filter(r => r.type === filter);
  const shoRecs = filtered.filter(r => r.posted_by === "sho");
  const userRecs = filtered.filter(r => r.posted_by !== "sho");

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">📖 おすすめ</h2>
          {canPost && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
              {showForm ? "✕ 閉じる" : "＋ 投稿する"}
            </button>
          )}
        </div>

        {/* Post Form */}
        {showForm && canPost && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <p className="text-sm font-bold mb-3">おすすめを投稿</p>
            {/* Category */}
            <label className="text-xs font-bold text-text-mid block mb-2">カテゴリ</label>
            <div className="grid grid-cols-5 gap-1.5 mb-3">
              {categories.map(c => (
                <button key={c.value} onClick={() => setFormType(c.value)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-[10px] font-bold transition border ${
                    formType === c.value ? "border-mint bg-mint-light text-mint" : "border-gray-100 text-text-mid"}`}>
                  <span className="text-base">{c.emoji}</span>
                  {c.label}
                </button>
              ))}
            </div>
            {/* Title */}
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder="タイトル" maxLength={100}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            {/* Description */}
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
              placeholder="コメント・感想" maxLength={500}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-20 outline-none focus:border-mint mb-2" />
            {/* URL */}
            <input type="url" value={formUrl} onChange={(e) => setFormUrl(e.target.value)}
              placeholder="URL（任意）"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            {/* Map URL for place categories */}
            {placeCategories.has(formType) && (
              <div className="mb-2">
                <input type="url" value={formMapUrl} onChange={(e) => setFormMapUrl(e.target.value)}
                  placeholder="GoogleマップURL（任意）"
                  className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" />
                {formMapUrl && (
                  <p className="text-[10px] text-text-light mt-1">📍 マップリンクがカードに表示されます</p>
                )}
              </div>
            )}
            <button onClick={handlePost} disabled={posting || !formTitle.trim()}
              className="w-full bg-mint text-white font-bold py-3 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30 mt-1">
              {posting ? "投稿中..." : "投稿する"}
            </button>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1 scrollbar-hide">
          <button onClick={() => setFilter("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
              filter === "all" ? "border-mint bg-mint-light text-mint" : "border-gray-200 text-text-mid bg-white"}`}>
            すべて
          </button>
          {categories.map(c => (
            <button key={c.value} onClick={() => setFilter(c.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                filter === c.value ? "border-mint bg-mint-light text-mint" : "border-gray-200 text-text-mid bg-white"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Sho's Picks (pinned at top) */}
        {shoRecs.length > 0 && (
          <>
            <p className="text-sm font-bold text-mint mb-3">🌿 Sho のおすすめ</p>
            {shoRecs.map((r) => {
              const cat = getCategoryInfo(r.type);
              return (
                <div key={r.id} className="bg-gradient-to-br from-mint-light to-white rounded-2xl p-4 border border-mint/20 shadow-sm mb-3 animate-fade-in">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl shrink-0 shadow-sm">{cat.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold">{r.title}</h4>
                      <p className="text-xs text-text-mid leading-relaxed mt-0.5">{r.description}</p>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-mint mt-1 inline-block hover:underline">🔗 リンクを開く</a>
                      )}
                      {r.map_url && (
                        <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-mint mt-1 ml-2 inline-block hover:underline">📍 マップで見る</a>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-mint">{cat.emoji} {cat.label} — Sho のおすすめ</span>
                      </div>
                    </div>
                  </div>
                  {/* Map Preview */}
                  {r.map_url && extractMapEmbed(r.map_url) && (
                    <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100">
                        <iframe src={extractMapEmbed(r.map_url)!} className="w-full h-full pointer-events-none" loading="lazy" />
                      </div>
                    </a>
                  )}
                  {/* Like & Comment */}
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => handleLike(r.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition ${likedIds.has(r.id) ? "text-mint" : "text-text-light hover:text-mint"}`}>
                      {likedIds.has(r.id) ? "💚" : "🤍"} {r.likes}
                    </button>
                    <button onClick={() => loadComments(r.id)} className="text-xs text-text-light hover:text-mint transition">
                      💬 コメント{comments[r.id]?.length ? ` (${comments[r.id].length})` : ""}
                    </button>
                  </div>
                  {openComments === r.id && (
                    <CommentSection comments={comments[r.id] || []} commentText={commentText}
                      setCommentText={setCommentText} onSubmit={() => handleComment(r.id)} />
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* User Recommendations */}
        {userRecs.length > 0 && (
          <>
            <p className="text-sm font-bold text-orange mb-3 mt-4">💬 みんなのおすすめ</p>
            {userRecs.map((r) => {
              const cat = getCategoryInfo(r.type);
              return (
                <div key={r.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 animate-fade-in">
                  <div className="flex gap-3 items-start">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-light to-orange-light flex items-center justify-center text-2xl shrink-0">{cat.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold">{r.title}</h4>
                      <p className="text-xs text-text-mid leading-relaxed mt-0.5">{r.description}</p>
                      {r.url && (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-mint mt-1 inline-block hover:underline">🔗 リンクを開く</a>
                      )}
                      {r.map_url && (
                        <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-mint mt-1 ml-2 inline-block hover:underline">📍 マップで見る</a>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] font-bold text-orange">{cat.emoji} {cat.label} — {r.profiles?.name || "ユーザー"}のおすすめ</span>
                      </div>
                    </div>
                  </div>
                  {/* Map Preview */}
                  {r.map_url && extractMapEmbed(r.map_url) && (
                    <a href={r.map_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
                      <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-100">
                        <iframe src={extractMapEmbed(r.map_url)!} className="w-full h-full pointer-events-none" loading="lazy" />
                      </div>
                    </a>
                  )}
                  {/* Like & Comment */}
                  <div className="flex items-center gap-3 mt-3">
                    <button onClick={() => handleLike(r.id)}
                      className={`flex items-center gap-1 text-xs font-medium transition ${likedIds.has(r.id) ? "text-mint" : "text-text-light hover:text-mint"}`}>
                      {likedIds.has(r.id) ? "💚" : "🎬"} {r.likes}
                    </button>
                    <button onClick={() => loadComments(r.id)} className="text-xs text-text-light hover:text-mint transition">
                      💬 コメント{comments[r.id]?.length ? ` (${comments[r.id].length})` : ""}
                    </button>
                  </div>
                  {openComments === r.id && (
                    <CommentSection comments={comments[r.id] || []} commentText={commentText}
                      setCommentText={setCommentText} onSubmit={() => handleComment(r.id)} />
                  )}
                </div>
              );
            })}
          </>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm text-text-light">まだおすすめがありません</p>
            {canPost && <p className="text-xs text-text-light mt-1">最初のおすすめを投稿しよう！</p>}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function CommentSection({ comments, commentText, setCommentText, onSubmit }: {
  comments: RecComment[];
  commentText: string;
  setCommentText: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border-t border-gray-50 pt-2 mt-3">
      {comments.length === 0 && (
        <p className="text-xs text-text-light text-center py-2">最初のコメントを送ろう！</p>
      )}
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-orange-light flex items-center justify-center text-xs mt-0.5">🌸</div>
          <div className="flex-1">
            <span className="text-xs font-bold">{c.profiles?.name || "ユーザー"}</span>
            <p className="text-xs text-text-mid">{c.content}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-2">
        <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
          placeholder="コメントを書く..."
          className="flex-1 border border-gray-100 rounded-full px-3 py-1.5 text-xs outline-none focus:border-mint"
          onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); onSubmit(); } }} />
        <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); onSubmit(); }} disabled={!commentText.trim()}
          className="bg-mint text-white rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-30">送信</button>
      </div>
    </div>
  );
}
