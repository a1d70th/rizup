"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PlanGate from "@/components/PlanGate";
import Image from "next/image";

interface VipContent {
  id: string; title: string; content: string; created_at: string;
}

export default function VipPage() {
  const [plan, setPlan] = useState<string>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [contents, setContents] = useState<VipContent[]>([]);
  const [messages, setMessages] = useState<{ id: string; content: string; created_at: string }[]>([]);
  const [consultText, setConsultText] = useState("");
  const [consultSent, setConsultSent] = useState(false);
  const [consultUsed, setConsultUsed] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("plan, trial_ends_at").eq("id", user.id).single();
      if (profile) { setPlan(profile.plan || "free"); setTrialEndsAt(profile.trial_ends_at); }

      // VIP contents
      const { data: vipContents } = await supabase.from("vip_contents")
        .select("*").order("created_at", { ascending: false }).limit(20);
      if (vipContents) setContents(vipContents);

      // VIP messages for this user
      const { data: msgs } = await supabase.from("notifications")
        .select("id, content, created_at").eq("user_id", user.id).eq("type", "vip_message")
        .order("created_at", { ascending: false }).limit(10);
      if (msgs) setMessages(msgs);

      // Check if already consulted this month
      const monthStart = new Date();
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase.from("vip_consultations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gte("created_at", monthStart.toISOString());
      if ((count || 0) > 0) setConsultUsed(true);

      setLoading(false);
    };
    init();
  }, []);

  const handleConsult = async () => {
    if (!userId || !consultText.trim()) return;
    setSending(true);
    await supabase.from("vip_consultations").insert({
      user_id: userId, content: consultText.trim(),
    });
    // Notify admin
    fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId: "vip-consult", reporterName: "VIPユーザー",
        postContent: consultText, reason: "VIP相談",
      }),
    }).catch(() => {});
    setConsultSent(true);
    setSending(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <PlanGate currentPlan={plan} requiredPlan="vip" trialEndsAt={trialEndsAt}>
      <div className="min-h-screen bg-bg pb-20">
        <Header />
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">👑</span>
            <h2 className="text-lg font-extrabold">VIP ラウンジ</h2>
          </div>

          {/* VIP Exclusive Content */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">📚 限定ノウハウ</h3>
            {contents.length === 0 ? (
              <p className="text-xs text-text-light text-center py-4">コンテンツ準備中です。お楽しみに！</p>
            ) : contents.map((c) => (
              <div key={c.id} className="border-b border-gray-50 last:border-0 py-3">
                <h4 className="text-sm font-bold">{c.title}</h4>
                <p className="text-xs text-text-mid mt-1 leading-relaxed">{c.content}</p>
                <span className="text-[10px] text-text-light mt-1 block">
                  {new Date(c.created_at).toLocaleDateString("ja-JP")}
                </span>
              </div>
            ))}
          </div>

          {/* Sho Consultation */}
          <div className="bg-gradient-to-br from-purple-50 to-mint-light rounded-2xl p-4 border border-purple-100 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Image src="/sho.png" alt="Sho" width={28} height={28} className="rounded-full" />
              <h3 className="text-sm font-bold">Sho に相談する</h3>
              <span className="text-[10px] text-text-light ml-auto">月1回</span>
            </div>
            {consultSent ? (
              <div className="text-center py-4">
                <p className="text-sm font-bold text-mint">相談を送信しました！</p>
                <p className="text-xs text-text-mid mt-1">Sho からの返信をお待ちください</p>
              </div>
            ) : consultUsed ? (
              <p className="text-xs text-text-light text-center py-4">今月の相談枠は使用済みです。来月またご利用ください。</p>
            ) : (
              <>
                <textarea value={consultText} onChange={(e) => setConsultText(e.target.value)}
                  placeholder="今悩んでいること、相談したいことを書いてね..."
                  className="w-full border-2 border-purple-100 rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-purple-300 bg-white" maxLength={1000} />
                <button onClick={handleConsult} disabled={!consultText.trim() || sending}
                  className="w-full bg-purple-500 text-white font-bold py-3 rounded-full mt-3 shadow-lg disabled:opacity-30">
                  {sending ? "送信中..." : "相談を送信する"}
                </button>
              </>
            )}
          </div>

          {/* Sho VIP Messages */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">💌 Sho からの限定メッセージ</h3>
            {messages.length === 0 ? (
              <p className="text-xs text-text-light text-center py-4">まだメッセージはありません</p>
            ) : messages.map((m) => (
              <div key={m.id} className="bg-mint-light rounded-xl p-3 mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Image src="/sho.png" alt="Sho" width={16} height={16} className="rounded-full" />
                  <span className="text-[10px] text-text-light">
                    {new Date(m.created_at).toLocaleDateString("ja-JP")}
                  </span>
                </div>
                <p className="text-xs text-text leading-relaxed">{m.content}</p>
              </div>
            ))}
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3">🚀 先行機能プレビュー</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">🎯</span>
                <div>
                  <p className="text-xs font-bold">目標トラッカー</p>
                  <p className="text-[10px] text-text-light">近日公開予定</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">🤝</span>
                <div>
                  <p className="text-xs font-bold">メンター機能</p>
                  <p className="text-[10px] text-text-light">開発中</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="text-xl">📊</span>
                <div>
                  <p className="text-xs font-bold">AI成長レポート</p>
                  <p className="text-[10px] text-text-light">開発中</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    </PlanGate>
  );
}
