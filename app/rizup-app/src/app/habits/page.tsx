"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

interface Habit { id: string; name: string; icon?: string | null; streak?: number; }

const iconOptions = ["📚", "🏃", "🧘", "📝", "🙏", "💪", "🎵", "🍎", "💤", "🚶"];

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📚");

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: h, error: hErr } = await supabase.from("habits").select("*").eq("user_id", user.id).order("created_at");
      if (hErr) console.error("[Habits] Select error:", hErr.message);
      if (h) setHabits(h);

      try {
        const { data: logs } = await supabase.from("habit_logs").select("habit_id")
          .eq("user_id", user.id).eq("logged_date", today);
        if (logs) setTodayLogs(new Set(logs.map(l => l.habit_id)));
      } catch { /* habit_logs table may not exist yet */ }

      setLoading(false);
    };
    init();
  }, [today]);

  const [addError, setAddError] = useState("");

  const handleAdd = async () => {
    if (!userId || !newName.trim() || habits.length >= 5) return;
    (document.activeElement as HTMLElement)?.blur();
    setAddError("");
    const { data, error } = await supabase.from("habits").insert({
      user_id: userId, name: newName.trim(),
    }).select().single();
    if (error) {
      console.error("[Habits] Insert error:", error.message, error.code, error.details);
      setAddError(`保存できませんでした：${error.message}`);
      return;
    }
    if (data) setHabits(prev => [...prev, data]);
    setNewName(""); setShowAdd(false);
  };

  const handleToggle = async (habitId: string) => {
    if (!userId) return;
    const done = todayLogs.has(habitId);
    try {
      if (done) {
        await supabase.from("habit_logs").delete().match({ habit_id: habitId, logged_date: today });
        setTodayLogs(prev => { const s = new Set(prev); s.delete(habitId); return s; });
      } else {
        await supabase.from("habit_logs").insert({ habit_id: habitId, user_id: userId, logged_date: today });
        setTodayLogs(prev => new Set(prev).add(habitId));
      }
    } catch { /* habit_logs table may not exist yet */ }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この習慣を削除しますか？")) return;
    await supabase.from("habits").delete().eq("id", id);
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const completed = habits.filter(h => todayLogs.has(h.id)).length;

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
          <h2 className="text-lg font-extrabold">✅ 習慣トラッカー</h2>
          {habits.length < 5 && (
            <button onClick={() => setShowAdd(!showAdd)} aria-label="習慣を追加"
              className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
              {showAdd ? "✕" : "＋ 追加"}
            </button>
          )}
        </div>

        {/* Progress */}
        {habits.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">今日の達成</span>
              <span className="text-sm font-extrabold text-mint">{completed}/{habits.length}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-mint rounded-full h-2 transition-all" style={{ width: `${habits.length > 0 ? (completed / habits.length) * 100 : 0}%` }} />
            </div>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <p className="text-sm font-bold mb-2">新しい習慣（最大5つ）</p>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {iconOptions.map(ic => (
                <button key={ic} onClick={() => setNewIcon(ic)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition ${newIcon === ic ? "border-mint bg-mint-light" : "border-gray-100"}`}>
                  {ic}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="例：10分読書" aria-label="習慣名"
                className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint"
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }} />
              <button onClick={handleAdd} disabled={!newName.trim()} aria-label="追加"
                className="bg-mint text-white font-bold px-4 py-2.5 rounded-xl text-sm disabled:opacity-30">追加</button>
            </div>
            {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
          </div>
        )}

        {/* Habit list */}
        {habits.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ習慣がありません</p>
            <p className="text-xs text-text-light">毎日続けたい習慣を設定しよう！</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {habits.map(h => {
              const done = todayLogs.has(h.id);
              return (
                <div key={h.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition ${done ? "border-mint bg-mint-light/30" : "border-gray-100"}`}>
                  <button onClick={() => handleToggle(h.id)} aria-label={done ? `${h.name}を未完了にする` : `${h.name}を完了にする`}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition ${done ? "border-mint bg-mint text-white" : "border-gray-200"}`}>
                    {done ? "✓" : (h.icon || "📌")}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-bold ${done ? "line-through text-text-light" : ""}`}>{h.name}</p>
                  </div>
                  <button onClick={() => handleDelete(h.id)} aria-label="削除"
                    className="text-text-light text-xs hover:text-red-400 p-2">✕</button>
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
