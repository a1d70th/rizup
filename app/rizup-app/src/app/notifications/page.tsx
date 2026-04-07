"use client";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

const notifications = [
  { type: "sho_morning", title: "朝の励まし", content: "おはよう。完璧な1日じゃなくていい。「今日も起きて、ここに来た」それだけですでにすごいことだよ。", time: "今朝 7:00", bg: "bg-mint-light", shoColor: "" },
  { type: "sho_weekly", title: "📚 週1コンテンツ：幸福論", content: "「比べることをやめる」のは無理。でも「比べる相手」は選べる。他人じゃなくて、3ヶ月前の自分と比べてみて。", time: "日曜 18:00", bg: "bg-orange-light", shoColor: "bg-orange" },
  { type: "reaction", title: "🌱 はなさんがあなたの投稿に「応援してる」", content: "", time: "2時間前", bg: "bg-white", shoColor: "" },
  { type: "sho_special", title: "🎉 メンバー限定メッセージ", content: "Rizupが始まったね。最初のメンバーとして参加してくれてありがとう。一緒に前に進もう。", time: "昨日", bg: "bg-mint-light", shoColor: "" },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">🔔 お知らせ</h2>

        <div className="flex flex-col gap-3">
          {notifications.map((n, i) => (
            <div key={i} className={`${n.bg} rounded-2xl p-4 ${n.bg === "bg-white" ? "border border-gray-100 shadow-sm" : ""} animate-fade-in`}>
              <div className="flex items-center gap-2 mb-2">
                {n.type.startsWith("sho") ? (
                  <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-mint-light flex items-center justify-center text-sm">🌱</div>
                )}
                <div className="flex-1">
                  <span className="text-xs font-bold text-text">{n.title}</span>
                </div>
                <span className="text-[10px] text-text-light">{n.time}</span>
              </div>
              {n.content && (
                <p className="text-sm text-text-mid leading-relaxed">{n.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
