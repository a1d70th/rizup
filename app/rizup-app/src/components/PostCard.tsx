"use client";
import { useState } from "react";
import Image from "next/image";

const moodEmojis = ["", "😔", "😐", "🙂", "😊", "🤩"];
const reactionTypes = [
  { type: "cheer", emoji: "🌱", label: "応援してる" },
  { type: "relate", emoji: "🤝", label: "わかるよ" },
  { type: "amazing", emoji: "✨", label: "すごい！" },
] as const;

interface PostCardProps {
  post: {
    id: string;
    type: string;
    content: string;
    mood: number;
    ai_feedback: string | null;
    created_at: string;
    profiles?: { name: string; avatar_url: string | null };
  };
  reactions?: Record<string, number>;
  userReactions?: string[];
  onReact?: (postId: string, type: string) => void;
  onComment?: (postId: string, text: string) => void;
  comments?: { id: string; content: string; profiles?: { name: string } }[];
}

export default function PostCard({ post, reactions = {}, userReactions = [], onReact, onComment, comments = [] }: PostCardProps) {
  const [animating, setAnimating] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showComments, setShowComments] = useState(false);
  const name = post.profiles?.name || "ユーザー";
  const time = new Date(post.created_at).toLocaleString("ja-JP", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleReact = (type: string) => {
    setAnimating(type);
    setTimeout(() => setAnimating(null), 300);
    onReact?.(post.id, type);
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    onComment?.(post.id, commentText.trim());
    setCommentText("");
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center text-lg">
          {post.profiles?.avatar_url || "🌿"}
        </div>
        <div className="flex-1">
          <div className="font-bold text-sm">{name}</div>
          <div className="text-xs text-text-light">{time}</div>
        </div>
        <span className="text-xs font-medium text-text-light bg-gray-50 px-2 py-0.5 rounded-full">
          {post.type === "morning" ? "☀️ 朝" : "🌙 夜"}
        </span>
      </div>

      {/* Mood */}
      <div className="text-sm mb-2">{moodEmojis[post.mood]} 気分 {post.mood}/5</div>

      {/* Content */}
      <p className="text-sm text-text-mid leading-relaxed mb-3">{post.content}</p>

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

      {/* Reactions with counts */}
      <div className="flex gap-2 mb-3">
        {reactionTypes.map((r) => {
          const count = reactions[r.type] || 0;
          const reacted = userReactions.includes(r.type);
          return (
            <button key={r.type} onClick={() => handleReact(r.type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                reacted ? "bg-mint-light border-mint text-mint" : "bg-gray-50 border-gray-100 text-text-mid hover:border-mint-mid"
              } ${animating === r.type ? "animate-pop" : ""}`}>
              <span>{r.emoji}</span>
              <span>{r.label}</span>
              <span className="text-text-light">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Comments toggle */}
      <button onClick={() => setShowComments(!showComments)}
        className="text-xs text-text-light mb-2 hover:text-mint transition">
        💬 コメント {comments.length > 0 ? `(${comments.length})` : "する"}
      </button>

      {showComments && (
        <div className="border-t border-gray-50 pt-2">
          {/* Existing comments */}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-orange-light flex items-center justify-center text-xs mt-0.5">🌸</div>
              <div className="flex-1">
                <span className="text-xs font-bold">{c.profiles?.name || "ユーザー"}</span>
                <p className="text-xs text-text-mid">{c.content}</p>
              </div>
              <button className="text-xs text-text-light hover:text-orange">♡</button>
            </div>
          ))}
          {/* Comment input */}
          <div className="flex gap-2 mt-2">
            <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
              placeholder="前向きなコメントを書こう..."
              className="flex-1 border border-gray-100 rounded-full px-3 py-1.5 text-xs outline-none focus:border-mint"
              onKeyDown={(e) => { if (e.key === "Enter") handleComment(); }} />
            <button onClick={handleComment} disabled={!commentText.trim()}
              className="bg-mint text-white rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-30">
              送信
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
