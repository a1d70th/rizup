"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import Link from "next/link";
import { estimateDaysToGoal } from "@/lib/compound";
import { showToast } from "@/components/Toast";

interface AntiVision { id: string; content: string; created_at: string; }

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
  const [tab, setTab] = useState<"vision" | "anti">("vision");

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
    if (!confirm("このなりたい自分を削除しますか？")) return;
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
      <Image src="/icons/icon-192.png" alt="Rizup" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold">🎯 なりたい自分</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
            {showForm ? "✕" : "＋ 追加"}
          </button>
        </div>
        {/* タブ切替：ビジョン / アンチビジョン */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-4">
          <button onClick={() => setTab("vision")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === "vision" ? "bg-mint-light text-mint" : "text-text-light"}`}>
            🌱 なりたい自分
          </button>
          <button onClick={() => setTab("anti")}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${tab === "anti" ? "bg-orange-light text-orange" : "text-text-light"}`}>
            🚫 避けたい未来
          </button>
        </div>
        {tab === "anti" && (
          <AntiVisionPanel userId={userId} visions={visions} />
        )}
        {tab === "vision" && <></>}

        {visions.length > 0 && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">全体の進捗</span>
              <span className="text-sm font-extrabold text-mint">{overall}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="rounded-full h-3 transition-all"
                style={{ width: `${overall}%`, background: "linear-gradient(90deg, #6ecbb0, #f4976c)" }} />
            </div>
            <p className="text-[10px] text-text-light mt-2">毎日のこととToDoの達成率から自動計算</p>
          </div>
        )}

        {showForm && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4 animate-fade-in">
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

        {tab === "vision" && visions.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/icons/icon-192.png" alt="Rizup" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだなりたい自分がありません</p>
            <p className="text-xs text-text-light">最終ゴールから逆算してみよう</p>
          </div>
        ) : tab === "vision" ? (
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
                  // 達成予測：直近7日の進捗推定
                  const weeklyGain = prog > 0 ? Math.min(prog, 7) : 0;
                  const daysToGoal = estimateDaysToGoal({ currentProgress: prog, recentWeeklyGainPct: weeklyGain });
                  return (
                    <div key={v.id} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm animate-fade-in">
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
                        <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
                          <div className="rounded-full h-2 transition-all duration-700"
                            style={{
                              width: `${prog}%`,
                              background: `linear-gradient(90deg, ${group.color}, ${group.color}dd)`,
                              boxShadow: prog > 0 ? `0 0 12px ${group.color}66` : undefined,
                            }} />
                        </div>
                      </div>
                      {daysToGoal !== null && daysToGoal > 0 && prog < 100 && (
                        <p className="text-[10px] text-text-light mb-2">⏳ 今のペースなら、あと<span className="font-extrabold text-mint">{daysToGoal}日</span>で達成</p>
                      )}
                      {prog >= 100 && (
                        <p className="text-[10px] font-extrabold text-mint mb-2">🎉 目標達成！</p>
                      )}
                      {/* 逆算導線 */}
                      <div className="flex gap-2 mb-2">
                        <Link href={`/habits?vision_id=${v.id}`}
                          className="w-full bg-mint-light text-mint text-[10px] font-bold text-center py-1.5 rounded-full">
                          ＋毎日のこと {linkedHabits > 0 && `(${linkedHabits})`}
                        </Link>
                      </div>
                      {v.ai_feedback && (
                        <div className="bg-mint-light rounded-xl p-3 mb-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Image src="/icons/icon-192.png" alt="Rizup" width={16} height={16} className="rounded-full" />
                            <span className="text-[10px] font-bold text-mint">Rizup のアドバイス</span>
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
        ) : null}
      </div>
      <BottomNav />
    </div>
  );
}

/** アンチビジョン一覧（ビジョン画面のタブ内に埋め込み・自動生成） */
function AntiVisionPanel({ userId, visions }: { userId: string | null; visions: Vision[] }) {
  const [items, setItems] = useState<AntiVision[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase.from("anti_visions")
      .select("*").eq("user_id", userId).order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setItems(data); });
  }, [userId]);

  const handleGenerate = async () => {
    if (!userId || visions.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/anti-vision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visions: visions.map(v => ({ title: v.title, category: v.category, time_horizon: v.time_horizon })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) {
        showToast("error", "生成に失敗しました");
        setGenerating(false);
        return;
      }
      await supabase.from("anti_visions").delete().eq("user_id", userId);
      const rows = data.items.slice(0, 5).map((content: string) => ({ user_id: userId, content }));
      const { data: inserted } = await supabase.from("anti_visions").insert(rows).select();
      if (inserted) setItems(inserted);
      showToast("success", "避けたい未来を生成したよ🌿");
    } catch {
      showToast("error", "通信エラー");
    }
    setGenerating(false);
  };

  if (visions.length === 0) {
    return (
      <div className="mb-4 bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-gray-100 dark:border-[#2a2a2a] shadow-sm text-center animate-fade-in">
        <Image src="/icons/icon-192.png" alt="Rizup" width={56} height={56} className="rounded-full mx-auto mb-3 opacity-60" />
        <p className="text-sm font-bold mb-2">先になりたい自分を設定してください</p>
        <p className="text-xs text-text-light mb-4">なりたい自分の裏返しが避けたい未来になります。</p>
      </div>
    );
  }

  return (
    <div className="mb-4 animate-fade-in">
      <p className="text-xs text-text-mid leading-relaxed mb-3">
        5年後、絶対こうなりたくない自分。なりたい自分から自動で生成されるよ。
      </p>
      <button
        onClick={handleGenerate}
        disabled={generating}
        aria-label="避けたい未来を自動生成"
        className="w-full bg-orange text-white font-bold py-3 rounded-full shadow-md shadow-orange/30 disabled:opacity-50 mb-4">
        {generating ? "生成中…" : items.length > 0 ? "🔄 再生成する" : "✨ AIで自動生成する"}
      </button>
      {items.length === 0 ? (
        <p className="text-center text-xs text-text-light py-4">上のボタンからAIで自動生成してみよう</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((x, i) => (
            <div key={x.id} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-orange/20 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-light text-orange font-extrabold flex items-center justify-center text-sm shrink-0">{i + 1}</div>
                <p className="text-sm text-text dark:text-gray-100 leading-relaxed flex-1 whitespace-pre-wrap break-words">{x.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
