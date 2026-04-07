"use client";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { demoShoInsight } from "@/lib/demo-data";

const notifications = [
  {
    type: "insight", icon: "sho", bg: "bg-gradient-to-br from-mint-light to-orange-light",
    title: "今日の Sho Insight", content: demoShoInsight, time: "今朝 6:00",
  },
  {
    type: "cheer", icon: "🌱", bg: "bg-white border border-gray-100",
    title: "あなたへの応援", content: "7日連続投稿達成！すごい継続力だね。この調子で続けていこう。", time: "今日",
  },
  {
    type: "cheer", icon: "💬", bg: "bg-white border border-gray-100",
    title: "あなたへの応援", content: "今週5人があなたの投稿に反応しました。みんなが見てくれてるよ。", time: "昨日",
  },
  {
    type: "member", icon: "👋", bg: "bg-orange-light",
    title: "新メンバー紹介", content: "今日、みおさんが仲間になりました！ぜひ応援してあげてね。", time: "12時間前",
  },
  {
    type: "weekly", icon: "sho", bg: "bg-mint-light",
    title: "📚 Shoの週刊コンテンツ", content: "【幸福論】「比べることをやめる」のは無理。でも「比べる相手」は選べる。他人じゃなくて、3ヶ月前の自分と比べてみて。", time: "日曜 18:00",
  },
  {
    type: "announce", icon: "📢", bg: "bg-white border border-gray-100",
    title: "運営からのお知らせ", content: "来週から「週次レポート」機能をリリースします！毎週月曜に、あなたの1週間をShoが振り返ります。", time: "4/5",
  },
  {
    type: "cheer", icon: "📊", bg: "bg-white border border-gray-100",
    title: "あなたへの応援", content: "先月よりポジティブな言葉が23%増えています。確実に変わってきてるよ。", time: "4/1",
  },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">🔔 通知</h2>
        <div className="flex flex-col gap-3">
          {notifications.map((n, i) => (
            <div key={i} className={`${n.bg} rounded-2xl p-4 shadow-sm animate-fade-in`}>
              <div className="flex items-center gap-2 mb-2">
                {n.icon === "sho" ? (
                  <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-mint-light flex items-center justify-center text-sm">{n.icon}</div>
                )}
                <span className="text-xs font-bold text-text flex-1">{n.title}</span>
                <span className="text-[10px] text-text-light">{n.time}</span>
              </div>
              {n.content && <p className="text-sm text-text-mid leading-relaxed">{n.content}</p>}
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
