"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { compoundPercent } from "@/lib/compound";

interface Habit {
  id: string;
  title: string;
  icon?: string | null;
  vision_id?: string | null;
}
interface Vision { id: string; title: string; }

const iconOptions = ["📚", "🏃", "🧘", "📝", "🙏", "💪", "🎵", "🍎", "💤", "🚶"];
const MAX_HABITS = 10;

function HabitsInner() {
  const params = useSearchParams();
  const presetVisionId = params.get("vision_id");
  const [habits, setHabits] = useState<Habit[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [todayLogs, setTodayLogs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(!!presetVisionId);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📚");
  const [newVisionId, setNewVisionId] = useState(presetVisionId || "");
  const [addError, setAddError] = useState("");
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [{ data: h }, { data: v }] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", user.id).is("archived_at", null).order("created_at"),
        supabase.from("visions").select("id, title").eq("user_id", user.id).order("time_horizon"),
      ]);
      if (h) setHabits(h);
      if (v) setVisions(v);

      try {
        const { data: logs } = await supabase.from("habit_logs").select("habit_id")
          .eq("user_id", user.id).eq("logged_date", today);
        if (logs) setTodayLogs(new Set(logs.map((l: { habit_id: string }) => l.habit_id)));
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [today]);

  const handleAdd = async () => {
    if (!userId || !newName.trim() || habits.length >= MAX_HABITS) return;
    (document.activeElement as HTMLElement)?.blur();
    setAddError("");
    const payload: Record<string, unknown> = {
      user_id: userId, title: newName.trim(), icon: newIcon,
    };
    if (newVisionId) payload.vision_id = newVisionId;
    const { data, error } = await supabase.from("habits").insert(payload).select().single();
    if (error) {
      setAddError(`保存できませんでした：${error.message}`);
      return;
    }
    if (data) setHabits(prev => [...prev, data]);
    setNewName(""); setNewVisionId(""); setShowAdd(false);
  };

  const handleToggle = async (h: Habit) => {
    if (!userId) return;
    const done = todayLogs.has(h.id);
    try {
      if (done) {
        await supabase.from("habit_logs").delete().match({ habit_id: h.id, logged_date: today });
        setTodayLogs(prev => { const s = new Set(prev); s.delete(h.id); return s; });
      } else {
        await supabase.from("habit_logs").insert({ habit_id: h.id, user_id: userId, logged_date: today });
        setTodayLogs(prev => new Set(prev).add(h.id));
        setCelebrateId(h.id);
        setTimeout(() => setCelebrateId(null), 700);
      }
    } catch { /* ignore */ }
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
          <h2 className="text-lg font-extrabold">🔄 習慣トラッカー</h2>
          {habits.length < MAX_HABITS && (
            <button onClick={() => setShowAdd(!showAdd)} aria-label="習慣を追加"
              className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
              {showAdd ? "✕" : "＋ 追加"}
            </button>
          )}
        </div>

        {habits.length > 0 && (
          <div className="glass-mint rounded-2xl p-4 mb-4 animate-slide-up">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">今日の達成</span>
              <span className="text-sm font-extrabold text-mint">{completed}/{habits.length}</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-2 mb-2">
              <div className="bg-mint rounded-full h-2 transition-all duration-500"
                style={{ width: `${habits.length > 0 ? (completed / habits.length) * 100 : 0}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center bg-white/60 rounded-xl p-2">
              <div><p className="text-[9px] text-text-mid">30日続けると</p><p className="text-xs font-extrabold text-mint">+{compoundPercent(30)}%</p></div>
              <div><p className="text-[9px] text-text-mid">90日続けると</p><p className="text-xs font-extrabold text-mint">+{compoundPercent(90)}%</p></div>
              <div><p className="text-[9px] text-text-mid">1年続けると</p><p className="text-xs font-extrabold text-orange">+{compoundPercent(365).toLocaleString()}%</p></div>
            </div>
          </div>
        )}

        {showAdd && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <p className="text-sm font-bold mb-2">新しい習慣（最大{MAX_HABITS}個）</p>
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {iconOptions.map(ic => (
                <button key={ic} onClick={() => setNewIcon(ic)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition ${newIcon === ic ? "border-mint bg-mint-light" : "border-gray-100"}`}>
                  {ic}
                </button>
              ))}
            </div>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="例：10分読書" aria-label="習慣名"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2"
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }} />
            {visions.length > 0 && (
              <select value={newVisionId} onChange={e => setNewVisionId(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white mb-2">
                <option value="">紐付けるビジョン（任意）</option>
                {visions.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            )}
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="w-full bg-mint text-white font-bold py-2.5 rounded-full text-sm disabled:opacity-30">
              追加する
            </button>
            {addError && <p className="text-red-500 text-xs mt-2">{addError}</p>}
          </div>
        )}

        {habits.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ習慣がありません</p>
            <p className="text-xs text-text-light">毎日続けたい小さな行動を決めよう</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {habits.map(h => {
              const done = todayLogs.has(h.id);
              const linkedVision = visions.find(v => v.id === h.vision_id);
              const celebrate = celebrateId === h.id;
              return (
                <div key={h.id} className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition ${done ? "border-mint bg-mint-light/30" : "border-gray-100"}`}>
                  <button onClick={() => handleToggle(h)}
                    aria-label={done ? `${h.title}を未完了にする` : `${h.title}を完了にする`}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition shrink-0 ${done ? "border-mint bg-mint text-white animate-check-pulse" : "border-gray-200"}`}>
                    {done ? "✓" : (h.icon || "📌")}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${done ? "line-through text-text-light" : ""}`}>{h.title}</p>
                    {linkedVision && (
                      <p className="text-[10px] text-mint mt-0.5 truncate">🎯 {linkedVision.title}</p>
                    )}
                  </div>
                  {celebrate && (
                    <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full animate-sho-bounce shrink-0" />
                  )}
                  <button onClick={() => handleDelete(h.id)} aria-label="削除"
                    className="text-text-light text-xs hover:text-red-400 p-2 shrink-0">✕</button>
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

export default function HabitsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <HabitsInner />
    </Suspense>
  );
}
