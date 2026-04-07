"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";
import Link from "next/link";

interface PostWithProfile {
  id: string;
  user_id: string;
  type: string;
  content: string;
  mood: number;
  ai_feedback: string | null;
  created_at: string;
  profiles: { name: string; avatar_url: string | null };
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from("profiles")
          .select("streak")
          .eq("id", user.id)
          .single();
        if (profile) setStreak(profile.streak);
      }

      const { data } = await supabase
        .from("posts")
        .select("*, profiles(name, avatar_url)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setPosts(data as PostWithProfile[]);
      setLoading(false);
    };
    init();
  }, []);

  const handleReact = async (postId: string, type: string) => {
    if (!userId) return;
    const { error } = await supabase.from("reactions").upsert(
      { post_id: postId, user_id: userId, type },
      { onConflict: "post_id,user_id,type" }
    );
    if (error && error.code === "23505") {
      await supabase.from("reactions").delete().match({ post_id: postId, user_id: userId, type });
    }
  };

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Streak */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full" />
            <div>
              <p className="text-xs text-text-mid">連続投稿</p>
              <p className="text-lg font-extrabold text-orange">🔥 {streak}日</p>
            </div>
          </div>
          <Link
            href="/journal"
            className="bg-mint text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md shadow-mint/30 hover:bg-mint-dark transition"
          >
            ✏️ 投稿する
          </Link>
        </div>

        {/* Sho Morning Message */}
        <div className="bg-mint-light rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
            <span className="text-xs font-bold text-mint">Sho の朝メッセージ</span>
          </div>
          <p className="text-sm text-text leading-relaxed">
            おはよう。今日も完璧じゃなくていいから、1つだけ自分のためになることをしよう。それだけで十分。
          </p>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={48} height={48} className="rounded-full mx-auto mb-3 animate-sho-float" />
            <p className="text-sm text-text-light">読み込み中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 animate-sho-float" />
            <p className="text-lg font-bold mb-1">まだ投稿がないよ</p>
            <p className="text-sm text-text-mid mb-4">最初の一歩を踏み出してみよう</p>
            <Link
              href="/journal"
              className="inline-block bg-mint text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-mint/30"
            >
              最初の投稿をする ✏️
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onReact={handleReact}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
