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
}

export default function PostCard({ post, reactions = {}, userReactions = [], onReact }: PostCardProps) {
  const [animating, setAnimating] = useState<string | null>(null);
  const name = post.profiles?.name || "ユーザー";
  const time = new Date(post.created_at).toLocaleString("ja-JP", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const handleReact = (type: string) => {
    setAnimating(type);
    setTimeout(() => setAnimating(null), 300);
    onReact?.(post.id, type);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-mint-light flex items-center justify-center text-lg">
          {post.profiles?.avatar_url ? "🌿" : "🌿"}
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
      <div className="text-sm mb-2">
        {moodEmojis[post.mood]} 気分 {post.mood}/5
      </div>

      {/* Content */}
      <p className="text-sm text-text-mid leading-relaxed mb-3">{post.content}</p>

      {/* AI Feedback */}
      {post.ai_feedback && (
        <div className="bg-mint-light rounded-xl p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Image src="/sho.png" alt="Sho" width={20} height={20} className="rounded-full" />
            <span className="text-xs font-bold text-mint">Sho のフィードバック</span>
          </div>
          <p className="text-xs text-text leading-relaxed">{post.ai_feedback}</p>
        </div>
      )}

      {/* Reactions */}
      <div className="flex gap-2">
        {reactionTypes.map((r) => {
          const count = reactions[r.type] || 0;
          const reacted = userReactions.includes(r.type);
          return (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                reacted
                  ? "bg-mint-light border-mint text-mint"
                  : "bg-gray-50 border-gray-100 text-text-mid hover:border-mint-mid"
              } ${animating === r.type ? "animate-pop" : ""}`}
            >
              <span>{r.emoji}</span>
              <span>{r.label}</span>
              {count > 0 && <span className="text-text-light ml-0.5">{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
