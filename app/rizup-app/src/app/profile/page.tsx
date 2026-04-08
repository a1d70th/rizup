"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { rizupTypes } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";

interface ProfileData {
  name: string; dream: string; avatar_url: string | null;
  streak: number; plan: string; zodiac?: string;
  rizup_type?: string; birthday?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [posts, setPosts] = useState<any[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (prof) setProfile(prof);

        const { data: userPosts, count } = await supabase.from("posts")
          .select("*, profiles(name, avatar_url)", { count: "exact" })
          .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10);
        if (userPosts) setPosts(userPosts);
        if (count) setTotalPosts(count);

        const { data: userBadges } = await supabase.from("badges").select("type").eq("user_id", user.id);
        if (userBadges) setBadges(userBadges.map(b => b.type));

        // Count reactions received
        const { count: rxCount } = await supabase.from("reactions")
          .select("id", { count: "exact", head: true })
          .in("post_id", (userPosts || []).map(p => p.id));
        setTotalReactions(rxCount || 0);
      } catch (err) {
        console.error("[Rizup Profile]", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  const badgeMap: Record<string, { emoji: string; label: string }> = {
    first_post: { emoji: "🌱", label: "初投稿" }, streak_7: { emoji: "🔥", label: "7日連続" },
    streak_14: { emoji: "🔥", label: "14日連続" }, streak_30: { emoji: "👑", label: "30日連続" },
    comments_50: { emoji: "💬", label: "コメント50" }, weekly_mvp: { emoji: "⭐", label: "週間MVP" },
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
      <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mb-4" />
      <p className="text-text-mid text-sm">プロフィールが見つかりませんでした</p>
    </div>
  );

  const typeInfo = profile.rizup_type && profile.rizup_type in rizupTypes ? rizupTypes[profile.rizup_type as RizupType] : null;

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-mint-light mx-auto mb-3 flex items-center justify-center text-3xl border-[3px] border-mint">
            {profile.avatar_url || "🌿"}
          </div>
          <h1 className="text-xl font-extrabold">{profile.name}</h1>
          {profile.dream && <p className="text-sm text-text-mid mt-1">🎯 {profile.dream}</p>}
          {typeInfo && (
            <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: `${typeInfo.color}20`, color: typeInfo.color }}>
              {typeInfo.emoji} {typeInfo.label}タイプ
            </span>
          )}
          {profile.zodiac && <span className="inline-block mt-1 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-light text-orange">{profile.zodiac}</span>}
          <div className="flex justify-center gap-6 mt-4">
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalPosts}</div><div className="text-[10px] text-text-light">投稿</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-orange">🔥 {profile.streak}</div><div className="text-[10px] text-text-light">連続日数</div></div>
            <div className="text-center"><div className="text-xl font-extrabold text-mint">{totalReactions}</div><div className="text-[10px] text-text-light">もらった応援</div></div>
          </div>
        </div>

        {badges.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">🏅 獲得バッジ</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => { const info = badgeMap[b] || { emoji: "🎖️", label: b }; return (
                <span key={b} className="bg-mint-light text-mint px-3 py-1 rounded-full text-xs font-bold">{info.emoji} {info.label}</span>
              ); })}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">📊 気分の推移</h3>
          <div className="flex items-end gap-1 h-20">
            {[2,3,2,4,3,3,4,3,4,5,4,4,5,5].map((mood, i) => {
              const colors: Record<number,string> = {1:"#ef4444",2:"#f97316",3:"#eab308",4:"#6ecbb0",5:"#5ab89d"};
              return <div key={i} className="flex-1 rounded-t-md" style={{ height:`${mood*20}%`, background:colors[mood] }} />;
            })}
          </div>
          <div className="flex justify-between text-[10px] text-text-light mt-1"><span>14日前</span><span>今日</span></div>
          <div className="flex gap-2 mt-2 flex-wrap">
            {[{c:"#ef4444",l:"つらい"},{c:"#f97316",l:"ふつう"},{c:"#eab308",l:"まあまあ"},{c:"#6ecbb0",l:"いい感じ"},{c:"#5ab89d",l:"最高"}].map(x=>(
              <div key={x.l} className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{background:x.c}} /><span className="text-[9px] text-text-light">{x.l}</span></div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">💬 言葉のポジティブ度</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-100 rounded-full h-3">
              <div className="bg-mint h-3 rounded-full" style={{ width: "72%" }} />
            </div>
            <span className="text-sm font-extrabold text-mint">72%</span>
          </div>
          <p className="text-[10px] text-text-light mt-2">先月比 +8%</p>
        </div>

        <h3 className="text-sm font-bold mb-3">📝 投稿履歴</h3>
        <div className="flex flex-col gap-3">
          {posts.map((post) => (<PostCard key={post.id} post={post} userId={userId} />))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
