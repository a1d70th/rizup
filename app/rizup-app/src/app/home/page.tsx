"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PostCard from "@/components/PostCard";
import Image from "next/image";
import Link from "next/link";

interface PostWithProfile {
  id: string; user_id: string; type: string; content: string;
  mood: number; ai_feedback: string | null; created_at: string;
  profiles: { name: string; avatar_url: string | null };
}

export default function HomePage() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [shoInsight, setShoInsight] = useState("おはよう。今日も自分のペースで前に進もう。あなたの味方だよ。");
  const [hasCommentedToday, setHasCommentedToday] = useState(true);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [trialEnded, setTrialEnded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase.from("profiles").select("streak, zodiac, birthday, rizup_type, mbti, trial_ends_at, is_trial_ended, plan, is_admin").eq("id", user.id).single();
          if (profile) {
            setStreak(profile.streak || 0);
            if (profile.is_admin) setIsAdmin(true);
            // Trial check
            if (profile.plan === "free" || !profile.plan) {
              if (profile.trial_ends_at) {
                const endsAt = new Date(profile.trial_ends_at);
                const now = new Date();
                const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysLeft <= 0 || profile.is_trial_ended) {
                  setTrialEnded(true);
                } else {
                  setTrialDaysLeft(daysLeft);
                  // Send trial-ending notification (1 day before)
                  if (daysLeft === 1) {
                    const notifKey = `trial_notif_sent_${user.id}`;
                    if (!localStorage.getItem(notifKey)) {
                      await supabase.from("notifications").insert({
                        user_id: user.id,
                        type: "trial_ending",
                        content: "Sho より：トライアルが明日終了するよ。Proプランで投稿やAIフィードバックを続けよう！",
                      });
                      localStorage.setItem(notifKey, "1");
                    }
                  }
                }
              }
            }

            // Fetch Sho Insight — check localStorage cache first
            const cacheKey = `sho_insight_${new Date().toISOString().split("T")[0]}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              setShoInsight(cached);
            } else {
              fetch("/api/sho-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ zodiac: profile.zodiac, birthday: profile.birthday, rizupType: profile.rizup_type, mbti: profile.mbti }),
              }).then(r => r.json()).then(d => {
                if (d.insight) { setShoInsight(d.insight); localStorage.setItem(cacheKey, d.insight); }
                // Clean old cache (keep 7 days)
                for (let i = 0; i < localStorage.length; i++) {
                  const k = localStorage.key(i);
                  if (k?.startsWith("sho_insight_") && k !== cacheKey) {
                    const parts = k.split("_"); const date = parts.slice(2).join("_");
                    if (new Date(date) < new Date(Date.now() - 7 * 86400000)) localStorage.removeItem(k);
                  }
                }
              }).catch(() => {});
            }
          }
          const today = new Date().toISOString().split("T")[0];
          const { count } = await supabase.from("comments").select("id", { count: "exact", head: true })
            .eq("user_id", user.id).gte("created_at", today);
          setHasCommentedToday((count || 0) > 0);
        }
        const { data } = await supabase.from("posts").select("*, profiles(name, avatar_url)")
          .order("created_at", { ascending: false }).limit(20);
        if (data) setPosts(data as PostWithProfile[]);
      } catch (err) {
        console.error("[Rizup Home]", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  // Trial ended — show inline banner instead of blocking screen (free users can still view timeline + react)


  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Trial ended banner */}
        {trialEnded && (
          <div className="bg-orange-light rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">⏰</span>
              <p className="text-sm font-bold text-orange flex-1">無料トライアルが終了しました</p>
            </div>
            <p className="text-xs text-text-mid mb-3">現在は無料プラン（タイムライン閲覧・リアクションのみ）です。投稿やAIフィードバックを使うにはProプランへ。</p>
            <a href="/settings" className="block text-center bg-mint text-white text-sm font-bold py-2.5 rounded-full shadow-md shadow-mint/30">プランを確認する</a>
          </div>
        )}

        {/* Trial banner */}
        {trialDaysLeft !== null && (
          <div className={`rounded-2xl p-3 mb-4 flex items-center gap-3 ${trialDaysLeft <= 1 ? "bg-orange-light" : "bg-mint-light"}`}>
            <span className="text-xl">{trialDaysLeft <= 1 ? "⏰" : "🎉"}</span>
            <p className={`text-xs font-bold flex-1 ${trialDaysLeft <= 1 ? "text-orange" : "text-mint"}`}>
              {trialDaysLeft <= 1
                ? "明日トライアルが終了します。Proプランで続けませんか？"
                : `無料トライアル残り${trialDaysLeft}日 — 全機能をお試しください`}
            </p>
          </div>
        )}

        {/* Sho Insight */}
        <div className="bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 mb-4 border border-mint/20">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/sho.png" alt="Sho" width={32} height={32} className="rounded-full" />
            <div>
              <span className="text-xs font-bold text-mint">今日の Sho Insight</span>
              <span className="text-[10px] text-text-light ml-2">毎朝 6:00 更新</span>
            </div>
          </div>
          <p className="text-sm text-text leading-relaxed">{shoInsight}</p>
        </div>

        {/* Comment banner */}
        {!hasCommentedToday && (
          <div className="bg-orange-light rounded-2xl p-3 mb-4 flex items-center gap-3">
            <span className="text-xl">💬</span>
            <p className="text-xs font-bold text-orange flex-1">今日はまだ誰かの投稿にコメントしていません。前向きな一言を送ろう！</p>
          </div>
        )}

        {/* Streak */}
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full" />
            <div>
              <p className="text-xs text-text-mid">連続投稿</p>
              <p className="text-lg font-extrabold text-orange">🔥 {streak}日</p>
            </div>
          </div>
          <Link href="/journal"
            className="bg-mint text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md shadow-mint/30 hover:bg-mint-dark transition">
            📝 ジャーナル
          </Link>
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
            <p className="text-lg font-bold mb-1">まだ投稿がありません</p>
            <p className="text-sm text-text-mid mb-4">最初のジャーナルを書いてみよう！</p>
            <Link href="/journal" className="inline-block bg-mint text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-mint/30">
              最初の投稿をする 📝
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} userId={userId}
                isAdmin={isAdmin}
                onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
