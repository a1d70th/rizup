"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type FormType = "announce" | "event";
const formLabels: Record<FormType, { icon: string; title: string; desc: string }> = {
  announce: { icon: "📣", title: "全ユーザーへのお知らせ", desc: "全員に通知が届きます" },
  event: { icon: "🎉", title: "イベント告知", desc: "コミュニティイベントの案内" },
};

interface HistoryItem {
  id: string; type: string; content: string; created_at: string; target: string;
}

export default function AdminNotificationsPage() {
  const [authorized, setAuthorized] = useState(false);
  const [activeForm, setActiveForm] = useState<FormType>("announce");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAuthorized(true);

      const { data: broadcasts } = await supabase.from("admin_broadcasts")
        .select("*").order("created_at", { ascending: false }).limit(30);
      if (broadcasts) setHistory(broadcasts);
    };
    init();
  }, []);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);

    const content = title ? `【${title}】${body}` : body;
    const { data: targets } = await supabase.from("profiles").select("id");
    if (targets) {
      const notifs = targets.map(t => ({
        user_id: t.id,
        type: activeForm === "event" ? "event" : "announcement",
        content,
      }));
      if (notifs.length > 0) await supabase.from("notifications").insert(notifs);
    }

    await supabase.from("admin_broadcasts").insert({
      type: activeForm, content, target: "全ユーザー",
    });

    const { data: broadcasts } = await supabase.from("admin_broadcasts")
      .select("*").order("created_at", { ascending: false }).limit(30);
    if (broadcasts) setHistory(broadcasts);

    setSending(false);
    setSent(true);
    setTitle(""); setBody("");
    setTimeout(() => setSent(false), 3000);
  };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-text-light hover:text-mint">←</Link>
          <h1 className="text-lg font-extrabold">📣 通知配信</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(Object.keys(formLabels) as FormType[]).map(key => (
            <button key={key} onClick={() => { setActiveForm(key); setSent(false); }}
              className={`p-3 rounded-2xl border text-left transition ${activeForm === key ? "border-mint bg-mint-light" : "border-gray-100 bg-white"}`}>
              <span className="text-lg">{formLabels[key].icon}</span>
              <p className="text-xs font-bold mt-1">{formLabels[key].title}</p>
              <p className="text-[10px] text-text-light">{formLabels[key].desc}</p>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">{formLabels[activeForm].icon} {formLabels[activeForm].title}</h3>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトル（任意）"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="メッセージ本文..."
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-28 outline-none focus:border-mint" />
          <button onClick={handleSend} disabled={!body.trim() || sending}
            className="w-full bg-mint text-white font-bold py-3 rounded-full mt-3 shadow-lg shadow-mint/30 disabled:opacity-30">
            {sending ? "送信中..." : sent ? "✅ 送信完了！" : "送信する"}
          </button>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold mb-3">📋 配信履歴</h3>
          {history.length === 0 ? (
            <p className="text-xs text-text-light text-center py-4">まだ配信はありません</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="border-b border-gray-50 pb-2 last:border-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-mint">{formLabels[h.type as FormType]?.title || h.type}</span>
                    <span className="text-[10px] text-text-light ml-auto">
                      {new Date(h.created_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-xs text-text-mid line-clamp-2">{h.content}</p>
                  <span className="text-[10px] text-text-light">{h.target}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
