"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";

interface AdminPost {
  id: string; user_id: string; content: string; mood: number;
  type: string; image_url: string | null; created_at: string;
  profiles: { name: string; email: string; avatar_url: string | null };
  report_count?: number;
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAdminId(user.id);

      // Get reports
      const { data: reports } = await supabase.from("reports").select("post_id");
      const rIds = new Set<string>();
      reports?.forEach(r => rIds.add(r.post_id));
      setReportedIds(rIds);

      // Get posts
      const { data } = await supabase.from("posts")
        .select("id, user_id, content, mood, type, image_url, created_at, profiles(name, email, avatar_url)")
        .order("created_at", { ascending: false }).limit(100);
      if (data) {
        // Sort: reported first
        const sorted = (data as unknown as AdminPost[]).sort((a, b) => {
          const aR = rIds.has(a.id) ? 1 : 0;
          const bR = rIds.has(b.id) ? 1 : 0;
          if (bR !== aR) return bR - aR;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setPosts(sorted);
      }
      setLoading(false);
    };
    init();
  }, []);

  const deletePost = async (postId: string) => {
    if (!confirm("この投稿を削除しますか？")) return;
    await supabase.from("posts").delete().eq("id", postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const warnUser = async (userId: string) => {
    const msg = prompt("警告メッセージを入力");
    if (!msg || !adminId) return;
    await fetch("/api/warn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: userId, adminUserId: adminId, message: msg }),
    });
    alert("警告を送信しました");
  };

  const moodEmojis = ["", "😔", "😐", "🙂", "😊", "🤩"];

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Rizup" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-text-light hover:text-mint">←</Link>
          <h1 className="text-lg font-extrabold">📝 投稿管理</h1>
          <span className="ml-auto text-xs text-text-light">{posts.length}件</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {posts.map(p => {
          const isReported = reportedIds.has(p.id);
          return (
            <div key={p.id} className={`bg-white rounded-2xl p-4 border shadow-sm ${isReported ? "border-red-300 bg-red-50/30" : "border-gray-100"}`}>
              {isReported && (
                <div className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full inline-block mb-2">🚩 通報あり</div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-mint-light flex items-center justify-center text-sm shrink-0">
                  {p.profiles?.avatar_url?.startsWith("http") ? (
                    <img src={p.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : "🌿"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{p.profiles?.name || "不明"}</p>
                  <p className="text-[10px] text-text-light truncate">{p.profiles?.email}</p>
                </div>
                <span className="text-xs text-text-light">
                  {p.type === "morning" ? "☀️" : "🌙"} {moodEmojis[p.mood]}
                </span>
                <span className="text-[10px] text-text-light">
                  {new Date(p.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
              <p className="text-xs text-text-mid leading-relaxed mb-2 line-clamp-3">{p.content}</p>
              {p.image_url && <img src={p.image_url} alt="" className="w-full max-h-32 object-cover rounded-lg mb-2" />}
              <div className="flex gap-2">
                <button onClick={() => deletePost(p.id)}
                  className="text-xs px-3 py-1.5 rounded-full font-bold border border-red-300 text-red-500 hover:bg-red-50 transition">
                  🗑️ 削除
                </button>
                <button onClick={() => warnUser(p.user_id)}
                  className="text-xs px-3 py-1.5 rounded-full font-bold border border-orange text-orange hover:bg-orange-light transition">
                  ⚠️ 警告
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
