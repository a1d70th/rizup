"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Tab = "recommend" | "vip";

interface RecItem {
  id: string; type: string; title: string; description: string; url: string | null; created_at: string;
}
interface VipItem {
  id: string; title: string; content: string; created_at: string;
}

export default function AdminContentPage() {
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<Tab>("recommend");
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [vips, setVips] = useState<VipItem[]>([]);
  // Recommend form
  const [recType, setRecType] = useState("book");
  const [recTitle, setRecTitle] = useState("");
  const [recDesc, setRecDesc] = useState("");
  const [recUrl, setRecUrl] = useState("");
  // VIP form
  const [vipTitle, setVipTitle] = useState("");
  const [vipContent, setVipContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingRec, setEditingRec] = useState<string | null>(null);
  const [editingVip, setEditingVip] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAuthorized(true);

      const { data: recData } = await supabase.from("recommendations").select("*").order("created_at", { ascending: false });
      if (recData) setRecs(recData);

      const { data: vipData } = await supabase.from("vip_contents").select("*").order("created_at", { ascending: false });
      if (vipData) setVips(vipData);
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
      const { data } = await supabase.from("recommendations").insert({ type: recType, title: recTitle, description: recDesc, url: recUrl || null }).select().single();
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

  const saveVip = async () => {
    if (!vipTitle.trim() || !vipContent.trim()) return;
    setSaving(true);
    if (editingVip) {
      await supabase.from("vip_contents").update({ title: vipTitle, content: vipContent }).eq("id", editingVip);
      setVips(prev => prev.map(v => v.id === editingVip ? { ...v, title: vipTitle, content: vipContent } : v));
      setEditingVip(null);
    } else {
      const { data } = await supabase.from("vip_contents").insert({ title: vipTitle, content: vipContent }).select().single();
      if (data) setVips(prev => [data, ...prev]);
    }
    setVipTitle(""); setVipContent("");
    setSaving(false);
  };

  const deleteVip = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("vip_contents").delete().eq("id", id);
    setVips(prev => prev.filter(v => v.id !== id));
  };

  const editVip = (v: VipItem) => {
    setEditingVip(v.id); setVipTitle(v.title); setVipContent(v.content);
  };

  const recTypeIcons: Record<string, string> = { book: "📕", movie: "🎬", place: "📍", quote: "💬" };

  if (!authorized) return null;

  return (
    <div className="min-h-screen bg-bg pb-8">
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin" className="text-text-light hover:text-mint">←</Link>
          <h1 className="text-lg font-extrabold">📚 コンテンツ管理</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Tabs */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-4">
          <button onClick={() => setTab("recommend")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab === "recommend" ? "bg-mint-light text-mint" : "text-text-light"}`}>
            📖 レコメンド
          </button>
          <button onClick={() => setTab("vip")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${tab === "vip" ? "bg-purple-100 text-purple-600" : "text-text-light"}`}>
            👑 VIP限定
          </button>
        </div>

        {tab === "recommend" && (
          <>
            {/* Form */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
              <h3 className="text-sm font-bold mb-3">{editingRec ? "✏️ 編集" : "➕ 新規追加"}</h3>
              <div className="flex gap-2 mb-2">
                {["book", "movie", "place", "quote"].map(t => (
                  <button key={t} onClick={() => setRecType(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-bold transition ${recType === t ? "border-mint bg-mint-light text-mint" : "border-gray-100 text-text-light"}`}>
                    {recTypeIcons[t]} {t}
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
            {/* List */}
            <div className="space-y-2">
              {recs.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm flex items-start gap-3">
                  <span className="text-xl mt-0.5">{recTypeIcons[r.type] || "📖"}</span>
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
          </>
        )}

        {tab === "vip" && (
          <>
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
              <h3 className="text-sm font-bold mb-3">{editingVip ? "✏️ 編集" : "➕ VIP限定コンテンツ追加"}</h3>
              <input type="text" value={vipTitle} onChange={e => setVipTitle(e.target.value)} placeholder="タイトル"
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
              <textarea value={vipContent} onChange={e => setVipContent(e.target.value)} placeholder="コンテンツ本文"
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-28 outline-none focus:border-mint mb-2" />
              <div className="flex gap-2">
                <button onClick={saveVip} disabled={!vipTitle.trim() || !vipContent.trim() || saving}
                  className="bg-purple-500 text-white font-bold px-6 py-2 rounded-full text-xs disabled:opacity-30">
                  {saving ? "保存中..." : editingVip ? "更新" : "追加"}
                </button>
                {editingVip && (
                  <button onClick={() => { setEditingVip(null); setVipTitle(""); setVipContent(""); }}
                    className="text-xs text-text-light px-4 py-2">キャンセル</button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {vips.map(v => (
                <div key={v.id} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold">{v.title}</p>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => editVip(v)} className="text-xs text-purple-500 hover:underline">編集</button>
                      <button onClick={() => deleteVip(v.id)} className="text-xs text-red-400 hover:underline">削除</button>
                    </div>
                  </div>
                  <p className="text-xs text-text-mid line-clamp-2">{v.content}</p>
                  <span className="text-[10px] text-text-light">{new Date(v.created_at).toLocaleDateString("ja-JP")}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
