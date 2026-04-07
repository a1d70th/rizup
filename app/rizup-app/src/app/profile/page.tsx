"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { demoProfile, demoPosts, demoBadges } from "@/lib/demo-data";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";
import Link from "next/link";

interface ProfileData {
  name: string;
  dream: string;
  avatar_url: string | null;
  streak: number;
  plan: string;
}

const LOAD_TIMEOUT = 5000;

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalReactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      setProfile(demoProfile);
      setPosts(demoPosts);
      setBadges(demoBadges);
      setTotalPosts(demoPosts.length);
      setIsDemo(true);
      setLoading(false);
    }, LOAD_TIMEOUT);

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!timedOut) {
            clearTimeout(timeout);
            setProfile(demoProfile);
            setPosts(demoPosts);
            setBadges(demoBadges);
            setTotalPosts(demoPosts.length);
            setIsDemo(true);
            setLoading(false);
          }
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles").select("*").eq("id", user.id).single();

        if (timedOut) return;

        if (profErr || !prof) {
          clearTimeout(timeout);
          setProfile(demoProfile);
          setPosts(demoPosts);
          setBadges(demoBadges);
          setTotalPosts(demoPosts.length);
          setIsDemo(true);
          setLoading(false);
          return;
        }

        setProfile(prof);

        const { data: userPosts, count } = await supabase
          .from("posts")
          .select("*, profiles(name, avatar_url)", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10);
        if (userPosts) setPosts(userPosts);
        if (count) setTotalPosts(count);

        const { data: userBadges } = await supabase
          .from("badges")
          .select("type")
          .eq("user_id", user.id);
        if (userBadges) setBadges(userBadges.map(b => b.type));

        clearTimeout(timeout);
        setLoading(false);
      } catch {
        if (!timedOut) {
          clearTimeout(timeout);
          setProfile(demoProfile);
          setPosts(demoPosts);
          setBadges(demoBadges);
          setTotalPosts(demoPosts.length);
          setIsDemo(true);
          setLoading(false);
        }
      }
    };
    init();

    return () => clearTimeout(timeout);
  }, []);

  const badgeMap: Record<string, { emoji: string; label: string }> = {
    first_post: { emoji: "🌱", label: "初投稿" },
    streak_7: { emoji: "🔥", label: "7日連続" },
    streak_14: { emoji: "🔥", label: "14日連続" },
    streak_30: { emoji: "👑", label: "30日連続" },
    comments_50: { emoji: "💬", label: "コメント50" },
    weekly_mvp: { emoji: "⭐", label: "週間MVP" },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Demo Banner */}
        {isDemo && (
          <div className="bg-orange-light rounded-2xl p-3 mb-4 text-center">
            <p className="text-xs font-bold text-orange">
              デモモードで表示しています — Supabase を接続すると実データに切り替わります
            </p>
          </div>
        )}

        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-mint-light mx-auto mb-3 flex items-center justify-center text-3xl border-3 border-mint">
            {profile.avatar_url || "🌿"}
          </div>
          <h1 className="text-xl font-extrabold">{profile.name}</h1>
          {profile.dream && (
            <p className="text-sm text-text-mid mt-1">🎯 {profile.dream}</p>
          )}

          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center">
              <div className="text-xl font-extrabold text-mint">{totalPosts}</div>
              <div className="text-[10px] text-text-light">投稿</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-orange">🔥 {profile.streak}</div>
              <div className="text-[10px] text-text-light">連続日数</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-mint">{totalReactions}</div>
              <div className="text-[10px] text-text-light">もらった応援</div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">🏅 獲得バッジ</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => {
                const info = badgeMap[b] || { emoji: "🎖️", label: b };
                return (
                  <span key={b} className="bg-mint-light text-mint px-3 py-1 rounded-full text-xs font-bold">
                    {info.emoji} {info.label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Mood Graph */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">📊 気分の推移</h3>
          <div className="flex items-end gap-1 h-20">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md bg-mint"
                style={{ height: `${30 + Math.random() * 60}%`, opacity: 0.4 + i * 0.04 }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-text-light mt-1">
            <span>14日前</span>
            <span>今日</span>
          </div>
        </div>

        {/* Settings Link */}
        <Link
          href="/settings"
          className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 text-center text-sm font-bold text-text-mid hover:border-mint transition"
        >
          ⚙️ 設定
        </Link>

        {/* User Posts */}
        <h3 className="text-sm font-bold mb-3">📝 投稿履歴</h3>
        <div className="flex flex-col gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
