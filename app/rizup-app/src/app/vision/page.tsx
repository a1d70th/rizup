"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

interface Vision {
  id: string;
  title: string;
  description: string | null;
  category: string;
  time_horizon: "final" | "3year" | "1year" | "monthly";
  progress: number;
  ai_feedback: string | null;
  created_at: string;
}

const horizons = [
  { value: "final" as const, label: "最終ゴール", emoji: "⭐", color: "#f4976c", desc: "人生で達成したい究極の夢" },
  { value: "3year" as const, label: "3年後の姿", emoji: "🚀", color: "#e88a62", desc: "3年後にどうなっていたい？" },
  { value: "1year" as const, label: "1年後の姿", emoji: "🎯", color: "#6ecbb0", desc: "1年後の具体的な目標" },
  { value: "monthly" as const, label: "今月やること", emoji: "✅", color: "#5ab89d", desc: "今月中にやるアクション" },
];

const categoryOptions = [
  { value: "work", label: "仕事", emoji: "💼" },
  { value: "money", label: "お金", emoji: "💰" },
  { value: "health", label: "健康", emoji: "💪" },
  { value: "relationship", label: "人間関係", emoji: "🤝" },
  { value: "growth", label: "自己成長", emoji: "🌱" },
  { value: "other", label: "その他", emoji: "✨" },
];

const cheerMessages = [
  "すごい進捗だね！この調子！",
  "着実に前に進んでる。応援してるよ！",
  "一歩一歩が大きな成果になる！",
  "その努力、ちゃんと見えてるよ！",
];

export default function VisionPage() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formHorizon, setFormHorizon] = useState<Vision["time_horizon"]>("final");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("growth");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [cheerMsg, setCheerMsg] = useState<string | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("visions")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: true });
      if (data) setVisions(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleAdd = async () => {
    if (!userId || !formTitle.trim()) return;
    (document.activeElement as HTMLElement)?.blur();
    setSaving(true);
    setSaveError("");
    const { data, error } = await supabase.from("visions").insert({
      user_id: userId,
      title: formTitle.trim(),
      description: formDesc.trim() || null,
      category: formCategory,
      time_horizon: formHorizon,
      progress: 0,
    }).select().single();
    if (error) { setSaveError(`保存できませんでした：${error.message}`); setSaving(false); return; }
    if (data) setVisions(prev => [...prev, data]);
    setFormTitle(""); setFormDesc(""); setShowForm(false);
    setSaving(false);
  };

  const handleProgress = async (id: string, progress: number) => {
    await supabase.from("visions").update({ progress }).eq("id", id);
    setVisions(prev => prev.map(v => v.id === id ? { ...v, progress } : v));
    if (progress > 0 && progress % 25 === 0) {
      setCheerMsg(cheerMessages[Math.floor(Math.random() * cheerMessages.length)]);
      setTimeout(() => setCheerMsg(null), 3000);
    }
  };

  const handleFeedback = async (vision: Vision) => {
    setFeedbackLoading(vision.id);
    try {
      const res = await fetch("/api/vision-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: vision.title,
          description: vision.description,
          category: vision.category,
          time_horizon: vision.time_horizon,
          progress: vision.progress,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        await supabase.from("visions").update({ ai_feedback: data.feedback }).eq("id", vision.id);
        setVisions(prev => prev.map(v => v.id === vision.id ? { ...v, ai_feedback: data.feedback } : v));
      }
    } catch { /* ignore */ }
    setFeedbackLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    await supabase.from("visions").delete().eq("id", id);
    setVisions(prev => prev.filter(v => v.id !== id));
  };

  const getHorizonInfo = (h: string) => horizons.find(x => x.value === h) || horizons[0];
  const getCategoryEmoji = (c: string) => categoryOptions.find(x => x.value === c)?.emoji || "✨";

  // Group by horizon
  const grouped = horizons.map(h => ({
    ...h,
    items: visions.filter(v => v.time_horizon === h.value),
  }));

  const totalProgress = visions.length > 0
    ? Math.round(visions.reduce((sum, v) => sum + v.progress, 0) / visions.length)
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">🎯 逆算ビジョン</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
            {showForm ? "✕ 閉じる" : "＋ 目標を追加"}
          </button>
        </div>

        {/* Overall Progress */}
        {visions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">全体の進捗</span>
              <span className="text-sm font-extrabold" style={{ color: "#6ecbb0" }}>{totalProgress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="rounded-full h-3 transition-all" style={{ width: `${totalProgress}%`, background: "linear-gradient(90deg, #6ecbb0, #f4976c)" }} />
            </div>
          </div>
        )}

        {/* Cheer message */}
        {cheerMsg && (
          <div className="bg-gradient-to-r from-mint-light to-orange-light rounded-2xl p-3 mb-4 animate-fade-in flex items-center gap-2">
            <Image src="/sho.png" alt="Sho" width={24} height={24} className="rounded-full" />
            <p className="text-xs font-bold text-text">{cheerMsg}</p>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <p className="text-sm font-bold mb-3">新しい目標を追加</p>
            {/* Horizon */}
            <label className="text-xs font-bold text-text-mid block mb-2">いつまでの目標？</label>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {horizons.map(h => (
                <button key={h.value} onClick={() => setFormHorizon(h.value)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    formHorizon === h.value ? "border-mint bg-mint-light text-mint" : "border-gray-100 text-text-mid"}`}>
                  {h.emoji} {h.label}
                </button>
              ))}
            </div>
            {/* Category */}
            <label className="text-xs font-bold text-text-mid block mb-2">カテゴリ</label>
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {categoryOptions.map(c => (
                <button key={c.value} onClick={() => setFormCategory(c.value)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    formCategory === c.value ? "border-mint bg-mint-light text-mint" : "border-gray-100 text-text-mid"}`}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
            {/* Title */}
            <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder={getHorizonInfo(formHorizon).desc}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            {/* Description */}
            <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
              placeholder="詳細（任意）"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-16 outline-none focus:border-mint mb-2" />
            {saveError && <p className="text-red-500 text-xs mb-2">{saveError}</p>}
            <button onClick={handleAdd} disabled={saving || !formTitle.trim()}
              className="w-full bg-mint text-white font-bold py-3 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">
              {saving ? "保存中..." : "追加する"}
            </button>
          </div>
        )}

        {/* Grouped Vision Cards */}
        {visions.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ目標がありません</p>
            <p className="text-xs text-text-light">最終ゴールから逆算して、夢を形にしよう！</p>
          </div>
        ) : (
          grouped.filter(g => g.items.length > 0).map(group => (
            <div key={group.value} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{group.emoji}</span>
                <h3 className="text-sm font-extrabold" style={{ color: group.color }}>{group.label}</h3>
                <span className="text-[10px] text-text-light ml-auto">{group.items.length}件</span>
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map(vision => (
                  <div key={vision.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-base mt-0.5">{getCategoryEmoji(vision.category)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold">{vision.title}</p>
                        {vision.description && <p className="text-xs text-text-mid mt-0.5 leading-relaxed">{vision.description}</p>}
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-text-light">進捗</span>
                        <span className="text-xs font-extrabold" style={{ color: group.color }}>{vision.progress}%</span>
                      </div>
                      <input type="range" min={0} max={100} step={5} value={vision.progress}
                        onChange={(e) => handleProgress(vision.id, parseInt(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{ background: `linear-gradient(90deg, ${group.color} ${vision.progress}%, #e5e7eb ${vision.progress}%)` }} />
                    </div>
                    {/* AI Feedback */}
                    {vision.ai_feedback && (
                      <div className="bg-mint-light rounded-xl p-3 mb-2">
                        <div className="flex items-center gap-1 mb-1">
                          <Image src="/sho.png" alt="Sho" width={16} height={16} className="rounded-full" />
                          <span className="text-[10px] font-bold text-mint">Sho のアドバイス</span>
                        </div>
                        <p className="text-xs text-text leading-relaxed">{vision.ai_feedback}</p>
                      </div>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleFeedback(vision)} disabled={feedbackLoading === vision.id}
                        className="text-[10px] font-bold text-mint border border-mint rounded-full px-3 py-1 hover:bg-mint-light transition disabled:opacity-50">
                        {feedbackLoading === vision.id ? "分析中..." : "🤖 AIアドバイス"}
                      </button>
                      <button onClick={() => handleDelete(vision.id)}
                        className="text-[10px] text-text-light hover:text-red-400 transition ml-auto">削除</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Connector line */}
              {group.items.length > 0 && group.value !== "monthly" && (
                <div className="flex justify-center py-1">
                  <div className="w-0.5 h-4 bg-gray-200 rounded-full" />
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
