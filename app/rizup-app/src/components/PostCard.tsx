"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

function Avatar({ url, size = 40 }: { url?: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const isUrl = url?.startsWith("http") && !err;
  return isUrl ? (
    <img src={url!} alt="" width={size} height={size} className="rounded-full object-cover bg-mint-light shrink-0" style={{ width: size, height: size }} onError={() => setErr(true)} />
  ) : (
    <div className="rounded-full bg-mint-light flex items-center justify-center shrink-0" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {url && !url.startsWith("http") ? url : "🌿"}
    </div>
  );
}

const moodEmojis = ["", "😔", "😐", "🙂", "😊", "🤩"];
const reactionTypes = [
  { type: "cheer", emoji: "🌱", label: "応援してる" },
  { type: "relate", emoji: "🤝", label: "わかるよ" },
  { type: "amazing", emoji: "✨", label: "すごい！" },
] as const;

interface PostCardProps {
  post: {
    id: string;
    user_id?: string;
    type: string;
    content: string;
    mood: number;
    ai_feedback: string | null;
    image_url?: string | null;
    created_at: string;
    profiles?: { name: string; avatar_url: string | null };
  };
  userId?: string | null;
  isAdmin?: boolean;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, newContent: string) => void;
}

export default function PostCard({ post, userId, isAdmin, onDelete, onEdit }: PostCardProps) {
  const [counts, setCounts] = useState<Record<string, number>>({ cheer: 0, relate: 0, amazing: 0 });
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ id: string; content: string; profiles?: { name: string } }[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);
  const [displayContent, setDisplayContent] = useState(post.content);

  const isOwner = userId && post.user_id === userId;
  const canDelete = isOwner || isAdmin;
  const name = post.profiles?.name || "ユーザー";
  const time = new Date(post.created_at).toLocaleString("ja-JP", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  // Load reactions and comments
  useEffect(() => {
    const load = async () => {
      // Count reactions
      const { data: allReactions } = await supabase
        .from("reactions").select("type, user_id").eq("post_id", post.id);
      if (allReactions) {
        const c: Record<string, number> = { cheer: 0, relate: 0, amazing: 0 };
        const mine = new Set<string>();
        allReactions.forEach((r) => {
          c[r.type] = (c[r.type] || 0) + 1;
          if (userId && r.user_id === userId) mine.add(r.type);
        });
        setCounts(c);
        setMyReactions(mine);
      }
      // Load comments
      const { data: cmts } = await supabase
        .from("comments").select("id, content, profiles(name)")
        .eq("post_id", post.id).order("created_at", { ascending: true });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (cmts) setComments(cmts as any);
    };
    load();
  }, [post.id, userId]);

  const handleReact = async (type: string) => {
    if (!userId) { window.location.href = "https://rizup-app.vercel.app/login"; return; }
    setAnimating(type);
    setTimeout(() => setAnimating(null), 300);

    if (myReactions.has(type)) {
      // Cancel
      await supabase.from("reactions").delete().match({ post_id: post.id, user_id: userId, type });
      setMyReactions((prev) => { const s = new Set(prev); s.delete(type); return s; });
      setCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
    } else {
      // Add
      await supabase.from("reactions").insert({ post_id: post.id, user_id: userId, type });
      setMyReactions((prev) => new Set(prev).add(type));
      setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
      // Notify post owner
      if (post.user_id !== userId) {
        const emojiMap: Record<string, string> = { cheer: "💪", relate: "🤝", amazing: "✨" };
        supabase.from("notifications").insert({
          user_id: post.user_id,
          type: "reaction",
          content: `あなたの投稿に${emojiMap[type] || ""}リアクションがつきました`,
        }).then(() => {});
      }
    }
  };

  const handleComment = async () => {
    if (!userId) { window.location.href = "https://rizup-app.vercel.app/login"; return; }
    if (!commentText.trim()) return;
    const { data } = await supabase.from("comments")
      .insert({ post_id: post.id, user_id: userId, content: commentText.trim() })
      .select("id, content, profiles(name)").single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setComments((prev) => [...prev, data as any]);
      // Send notification to post owner (skip if commenting on own post)
      if (post.user_id !== userId) {
        const commenterName = (data as unknown as { profiles: { name: string } }).profiles?.name || "誰か";
        supabase.from("notifications").insert({
          user_id: post.user_id,
          type: "comment",
          content: `${commenterName}さんがあなたの投稿にコメントしました：「${commentText.trim().slice(0, 30)}${commentText.trim().length > 30 ? "…" : ""}」`,
        }).then(() => {});
      }
    }
    setCommentText("");
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await supabase.from("posts").update({ content: editContent }).eq("id", post.id);
    setDisplayContent(editContent);
    setEditing(false);
    setShowMenu(false);
    onEdit?.(post.id, editContent);
  };

  const handleDelete = async () => {
    if (!confirm("この投稿を削除しますか？")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    setShowMenu(false);
    if (error) {
      alert("削除に失敗しました。もう一度お試しください。");
      console.error("[PostCard] Delete error:", error);
      return;
    }
    onDelete?.(post.id);
  };

  const handleReport = async () => {
    if (!userId) return;
    await supabase.from("reports").insert({
      post_id: post.id, reporter_id: userId, reason: reportReason,
    });
    // Notify admin via API
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post.id, reporterName: "ユーザー",
        postContent: displayContent, reason: reportReason,
      }),
    }).catch(() => {});
    setReported(true);
    setShowReport(false);
    setReportReason("");
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar url={post.profiles?.avatar_url} size={40} />
        <div className="flex-1">
          <div className="font-bold text-sm">{name}</div>
          <div className="text-xs text-text-light">{time}</div>
        </div>
        <span className="text-xs font-medium text-text-light bg-gray-50 px-2 py-0.5 rounded-full mr-1">
          {post.type === "morning" ? "☀️ 朝" : "🌙 夜"}
        </span>
        {/* Menu for owner or admin */}
        {(isOwner || isAdmin) && (
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} aria-label="メニュー" className="text-text-light hover:text-text p-2 text-lg leading-none">
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-[120px] overflow-hidden">
                {isOwner && (
                  <button onClick={() => { setEditing(true); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition">✏️ 編集</button>
                )}
                {canDelete && (
                  <button onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition">🗑️ 削除</button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-sm mb-2">{moodEmojis[post.mood]} 気分 {post.mood}/5</div>

      {/* Edit mode */}
      {editing ? (
        <div className="mb-3">
          <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)}
            className="w-full border-2 border-mint rounded-xl px-3 py-2 text-sm resize-none h-20 outline-none" maxLength={500} />
          <div className="flex gap-2 mt-2">
            <button onClick={handleEdit} className="bg-mint text-white text-xs font-bold px-4 py-1.5 rounded-full">保存</button>
            <button onClick={() => { setEditing(false); setEditContent(displayContent); }} className="text-xs text-text-light px-4 py-1.5">キャンセル</button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-mid leading-relaxed mb-3 whitespace-pre-wrap">{displayContent}</p>
      )}

      {/* Post Image */}
      {post.image_url && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img src={post.image_url} alt="投稿画像" className="w-full max-h-64 object-cover rounded-xl" />
        </div>
      )}

      {/* AI Feedback */}
      {post.ai_feedback && (
        <div className="bg-mint-light rounded-xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Image src="/sho.png" alt="Sho" width={20} height={20} className="rounded-full" />
            <span className="text-xs font-bold text-mint">Rizup より</span>
          </div>
          <p className="text-xs text-text leading-relaxed">{post.ai_feedback}</p>
        </div>
      )}

      {/* Reactions */}
      <div className="flex gap-2 mb-3">
        {reactionTypes.map((r) => {
          const reacted = myReactions.has(r.type);
          return (
            <button key={r.type} onClick={() => handleReact(r.type)} aria-label={`${r.label} ${counts[r.type]}件`}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium border transition-all ${
                reacted ? "bg-mint-light border-mint text-mint" : "bg-gray-50 border-gray-100 text-text-mid hover:border-mint-mid"
              } ${animating === r.type ? "animate-pop" : ""}`}>
              <span>{r.emoji}</span>
              <span>{r.label}</span>
              <span className="text-text-light">{counts[r.type]}</span>
            </button>
          );
        })}
      </div>

      {/* Report & Comment row */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => setShowComments(!showComments)} aria-label="コメントを表示"
          className="text-xs text-text-light hover:text-mint transition py-1">
          💬 コメント {comments.length > 0 ? `(${comments.length})` : "する"}
        </button>
        {userId && !isOwner && (
          reported ? (
            <span className="text-xs text-text-light">✅ 通報済み</span>
          ) : (
            <button onClick={() => setShowReport(!showReport)} className="text-xs text-text-light hover:text-red-400 transition ml-auto">
              🚩 通報
            </button>
          )
        )}
      </div>

      {/* Report form */}
      {showReport && (
        <div className="border border-red-100 rounded-xl p-3 mb-3 bg-red-50/50">
          <p className="text-xs font-bold text-red-500 mb-2">この投稿を通報する</p>
          <input type="text" value={reportReason} onChange={(e) => setReportReason(e.target.value)}
            placeholder="通報理由（任意）" className="w-full border border-red-100 rounded-lg px-3 py-1.5 text-xs outline-none mb-2" />
          <div className="flex gap-2">
            <button onClick={handleReport} className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">送信</button>
            <button onClick={() => setShowReport(false)} className="text-xs text-text-light px-4 py-1.5">キャンセル</button>
          </div>
        </div>
      )}

      {showComments && (
        <div className="border-t border-gray-50 pt-2">
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
              placeholder="前向きなコメントを書こう..."
              className="flex-1 border border-gray-100 rounded-full px-3 py-1.5 text-xs outline-none focus:border-mint"
              onKeyDown={(e) => { if (e.key === "Enter") { (e.target as HTMLInputElement).blur(); handleComment(); } }} />
            <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); handleComment(); }} disabled={!commentText.trim()} aria-label="コメントを送信"
              className="bg-mint text-white rounded-full px-4 py-2 text-xs font-bold disabled:opacity-30">送信</button>
          </div>
        </div>
      )}
    </div>
  );
}
