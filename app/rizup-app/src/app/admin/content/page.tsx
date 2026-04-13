"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface RecItem {
  id: string; type: string; title: string; description: string; url: string | null; created_at: string;
}

const recTypes = [
  { v: "book", icon: "📕", label: "本" },
  { v: "quote", icon: "💬", label: "言葉" },
  { v: "habit", icon: "🔄", label: "習慣" },
  { v: "study", icon: "📝", label: "目標達成法" },
  { v: "happiness", icon: "😊", label: "今日の幸せ" },
  { v: "motivation", icon: "🔥", label: "モチベ" },
];

export default function AdminContentPage() {
  const [authorized, setAuthorized] = useState(false);
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [recType, setRecType] = useState("book");
  const [recTitle, setRecTitle] = useState("");
  const [recDesc, setRecDesc] = useState("");
  const [recUrl, setRecUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingRec, setEditingRec] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAuthorized(true);

      const { data: recData } = await supabase.from("recommendations").select("*").order("created_at", { ascending: false });
      if (recData) setRecs(recData);
    };
    init();
  }, []);

  const saveRec = async () => {
    if (!recTitle.trim()) return;
    setSaving(true);
    if (editingRec) {
      await supabase.from("recommendations").update({ type: recType, title: recTitle, description: recDesc, url: recUrl || null }).eq("id", editingRec);
      setRecs(prev => prev.map(r => r.id === editingRec ? { ...r, type: recType, title: recTitle, description: recDesc, url: recUrl || null } : r));
      setEditingRec(null);
    } else {
      const { data } = await supabase.from("recommendations")
        .insert({ type: recType, title: recTitle, description: recDesc, url: recUrl || null, posted_by: "sho" })
        .select().single();
      if (data) setRecs(prev => [data, ...prev]);
    }
    setRecTitle(""); setRecDesc(""); setRecUrl(""); setRecType("book");
    setSaving(false);
  };

  const deleteRec = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("recommendations").delete().eq("id", id);
    setRecs(prev => prev.filter(r => r.id !== id));
  };

  const editRec = (r: RecItem) => {
    setEditingRec(r.id); setRecType(r.type); setRecTitle(r.title); setRecDesc(r.description); setRecUrl(r.url || "");
  };

  const iconFor = (t: string) => recTypes.find(r => r.v === t)?.icon || "📖";

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-text-light hover:text-mint">←</Link>
          <h1 className="text-lg font-extrabold">📚 レコメンド管理</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">{editingRec ? "✏️ 編集" : "➕ 新規追加"}</h3>
          <div className="flex gap-2 mb-2 flex-wrap">
            {recTypes.map(t => (
              <button key={t.v} onClick={() => setRecType(t.v)}
                className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${recType === t.v ? "border-mint bg-mint-light text-mint" : "border-gray-100 text-text-light"}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <input type="text" value={recTitle} onChange={e => setRecTitle(e.target.value)} placeholder="タイトル"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
          <textarea value={recDesc} onChange={e => setRecDesc(e.target.value)} placeholder="説明"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm resize-none h-16 outline-none focus:border-mint mb-2" />
          <input type="text" value={recUrl} onChange={e => setRecUrl(e.target.value)} placeholder="URL（任意）"
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
          <div className="flex gap-2">
            <button onClick={saveRec} disabled={!recTitle.trim() || saving}
              className="bg-mint text-white font-bold px-6 py-2 rounded-full text-xs disabled:opacity-30">
              {saving ? "保存中..." : editingRec ? "更新" : "追加"}
            </button>
            {editingRec && (
              <button onClick={() => { setEditingRec(null); setRecTitle(""); setRecDesc(""); setRecUrl(""); }}
                className="text-xs text-text-light px-4 py-2">キャンセル</button>
            )}
          </div>
        </div>
        <div className="space-y-2">
          {recs.map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-start gap-3">
              <span className="text-xl mt-0.5">{iconFor(r.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{r.title}</p>
                <p className="text-xs text-text-mid line-clamp-1">{r.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => editRec(r)} className="text-xs text-mint hover:underline">編集</button>
                <button onClick={() => deleteRec(r.id)} className="text-xs text-red-400 hover:underline">削除</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
