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

const typeLabels: Record<string, { icon: string; label: string }> = {
  badge: { icon: "🏅", label: "バッジ獲得" },
  trial_ending: { icon: "⏰", label: "トライアル" },
  growth_letter: { icon: "💌", label: "成長の手紙" },
  unreplied: { icon: "💬", label: "コメント" },
  mvp_announcement: { icon: "👑", label: "月間MVP" },
  warning: { icon: "⚠️", label: "警告" },
  announcement: { icon: "📢", label: "お知らせ" },
  vip_message: { icon: "👑", label: "VIP" },
  sho_weekly: { icon: "🌿", label: "Sho" },
  event: { icon: "🎉", label: "イベント" },
};

const shoMessages = [
  "おはよう。今日も完璧じゃなくていいから、1つだけ自分のためになることをしよう。",
  "昨日の自分より、ちょっとだけ前に進めたら、それでいい。あなたのペースで。",
  "今日も「ここに来た」こと自体が、すでにすごいことだよ。",
  "比べなくていい。あなたはあなたのままで、十分前に進んでる。",
  "小さな一歩を積み重ねよう。気づいたら、遠くまで来てるから。",
];

function SkeletonNotif() {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-16 h-3 bg-gray-200 rounded-full" />
        <div className="w-12 h-2 bg-gray-100 rounded-full ml-auto" />
      </div>
      <div className="h-3 bg-gray-200 rounded-full w-full mb-1.5" />
      <div className="h-3 bg-gray-100 rounded-full w-2/3" />
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [shoInsight] = useState(shoMessages[Math.floor(Math.random() * shoMessages.length)]);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase.from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30);

        if (data) {
          setNotifications(data);
          // Mark unread as read
          const unread = data.filter(n => !n.is_read).map(n => n.id);
          if (unread.length > 0) {
            await supabase.from("notifications").update({ is_read: true }).in("id", unread);
          }
        }
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

        {/* Sho Insight */}
        <div className="bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 shadow-sm animate-fade-in mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
            <span className="text-xs font-bold text-mint flex-1">今日の Sho Insight</span>
            <span className="text-[10px] text-text-light">今朝 6:00</span>
          </div>
          <p className="text-sm text-text leading-relaxed">{shoInsight}</p>
        </div>

        {/* Notifications */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <SkeletonNotif />
            <SkeletonNotif />
            <SkeletonNotif />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={56} height={56} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ通知はありません</p>
            <p className="text-xs text-text-light">ジャーナルを投稿すると、ここに通知が届くよ</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notifications.map((n) => {
              const typeInfo = typeLabels[n.type] || { icon: "📌", label: n.type };
              return (
                <div key={n.id} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in ${!n.is_read ? "border-l-4 border-l-mint" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span aria-hidden="true">{typeInfo.icon}</span>
                    <span className="text-xs font-bold text-text">{typeInfo.label}</span>
                    <span className="text-[10px] text-text-light ml-auto">
                      {new Date(n.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-text-mid leading-relaxed">{n.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
