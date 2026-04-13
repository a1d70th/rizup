"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { safeInsertTodo } from "@/lib/safe-insert";
import { showToast } from "@/components/Toast";

interface Todo {
  id: string;
  title: string;
  vision_id: string | null;
  due_date: string;
  is_done: boolean;
  done_at: string | null;
}

interface Vision { id: string; title: string; time_horizon: string; }

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

function TodayInner() {
  const params = useSearchParams();
  const presetVisionId = params.get("vision_id");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newVisionId, setNewVisionId] = useState<string>(presetVisionId || "");
  const [showAdd, setShowAdd] = useState(!!presetVisionId);
  const [celebrate, setCelebrate] = useState(false);
  const today = todayJST();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: todoData } = await supabase.from("todos")
        .select("*").eq("user_id", user.id).eq("due_date", today)
        .order("is_done").order("created_at");
      if (todoData) setTodos(todoData);

      const { data: visionData } = await supabase.from("visions")
        .select("id, title, time_horizon").eq("user_id", user.id)
        .in("time_horizon", ["monthly", "1year", "3year", "final"])
        .order("time_horizon");
      if (visionData) setVisions(visionData);

      setLoading(false);
    };
    init();
  }, [today]);

  const handleToggle = async (todo: Todo) => {
    const newDone = !todo.is_done;
    await supabase.from("todos")
      .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq("id", todo.id);
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_done: newDone, done_at: newDone ? new Date().toISOString() : null } : t));
    if (newDone) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 700);
    }
  };

  const handleAdd = async () => {
    if (!userId || !newTitle.trim()) return;
    (document.activeElement as HTMLElement)?.blur();
    const payload: Record<string, unknown> = {
      user_id: userId, title: newTitle.trim(), due_date: today,
    };
    if (newVisionId) payload.vision_id = newVisionId;
    const { data, error } = await safeInsertTodo<Todo>(supabase, payload);
    if (error) {
      showToast("error", error.message);
      return;
    }
    if (data) {
      setTodos(prev => [...prev, data]);
      showToast("success", `「${data.title}」を追加🌱`);
    }
    setNewTitle(""); setNewVisionId(""); setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("todos").delete().eq("id", id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleCarryOver = async (id: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tom = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
    await supabase.from("todos").update({ due_date: tom }).eq("id", id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const doneCount = todos.filter(t => t.is_done).length;
  const pct = todos.length > 0 ? Math.round((doneCount / todos.length) * 100) : 0;

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
          <div>
            <h2 className="text-lg font-extrabold">✅ 今日のToDo</h2>
            <p className="text-xs text-text-light">{new Date().toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)} aria-label="ToDoを追加"
            className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
            {showAdd ? "✕" : "＋ 追加"}
          </button>
        </div>

        {/* 進捗 */}
        {todos.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 flex items-center gap-3">
            <div className="relative w-14 h-14">
              <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6ecbb0" strokeWidth="3"
                  strokeDasharray={`${pct}, 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-mint">{pct}%</div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{doneCount} / {todos.length} 完了</p>
              <p className="text-[10px] text-text-light">
                {pct === 100 ? "全部やりきった！最高だね" : pct >= 50 ? "半分超え。いい流れ！" : "一つずつでOK"}
              </p>
            </div>
            {celebrate && (
              <Image src="/sho.png" alt="Sho" width={48} height={48} className="rounded-full animate-sho-bounce" />
            )}
          </div>
        )}

        {/* 追加フォーム */}
        {showAdd && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
              placeholder="今日やること" aria-label="ToDoのタイトル"
              onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            {visions.length > 0 && (
              <select value={newVisionId} onChange={e => setNewVisionId(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white mb-2">
                <option value="">紐付けるビジョン（任意）</option>
                {visions.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
              </select>
            )}
            <button onClick={handleAdd} disabled={!newTitle.trim()}
              className="w-full bg-mint text-white font-bold py-2.5 rounded-full text-sm disabled:opacity-30">
              追加する
            </button>
          </div>
        )}

        {/* 一覧 */}
        {todos.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">今日のToDoがまだないよ</p>
            <p className="text-xs text-text-light">小さな一歩を3つだけ決めよう</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {todos.map(todo => {
              const linkedVision = visions.find(v => v.id === todo.vision_id);
              return (
                <div key={todo.id}
                  className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3 transition ${todo.is_done ? "border-mint/30 bg-mint-light/30" : "border-gray-100"}`}>
                  <button onClick={() => handleToggle(todo)}
                    aria-label={todo.is_done ? `${todo.title}を未完了にする` : `${todo.title}を完了にする`}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition shrink-0 ${todo.is_done ? "border-mint bg-mint text-white animate-check-pulse" : "border-gray-200"}`}>
                    {todo.is_done ? "✓" : ""}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold break-words ${todo.is_done ? "line-through text-text-light" : ""}`}>{todo.title}</p>
                    {linkedVision && (
                      <p className="text-[10px] text-mint mt-0.5">🎯 {linkedVision.title}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!todo.is_done && (
                      <button onClick={() => handleCarryOver(todo.id)} aria-label="翌日へ持ち越し"
                        className="text-[10px] text-text-light hover:text-mint px-2">→明日</button>
                    )}
                    <button onClick={() => handleDelete(todo.id)} aria-label="削除"
                      className="text-[10px] text-text-light hover:text-red-400 px-2">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 空状態ヒント */}
        {todos.length === 0 && visions.length === 0 && (
          <div className="mt-4 bg-mint-light/50 rounded-2xl p-4 text-center">
            <p className="text-xs text-text-mid">まずは <a href="/vision" className="text-mint font-bold underline">ビジョン</a> から目標を決めてみよう</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <TodayInner />
    </Suspense>
  );
}
