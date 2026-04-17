"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function initialOf(name?: string | null): string {
  const raw = (name || "").trim();
  if (!raw || /^sho$/i.test(raw)) return "R"; // 旧シード "Sho" はブランド頭文字に
  const first = Array.from(raw)[0];
  return first.toUpperCase();
}

function Avatar({ url, size = 48, name }: { url?: string | null; size?: number; name?: string | null }) {
  const [err, setErr] = useState(false);
  const isUrl = url?.startsWith("http") && !err;
  const initial = initialOf(name);
  if (isUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url!}
        alt={name || ""}
        width={size}
        height={size}
        className="rounded-full object-cover bg-mint shrink-0 ring-2 ring-white dark:ring-[#1a1a1a] shadow-sm"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    );
  }
  const fontSize = Math.round(size * 0.46);
  return (
    <div
      className="relative rounded-full shrink-0 ring-2 ring-white dark:ring-[#1a1a1a] shadow-md overflow-hidden"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)",
      }}
      aria-label={`${name || "匿名"}のアバター`}
    >
      {/* ハイライト光沢 */}
      <span
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      {/* 右上のアクセントドット */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          top: size * 0.1,
          right: size * 0.1,
          width: size * 0.12,
          height: size * 0.12,
          borderRadius: "50%",
          background: "rgba(167, 243, 208, 0.8)",
        }}
      />
      {/* イニシャル */}
      <span
        className="absolute inset-0 flex items-center justify-center text-white font-black tracking-tight"
        style={{
          fontSize,
          fontFamily: "'Inter','SF Pro Display','Helvetica Neue',-apple-system,system-ui,sans-serif",
          letterSpacing: "-0.02em",
          textShadow: "0 1px 2px rgba(0,0,0,0.15)",
        }}
      >
        {initial}
      </span>
    </div>
  );
}

const reactionTypes = [
  { type: "cheer",   emoji: "🌱", label: "応援", color: "mint" },
  { type: "relate",  emoji: "❤️", label: "いいね", color: "mint" },
  { type: "amazing", emoji: "✨", label: "すごい", color: "mint" },
] as const;

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "今";
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}日前`;
  return new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
}

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
    morning_goal?: string | null;
    goal_achieved?: string | null;
    compound_score_today?: number | null;
    wake_time?: string | null;
    bedtime?: string | null;
    sleep_hours?: number | null;
    profiles?: { name: string; avatar_url: string | null; streak?: number | null };
  };
  userId?: string | null;
  isAdmin?: boolean;
  onDelete?: (postId: string) => void;
  onEdit?: (postId: string, newContent: string) => void;
}

const CLAMP_LINES = 5;

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
  const [expanded, setExpanded] = useState(false);
  const [showStrengthGift, setShowStrengthGift] = useState(false);
  const [strengthText, setStrengthText] = useState("");
  const [strengthSent, setStrengthSent] = useState(false);

  const isOwner = userId && post.user_id === userId;
  const canDelete = isOwner || isAdmin;
  // 旧シード "Sho" や未設定ユーザーは名前非表示（「ユーザー」は出さない）
  const rawName = (post.profiles?.name || "").trim();
  const isShoSeed = /^sho$/i.test(rawName);
  const name = isShoSeed ? "" : rawName;
  const streakDays = post.profiles?.streak ?? 0;
  const time = formatRelativeTime(post.created_at);
  const isMorning = post.type === "morning";
  const safeContent = displayContent || "";
  const isLong = safeContent.length > 140 || safeContent.split("\n").length > CLAMP_LINES;

  useEffect(() => {
    // 先に localStorage から復元（通信前でも押下状態を即反映）
    try {
      const raw = localStorage.getItem(`rizup_reactions_${post.id}`);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        if (Array.isArray(arr)) setMyReactions(new Set(arr));
      }
    } catch { /* ignore */ }
    const load = async () => {
      try {
        const { data: allReactions } = await supabase
          .from("reactions")
          .select("type, user_id")
          .eq("post_id", post.id);
        if (allReactions) {
          const c: Record<string, number> = { cheer: 0, relate: 0, amazing: 0 };
          const mine = new Set<string>();
          allReactions.forEach((r) => {
            c[r.type] = (c[r.type] || 0) + 1;
            if (userId && r.user_id === userId) mine.add(r.type);
          });
          setCounts(c);
          setMyReactions(mine);
          try {
            localStorage.setItem(`rizup_reactions_${post.id}`, JSON.stringify(Array.from(mine)));
          } catch { /* ignore */ }
        }
      } catch { /* reactions テーブル未作成時は無視 */ }
      try {
        const { data: cmts } = await supabase
          .from("comments")
          .select("id, content, profiles(name)")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (cmts) setComments(cmts as any);
      } catch { /* comments テーブル未作成時は無視 */ }
    };
    load();
  }, [post.id, userId]);

  const handleReact = async (type: string) => {
    if (!userId) {
      window.location.href = "https://rizup-app.vercel.app/login";
      return;
    }
    setAnimating(type);
    setTimeout(() => setAnimating(null), 400);

    const persistMine = (s: Set<string>) => {
      try {
        localStorage.setItem(`rizup_reactions_${post.id}`, JSON.stringify(Array.from(s)));
      } catch { /* ignore */ }
    };
    try {
      if (myReactions.has(type)) {
        await supabase.from("reactions").delete().match({ post_id: post.id, user_id: userId, type });
        setMyReactions((prev) => {
          const s = new Set(prev);
          s.delete(type);
          persistMine(s);
          return s;
        });
        setCounts((prev) => ({ ...prev, [type]: Math.max(0, (prev[type] || 0) - 1) }));
      } else {
        await supabase.from("reactions").insert({ post_id: post.id, user_id: userId, type });
        setMyReactions((prev) => {
          const s = new Set(prev).add(type);
          persistMine(s);
          return s;
        });
        setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));
        if (post.user_id !== userId) {
          try {
            const emojiMap: Record<string, string> = { cheer: "🌱", relate: "🤝", amazing: "✨" };
            await supabase
              .from("notifications")
              .insert({
                user_id: post.user_id,
                type: "reaction",
                content: `あなたの投稿に${emojiMap[type] || ""}リアクションがつきました`,
              });
          } catch { /* notifications テーブル未作成時は無視 */ }
        }
      }
    } catch {
      console.warn("[PostCard] reaction error - テーブル未作成の可能性");
    }
  };

  const handleComment = async () => {
    if (!userId) {
      window.location.href = "https://rizup-app.vercel.app/login";
      return;
    }
    if (!commentText.trim()) return;
    const { data } = await supabase
      .from("comments")
      .insert({ post_id: post.id, user_id: userId, content: commentText.trim() })
      .select("id, content, profiles(name)")
      .single();
    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setComments((prev) => [...prev, data as any]);
      if (post.user_id !== userId) {
        const commenterName = (data as unknown as { profiles: { name: string } }).profiles?.name || "誰か";
        supabase
          .from("notifications")
          .insert({
            user_id: post.user_id,
            type: "comment",
            content: `${commenterName}さんがあなたの投稿にコメントしました：「${commentText.trim().slice(0, 30)}${
              commentText.trim().length > 30 ? "…" : ""
            }」`,
          })
          .then(() => {});
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

  const handleSendStrength = async () => {
    if (!userId || !strengthText.trim() || !post.user_id) return;
    try {
      await supabase.from("strength_gifts").insert({
        from_id: userId,
        to_id: post.user_id,
        body: strengthText.trim(),
        source_post_id: post.id,
      });
      try {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          type: "strength",
          content: `✨ あなたの強みを見つけてくれた人がいるよ`,
        });
      } catch { /* ignore */ }
      setStrengthSent(true);
      setShowStrengthGift(false);
      setStrengthText("");
    } catch { /* ignore - likely migration not applied */ }
  };

  const handleReport = async () => {
    if (!userId) return;
    await supabase
      .from("reports")
      .insert({ post_id: post.id, reporter_id: userId, reason: reportReason });
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: post.id,
        reporterName: "ユーザー",
        postContent: displayContent,
        reason: reportReason,
      }),
    }).catch(() => {});
    setReported(true);
    setShowReport(false);
    setReportReason("");
  };

  const badgeCls = isMorning
    ? "bg-orange-light text-orange"
    : "bg-mint-light text-mint";

  return (
    <article className="bg-white dark:bg-[#1c1c1e] border-b border-gray-100 dark:border-[#2a2a2a] overflow-hidden animate-fade-in mb-0 p-0">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Avatar url={post.profiles?.avatar_url} size={48} name={rawName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {name && <span className="font-extrabold text-base truncate">{name}</span>}
            {streakDays > 0 && (
              <span className="text-[11px] font-bold text-orange bg-orange-light rounded-full px-2 py-0.5">
                🔥 {streakDays}日
              </span>
            )}
          </div>
          <div className="text-[13px] text-text-light">{time}</div>
        </div>
        <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full ${badgeCls} shrink-0`}>
          {isMorning ? "☀️ 朝" : "🌙 夜"}
        </span>
        {(isOwner || isAdmin) && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="メニュー"
              className="text-text-light hover:text-text p-1 text-lg leading-none"
            >
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-[120px] overflow-hidden">
                {isOwner && (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 transition"
                  >
                    ✏️ 編集
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition"
                  >
                    🗑️ 削除
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* 朝活: 起床時刻バッジ（みんなの習慣が見える） */}
      {isMorning && (post.wake_time || post.bedtime || post.sleep_hours) && (
        <div className="mx-4 mb-2 flex items-center gap-2 flex-wrap">
          {post.wake_time && (
            <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-orange bg-orange-light rounded-full px-3 py-1">
              ⏰ {post.wake_time} 起床
            </span>
          )}
          {post.bedtime && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-mid bg-gray-100 dark:bg-[#2a2a2a] rounded-full px-2.5 py-1">
              🌙 {post.bedtime}
            </span>
          )}
          {post.sleep_hours != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-mid bg-gray-100 dark:bg-[#2a2a2a] rounded-full px-2.5 py-1">
              ⏱ {post.sleep_hours}h
            </span>
          )}
        </div>
      )}
      {!isMorning && post.goal_achieved && (
        <div className="mx-4 mb-2 px-3 py-2 bg-gradient-to-r from-mint-light/60 to-white border border-mint/20 rounded-xl">
          <p className="text-[11px] font-bold text-mint">
            {post.goal_achieved === "yes"
              ? "✅ 朝の目標、達成！"
              : post.goal_achieved === "partial"
              ? "🌱 朝の目標、少し前進"
              : "💭 今日は次につなげる日"}
          </p>
        </div>
      )}

      {/* Body */}
      {editing ? (
        <div className="px-4 py-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full border-2 border-mint rounded-xl px-3 py-2 text-[15px] resize-none h-24 outline-none leading-relaxed"
            maxLength={500}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleEdit} className="bg-mint text-white text-sm font-bold px-5 py-2 rounded-full">
              保存
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditContent(displayContent);
              }}
              className="text-sm text-text-light px-4 py-2"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pt-2 pb-3">
          <p
            className="text-base text-text dark:text-gray-100 leading-[1.85] whitespace-pre-wrap break-words"
            style={
              !expanded && isLong
                ? {
                    display: "-webkit-box",
                    WebkitLineClamp: CLAMP_LINES,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontWeight: 600,
                  }
                : { fontWeight: 600 }
            }
          >
            {safeContent}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((x) => !x)}
              className="mt-1 text-[13px] font-bold text-mint hover:underline"
            >
              {expanded ? "閉じる" : "続きを読む"}
            </button>
          )}
        </div>
      )}

      {/* Post Image */}
      {post.image_url && (
        <div className="mx-4 mb-3 rounded-2xl overflow-hidden border border-gray-100">
          <img
            src={post.image_url}
            alt="投稿画像"
            className="w-full max-h-80 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Reactions — 絵文字のみのシンプル表示 */}
      <div className="flex gap-2 px-4 pb-3">
        {reactionTypes.map((r) => {
          const reacted = myReactions.has(r.type);
          return (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              aria-label={`${r.label} ${counts[r.type]}件`}
              className={`flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border transition-all active:scale-90 ${
                reacted
                  ? "bg-mint-light border-mint shadow-sm"
                  : "bg-transparent border-gray-100 dark:border-[#2a2a2a] hover:border-mint-mid"
              } ${animating === r.type ? "animate-pop" : ""}`}
            >
              <span className="text-lg leading-none">{r.emoji}</span>
              {counts[r.type] > 0 && (
                <span className={`text-xs font-bold ${reacted ? "text-mint" : "text-text-light"}`}>
                  {counts[r.type]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Comments row */}
      <div className="flex items-center gap-3 px-4 pb-3 border-t border-gray-50 pt-3">
        <button
          onClick={() => setShowComments(!showComments)}
          aria-label="コメントを表示"
          className="flex items-center gap-1.5 text-[13px] text-text-mid hover:text-mint transition py-1 font-medium"
        >
          <span className="text-base">💬</span>
          {comments.length > 0 ? `${comments.length}件` : "コメント"}
        </button>
        {userId && !isOwner && !strengthSent && (
          <button
            onClick={() => setShowStrengthGift(s => !s)}
            aria-label="強みを発見した"
            className="text-xs text-orange hover:text-orange/80 transition font-bold"
          >
            ✨ 強みを発見
          </button>
        )}
        {strengthSent && <span className="text-xs text-orange ml-1">✨ 贈った</span>}
        {userId && !isOwner && (
          reported ? (
            <span className="text-xs text-text-light ml-auto">✅ 通報済み</span>
          ) : (
            <button
              onClick={() => setShowReport(!showReport)}
              className="text-xs text-text-light hover:text-red-400 transition ml-auto"
            >
              🚩 通報
            </button>
          )
        )}
      </div>

      {/* 強み贈与フォーム */}
      {showStrengthGift && (
        <div className="mx-4 mb-3 border border-orange/30 rounded-xl p-3 bg-orange-light/30 dark:bg-[#2a1f15]">
          <p className="text-xs font-bold text-orange mb-2">✨ {name || "この人"}のここが素敵だと思った</p>
          <textarea
            value={strengthText}
            onChange={e => setStrengthText(e.target.value)}
            maxLength={200}
            placeholder="例：続ける力がすごい"
            className="w-full border border-orange/30 rounded-lg px-3 py-2 text-xs outline-none resize-none h-16 mb-2 bg-white dark:bg-[#1a1a1a]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSendStrength}
              disabled={!strengthText.trim()}
              className="bg-orange text-white text-xs font-extrabold px-4 py-1.5 rounded-full disabled:opacity-40"
            >
              贈る
            </button>
            <button onClick={() => setShowStrengthGift(false)} className="text-xs text-text-light px-4 py-1.5">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* Report form */}
      {showReport && (
        <div className="mx-4 mb-3 border border-red-100 rounded-xl p-3 bg-red-50/50">
          <p className="text-xs font-bold text-red-500 mb-2">この投稿を通報する</p>
          <input
            type="text"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="通報理由（任意）"
            className="w-full border border-red-100 rounded-lg px-3 py-2 text-xs outline-none mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleReport}
              className="bg-red-500 text-white text-xs font-bold px-4 py-1.5 rounded-full"
            >
              送信
            </button>
            <button
              onClick={() => setShowReport(false)}
              className="text-xs text-text-light px-4 py-1.5"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {showComments && (
        <div className="mx-4 mb-4 pt-2">
          {comments.length === 0 && (
            <p className="text-xs text-text-light text-center py-3">最初のコメントを送ろう！</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 mb-2.5">
              <div className="w-7 h-7 rounded-full bg-orange-light flex items-center justify-center text-xs mt-0.5 shrink-0">
                🌸
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                <span className="text-[12px] font-extrabold">{c.profiles?.name || "匿名"}</span>
                <p className="text-[13px] text-text-mid leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="前向きなコメントを書こう..."
              className="flex-1 border border-gray-100 rounded-full px-4 py-2 text-[13px] outline-none focus:border-mint"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                  handleComment();
                }
              }}
            />
            <button
              onClick={() => {
                (document.activeElement as HTMLElement)?.blur();
                handleComment();
              }}
              disabled={!commentText.trim()}
              aria-label="コメントを送信"
              className="bg-mint text-white rounded-full px-5 py-2 text-xs font-extrabold disabled:opacity-30 shadow-sm shadow-mint/30"
            >
              送信
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
