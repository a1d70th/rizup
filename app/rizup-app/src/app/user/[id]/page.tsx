"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Loading from "@/components/Loading";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { rizupTypes } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";

interface UserProfile {
  id: string;
  name: string;
  dream: string;
  avatar_url: string | null;
  streak: number;
  rizup_type: string | null;
  zodiac: string | null;
}

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const targetId = params?.id;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [postCount, setPostCount] = useState(0);
  const [receivedReactions, setReceivedReactions] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        const { data: p } = await supabase.from("profiles")
          .select("id, name, dream, avatar_url, streak, rizup_type, zodiac")
          .eq("id", targetId).maybeSingle();
        if (!p) { setNotFound(true); setLoading(false); return; }
        setProfile(p);

        const { data: userPosts, count } = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)", { count: "exact" })
          .eq("user_id", targetId)
          .order("created_at", { ascending: false }).limit(20);
        if (userPosts) setPosts(userPosts);
        if (count) setPostCount(count);

        if (userPosts && userPosts.length > 0) {
          const { count: rxCount } = await supabase.from("reactions")
            .select("id", { count: "exact", head: true })
            .in("post_id", userPosts.map(x => x.id));
          setReceivedReactions(rxCount || 0);
        }

        // follow counts
        const [{ count: flCount }, { count: fgCount }] = await Promise.all([
          supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followee_id", targetId),
          supabase.from("follows").select("followee_id", { count: "exact", head: true }).eq("follower_id", targetId),
        ]);
        setFollowers(flCount || 0);
        setFollowing(fgCount || 0);

        if (user && user.id !== targetId) {
          const { data: f } = await supabase.from("follows")
            .select("follower_id").eq("follower_id", user.id).eq("followee_id", targetId).maybeSingle();
          setIsFollowing(!!f);
        }
      } catch (err) {
        console.error("[UserProfile]", err);
      }
      setLoading(false);
    };
    init();
  }, [targetId]);

  const toggleFollow = async () => {
    if (!currentUserId || !targetId) return;
    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", currentUserId).eq("followee_id", targetId);
      setIsFollowing(false);
      setFollowers(prev => Math.max(0, prev - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId, followee_id: targetId,
      });
      setIsFollowing(true);
      setFollowers(prev => prev + 1);
      supabase.from("notifications").insert({
        user_id: targetId, type: "announcement",
        content: `新しい仲間があなたをフォローしました🌱`,
      }).then(() => {});
    }
  };

  if (loading) return <Loading message="プロフィール読み込み中" />;
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <Header />
        <EmptyState title="このユーザーは見つかりません"
          description="アカウントが削除されているか、URLが間違っているかもしれません。"
          action={<Link href="/home" className="inline-block bg-mint text-white font-bold px-6 py-3 rounded-full shadow-md">ホームへ戻る</Link>} />
        <BottomNav />
      </div>
    );
  }

  const isOwner = currentUserId === profile.id;
  const typeInfo = profile.rizup_type && profile.rizup_type in rizupTypes
    ? rizupTypes[profile.rizup_type as RizupType] : null;
  const isUrl = profile.avatar_url?.startsWith("http");

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4">
          <div className="w-20 h-20 mx-auto mb-3">
            {isUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url!} alt={`${profile.name}さんのアバター`}
                className="w-20 h-20 rounded-full object-cover border-[3px] border-mint" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-mint-light flex items-center justify-center text-3xl border-[3px] border-mint" role="img" aria-label={`${profile.name}さんのアバター`}>
                {profile.avatar_url || "🌿"}
              </div>
            )}
          </div>
          <h1 className="text-xl font-extrabold">{profile.name}</h1>
          {profile.dream && <p className="text-sm text-text-mid mt-1">🎯 {profile.dream}</p>}
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {typeInfo && (
              <span className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
                {typeInfo.emoji} {typeInfo.label}タイプ
              </span>
            )}
            {profile.zodiac && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-light text-orange">{profile.zodiac}</span>
            )}
          </div>
          <div className="flex justify-center gap-5 mt-4">
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{postCount}</div><div className="text-[10px] text-text-light">投稿</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-orange">🔥 {profile.streak}</div><div className="text-[10px] text-text-light">連続</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{receivedReactions}</div><div className="text-[10px] text-text-light">応援</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-text">{followers}</div><div className="text-[10px] text-text-light">フォロワー</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-text">{following}</div><div className="text-[10px] text-text-light">フォロー中</div></div>
          </div>
          {!isOwner && currentUserId && (
            <button onClick={toggleFollow}
              className={`mt-4 px-6 py-2 rounded-full text-sm font-bold transition ${isFollowing ? "bg-white border-2 border-mint text-mint" : "bg-mint text-white shadow-md shadow-mint/30"}`}
              aria-pressed={isFollowing}>
              {isFollowing ? "✓ フォロー中" : "＋ フォロー"}
            </button>
          )}
          {isOwner && (
            <Link href="/profile" className="inline-block mt-4 text-xs text-mint font-bold border border-mint rounded-full px-4 py-1.5">
              自分のプロフィールへ
            </Link>
          )}
        </div>

        <h3 className="text-sm font-bold mb-3">📝 投稿履歴</h3>
        {posts.length === 0 ? (
          <EmptyState title="まだ投稿がないよ" description="最初の投稿を待ってみよう🌱" />
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userId={currentUserId} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
