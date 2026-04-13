"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import Link from "next/link";

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

interface HabitLight { id: string; vision_id: string | null; }
interface TodoLight { id: string; vision_id: string | null; is_done: boolean; due_date: string; }
interface HabitLogLight { habit_id: string; logged_date: string; }

const horizons = [
  { value: "final" as const, label: "最終ゴール", emoji: "⭐", color: "#f4976c", desc: "人生で達成したい究極の夢" },
  { value: "3year" as const, label: "3年後", emoji: "🚀", color: "#e88a62", desc: "3年後にどうなっていたい？" },
  { value: "1year" as const, label: "1年後", emoji: "🎯", color: "#6ecbb0", desc: "1年後の具体的な目標" },
  { value: "monthly" as const, label: "今月", emoji: "✅", color: "#5ab89d", desc: "今月中にやるアクション" },
];

const categoryOptions = [
  { value: "work", label: "仕事", emoji: "💼" },
  { value: "money", label: "お金", emoji: "💰" },
  { value: "health", label: "健康", emoji: "💪" },
  { value: "relationship", label: "人間関係", emoji: "🤝" },
  { value: "growth", label: "自己成長", emoji: "🌱" },
  { value: "other", label: "その他", emoji: "✨" },
];

export default function VisionPage() {
  const [visions, setVisions] = useState<Vision[]>([]);
  const [habits, setHabits] = useState<HabitLight[]>([]);
  const [todos, setTodos] = useState<TodoLight[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLogLight[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formHorizon, setFormHorizon] = useState<Vision["time_horizon"]>("monthly");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCategory, setFormCategory] = useState("growth");
  const [saving, setSaving] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: vData }, { data: hData }, { data: tData }] = await Promise.all([
        supabase.from("visions").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("habits").select("id, vision_id").eq("user_id", user.id),
        supabase.from("todos").select("id, vision_id, is_done, due_date").eq("user_id", user.id),
      ]);
      if (vData) setVisions(vData);
      if (hData) setHabits(hData);
      if (tData) setTodos(tData);

      // 過去7日の habit_logs
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: logData } = await supabase.from("habit_logs")
        .select("habit_id, logged_date").eq("user_id", user.id)
        .gte("logged_date", weekAgo.toISOString().split("T")[0]);
      if (logData) setHabitLogs(logData);

      setLoading(false);
    };
    init();
  }, []);

  const autoProgress = useMemo(() => {
    const map: Record<string, number> = {};
    for (const v of visions) {
      const visionTodos = todos.filter(t => t.vision_id === v.id);
      const visionHabits = habits.filter(h => h.vision_id === v.id);
      const todoTotal = visionTodos.length;
      const todoDone = visionTodos.filter(t => t.is_done).length;
      const todoPct = todoTotal > 0 ? (todoDone / todoTotal) : 0;

      let habitPct = 0;
      if (visionHabits.length > 0) {
        const target = visionHabits.length * 7;
        const done = habitLogs.filter(l => visionHabits.some(h => h.id === l.habit_id)).length;
        habitPct = Math.min(done / target, 1);
      }

      const hasTodo = todoTotal > 0;
      const hasHabit = visionHabits.length > 0;
      if (!hasTodo && !hasHabit) { map[v.id] = v.progress; continue; }
      if (hasTodo && hasHabit) map[v.id] = Math.round((todoPct * 0.6 + habitPct * 0.4) * 100);
      else if (hasTodo) map[v.id] = Math.round(todoPct * 100);
      else map[v.id] = Math.round(habitPct * 100);
    }
    return map;
  }, [visions, todos, habits, habitLogs]);

  const handleAdd = async () => {
    if (!userId || !formTitle.trim()) return;
    (document.activeElement as HTMLElement)?.blur();
    setSaving(true);
    const { data } = await supabase.from("visions").insert({
      user_id: userId, title: formTitle.trim(),
      description: formDesc.trim() || null,
      category: formCategory, time_horizon: formHorizon, progress: 0,
    }).select().single();
    if (data) setVisions(prev => [...prev, data]);
    setFormTitle(""); setFormDesc(""); setShowForm(false);
    setSaving(false);
  };

  const handleFeedback = async (v: Vision) => {
    setFeedbackLoading(v.id);
    try {
      const res = await fetch("/api/vision-feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: v.title, description: v.description, category: v.category,
          time_horizon: v.time_horizon, progress: autoProgress[v.id] ?? v.progress,
        }),
      });
      const data = await res.json();
      if (data.feedback) {
        await supabase.from("visions").update({ ai_feedback: data.feedback }).eq("id", v.id);
        setVisions(prev => prev.map(x => x.id === v.id ? { ...x, ai_feedback: data.feedback } : x));
      }
    } catch { /* ignore */ }
    setFeedbackLoading(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この目標を削除しますか？")) return;
    await supabase.from("visions").delete().eq("id", id);
    setVisions(prev => prev.filter(v => v.id !== id));
  };

  const getHorizon = (h: string) => horizons.find(x => x.value === h) || horizons[3];
  const getCatEmoji = (c: string) => categoryOptions.find(x => x.value === c)?.emoji || "✨";

  const grouped = horizons.map(h => ({
    ...h,
    items: visions.filter(v => v.time_horizon === h.value),
  }));

  const overall = visions.length > 0
    ? Math.round(visions.reduce((s, v) => s + (autoProgress[v.id] ?? v.progress), 0) / visions.length)
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">🎯 ビジョン</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
            {showForm ? "✕" : "＋ 追加"}
          </button>
        </div>

        {visions.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">全体の進捗</span>
              <span className="text-sm font-extrabold text-mint">{overall}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="rounded-full h-3 transition-all"
                style={{ width: `${overall}%`, background: "linear-gradient(90deg, #6ecbb0, #f4976c)" }} />
            </div>
            <p className="text-[10px] text-text-light mt-2">習慣とToDoの達成率から自動計算</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
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
            <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
              placeholder={getHorizon(formHorizon).desc}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
              placeholder="詳細（任意）"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-16 outline-none focus:border-mint mb-2" />
            <button onClick={handleAdd} disabled={saving || !formTitle.trim()}
              className="w-full bg-mint text-white font-bold py-3 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">
              {saving ? "保存中..." : "追加する"}
            </button>
          </div>
        )}

        {visions.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ目標がありません</p>
            <p className="text-xs text-text-light">最終ゴールから逆算してみよう</p>
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
                {group.items.map(v => {
                  const prog = autoProgress[v.id] ?? v.progress;
                  const linkedHabits = habits.filter(h => h.vision_id === v.id).length;
                  const linkedTodos = todos.filter(t => t.vision_id === v.id).length;
                  return (
                    <div key={v.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm animate-fade-in">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-base mt-0.5">{getCatEmoji(v.category)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold break-words">{v.title}</p>
                          {v.description && <p className="text-xs text-text-mid mt-0.5 leading-relaxed">{v.description}</p>}
                        </div>
                      </div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-text-light">進捗</span>
                          <span className="text-xs font-extrabold" style={{ color: group.color }}>{prog}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="rounded-full h-2 transition-all"
                            style={{ width: `${prog}%`, background: group.color }} />
                        </div>
                      </div>
                      {/* 逆算導線 */}
                      <div className="flex gap-2 mb-2">
                        <Link href={`/habits?vision_id=${v.id}`}
                          className="flex-1 bg-mint-light text-mint text-[10px] font-bold text-center py-1.5 rounded-full">
                          ＋習慣 {linkedHabits > 0 && `(${linkedHabits})`}
                        </Link>
                        <Link href={`/today?vision_id=${v.id}`}
                          className="flex-1 bg-orange-light text-orange text-[10px] font-bold text-center py-1.5 rounded-full">
                          ＋ToDo {linkedTodos > 0 && `(${linkedTodos})`}
                        </Link>
                      </div>
                      {v.ai_feedback && (
                        <div className="bg-mint-light rounded-xl p-3 mb-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Image src="/sho.png" alt="Sho" width={16} height={16} className="rounded-full" />
                            <span className="text-[10px] font-bold text-mint">Sho のアドバイス</span>
                          </div>
                          <p className="text-xs text-text leading-relaxed">{v.ai_feedback}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleFeedback(v)} disabled={feedbackLoading === v.id}
                          className="text-[10px] font-bold text-mint border border-mint rounded-full px-3 py-1 hover:bg-mint-light transition disabled:opacity-50">
                          {feedbackLoading === v.id ? "分析中..." : "🤖 AIアドバイス"}
                        </button>
                        <button onClick={() => handleDelete(v.id)}
                          className="text-[10px] text-text-light hover:text-red-400 transition ml-auto">削除</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
