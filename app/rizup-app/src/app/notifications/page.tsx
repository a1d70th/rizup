"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

interface Notification {
  id: string;
  type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const shoMessages = [
  "おはよう。今日も完璧じゃなくていいから、1つだけ自分のためになることをしよう。それだけで十分。",
  "昨日の自分より、ちょっとだけ前に進めたら、それでいい。あなたのペースで。",
  "今日も「ここに来た」こと自体が、すでにすごいことだよ。",
  "比べなくていい。あなたはあなたのままで、十分前に進んでる。",
  "小さな一歩を積み重ねよう。気づいたら、遠くまで来てるから。",
  "うまくいかない日があっても大丈夫。そういう日があるから、いい日が際立つんだよ。",
  "今日も一緒にいるよ。あなたの味方だから。",
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [shoInsight] = useState(shoMessages[Math.floor(Math.random() * shoMessages.length)]);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Check trial
        const { data: profile } = await supabase.from("profiles").select("trial_ends_at, plan").eq("id", user.id).single();
        if (profile?.trial_ends_at && (!profile.plan || profile.plan === "free")) {
          const days = Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (days > 0) setTrialDaysLeft(days);
        }

        const { data } = await supabase.from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (data) setNotifications(data);
      } catch (err) {
        console.error("[Rizup Notifications]", err);
      }
      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">🔔 通知</h2>

        {/* Sho Insight — always show */}
        <div className="bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 shadow-sm animate-fade-in mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
            <span className="text-xs font-bold text-mint flex-1">今日の Sho Insight</span>
            <span className="text-[10px] text-text-light">今朝 6:00</span>
          </div>
          <p className="text-sm text-text leading-relaxed">{shoInsight}</p>
        </div>

        {/* Trial notification */}
        {trialDaysLeft !== null && trialDaysLeft <= 1 && (
          <div className="bg-orange-light rounded-2xl p-4 shadow-sm animate-fade-in mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
              <span className="text-xs font-bold text-orange flex-1">Sho からのお知らせ</span>
              <span className="text-[10px] text-text-light">今日</span>
            </div>
            <p className="text-sm text-text leading-relaxed">
              明日からProプランが始まります。続けますか？<br />
              設定画面からプラン管理ができるよ。
            </p>
          </div>
        )}

        {/* Real notifications */}
        {loading ? (
          <div className="text-center py-8">
            <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full mx-auto mb-2 animate-sho-float" />
            <p className="text-xs text-text-light">読み込み中...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={56} height={56} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ通知はありません</p>
            <p className="text-xs text-text-light">ジャーナルを投稿すると、ここに通知が届くよ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => (
              <div key={n.id} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in ${!n.is_read ? "border-l-4 border-l-mint" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-text">{n.type}</span>
                  <span className="text-[10px] text-text-light ml-auto">
                    {new Date(n.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-text-mid leading-relaxed">{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
