"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { compressImage } from "@/lib/image-compress";
import { dailyCompoundScore } from "@/lib/compound";
import CountUp from "@/components/CountUp";

const moodOptions = [
  { value: 1, emoji: "😔", label: "つらい" },
  { value: 2, emoji: "😐", label: "ふつう" },
  { value: 3, emoji: "🙂", label: "まあまあ" },
  { value: 4, emoji: "😊", label: "いい感じ" },
  { value: 5, emoji: "🤩", label: "最高！" },
];

function todayJST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

interface Todo { id: string; title: string; vision_id: string | null; is_done: boolean; }
interface MorningPost {
  id: string;
  morning_goal: string | null;
  mood: number;
  content: string;
}

export default function JournalPage() {
  const [mode, setMode] = useState<"morning" | "evening">("morning");
  const [mood, setMood] = useState(3);
  const [content, setContent] = useState("");
  const [gratitudes, setGratitudes] = useState(["", "", ""]);
  const [sleepHours, setSleepHours] = useState("");
  const [bedtime, setBedtime] = useState("");
  const [morningGoal, setMorningGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 朝モード用: 今日のToDo選択
  const [availableTodos, setAvailableTodos] = useState<Todo[]>([]);
  const [selectedTodoIds, setSelectedTodoIds] = useState<Set<string>>(new Set());
  const [newTodoTitle, setNewTodoTitle] = useState("");

  // 夜モード用: 今朝の投稿
  const [morningPost, setMorningPost] = useState<MorningPost | null>(null);
  const [goalAchieved, setGoalAchieved] = useState<"yes" | "partial" | "no" | null>(null);
  const [morningTodos, setMorningTodos] = useState<(Todo & { done: boolean })[]>([]);
  const [habitDoneRatio, setHabitDoneRatio] = useState(0);

  const imageRef = useRef<HTMLInputElement>(null);
  const today = todayJST();

  useEffect(() => {
    setMode(new Date().getHours() < 15 ? "morning" : "evening");
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: prof } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).single();
      if (prof?.is_suspended) setSuspended(true);

      // 既存の今日ToDoを取得
      const { data: todos } = await supabase.from("todos")
        .select("id, title, vision_id, is_done")
        .eq("user_id", user.id).eq("due_date", today)
        .order("created_at");
      if (todos) setAvailableTodos(todos);

      // 習慣達成率（夜の複利スコア計算用）
      const { data: habitsData } = await supabase.from("habits")
        .select("id").eq("user_id", user.id).is("archived_at", null);
      if (habitsData && habitsData.length > 0) {
        const { data: logs } = await supabase.from("habit_logs")
          .select("habit_id").eq("user_id", user.id).eq("logged_date", today);
        setHabitDoneRatio((logs?.length || 0) / habitsData.length);
      }

      // 夜モードなら朝投稿を取得
      const currentHour = new Date().getHours();
      if (currentHour >= 15) {
        const { data: morning } = await supabase.from("posts")
          .select("id, morning_goal, mood, content")
          .eq("user_id", user.id).eq("type", "morning").eq("posted_date", today)
          .maybeSingle();
        if (morning) {
          setMorningPost(morning);
          // journal_todos で朝に選ばれたToDoを取得
          const { data: jt } = await supabase.from("journal_todos")
            .select("todo_id").eq("post_id", morning.id);
          if (jt && jt.length > 0 && todos) {
            const ids = new Set(jt.map(r => r.todo_id));
            setMorningTodos(todos.filter(t => ids.has(t.id)).map(t => ({ ...t, done: t.is_done })));
          }
        }
      }
    };
    init();
  }, [today]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageFile(compressed);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  const addNewTodo = async () => {
    if (!userId || !newTodoTitle.trim()) return;
    const { data } = await supabase.from("todos")
      .insert({ user_id: userId, title: newTodoTitle.trim(), due_date: today })
      .select().single();
    if (data) {
      setAvailableTodos(prev => [...prev, data]);
      setSelectedTodoIds(prev => new Set(prev).add(data.id));
    }
    setNewTodoTitle("");
  };

  const toggleTodoSelection = (id: string) => {
    setSelectedTodoIds(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else if (s.size < 3) s.add(id);
      return s;
    });
  };

  const toggleMorningTodoDone = async (todo: Todo & { done: boolean }) => {
    const newDone = !todo.done;
    await supabase.from("todos")
      .update({ is_done: newDone, done_at: newDone ? new Date().toISOString() : null })
      .eq("id", todo.id);
    setMorningTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: newDone } : t));
  };

  const handlePost = async () => {
    (document.activeElement as HTMLElement)?.blur();
    setLoading(true);
    setModerationError(null);
    setCrisis(false);

    if (!userId) { setLoading(false); return; }

    // モデレーション
    const allText = [content, morningGoal, ...gratitudes].filter(Boolean).join(" ");
    try {
      const modRes = await fetch("/api/moderate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: allText }),
      });
      const modData = await modRes.json();
      if (!modData.safe) {
        // 危機検知
        if (modData.reason && /自傷|死|消えたい|無理/.test(modData.reason)) {
          setCrisis(true);
          setLoading(false);
          return;
        }
        const { data: prof } = await supabase.from("profiles").select("warning_count").eq("id", userId).single();
        const newCount = (prof?.warning_count || 0) + 1;
        const updates: Record<string, unknown> = { warning_count: newCount };
        if (newCount >= 3) updates.is_suspended = true;
        await supabase.from("profiles").update(updates).eq("id", userId);
        if (newCount >= 3) {
          setSuspended(true);
          setModerationError("アカウントが一時停止されました。");
        } else {
          setModerationError(`Sho「この内容はそのまま送れないよ。${modData.reason || "前向きな言葉で書き直してね"}」（警告 ${newCount}/3）`);
        }
        setLoading(false);
        return;
      }
    } catch { /* 通信エラーは通す */ }

    // 画像アップロード
    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("posts").upload(path, imageFile, { upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    // posts insert
    const payload: Record<string, unknown> = {
      user_id: userId, type: mode, content: content || (mode === "morning" ? morningGoal : ""),
      mood, image_url: imageUrl,
    };
    if (mode === "morning") {
      if (morningGoal.trim()) payload.morning_goal = morningGoal.trim();
      if (sleepHours) payload.sleep_hours = parseFloat(sleepHours);
    } else {
      if (bedtime) payload.bedtime = bedtime;
      const gs = gratitudes.filter(g => g.trim());
      if (gs.length > 0) payload.gratitudes = gs;
      if (morningPost) {
        payload.linked_morning_post_id = morningPost.id;
        if (goalAchieved) payload.goal_achieved = goalAchieved;
      }
      // 夜の複利スコアを保存
      const todoRate = morningTodos.length === 0 ? 0.5
        : morningTodos.filter(t => t.done).length / morningTodos.length;
      const score = dailyCompoundScore({
        todoCompletionRate: todoRate,
        habitCompletionRate: habitDoneRatio,
        positivityRate: mood / 5,
      });
      payload.compound_score_today = score;
    }

    const { data, error } = await supabase.from("posts").insert(payload).select().single();

    if (error) {
      if (error.code === "23505") {
        setModerationError("今日はもう投稿済みだよ。明日また書いてね！");
      } else {
        setModerationError(`投稿できませんでした：${error.message}`);
      }
      setLoading(false);
      return;
    }

    if (data) {
      // 朝モード: journal_todos に保存
      if (mode === "morning" && selectedTodoIds.size > 0) {
        const rows = Array.from(selectedTodoIds).map(tid => ({ post_id: data.id, todo_id: tid }));
        await supabase.from("journal_todos").insert(rows);
      }

      // AIフィードバック（シンプル版）
      const feedbacks = mode === "morning" ? [
        `今日の一歩、ちゃんと言葉にできたね。選んだToDoを終わらせる必要はない。できる分だけでOK。`,
        `朝から自分と向き合うの、すごい。ゆっくり始めよう。`,
        `目標を書くだけで半分は前進してる。今日もあなたのペースで。`,
      ] : [
        `おつかれさま。${goalAchieved === "yes" ? "今朝の目標、達成できたね！" : goalAchieved === "partial" ? "少しでも前に進めたこと、大事だよ。" : "今日は達成できなくても、書いたこと自体が明日への種だよ。"}`,
        `1日を振り返る時間を取ったこと、それだけで十分すごい。ゆっくり休んでね。`,
        `あなたの正直な気持ち、ちゃんと受け取ったよ。明日もあなたのペースで。`,
      ];
      const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
      await supabase.from("posts").update({ ai_feedback: feedback }).eq("id", data.id);

      // 非同期: ポジティブ度・streak
      fetch("/api/analyze/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.id, content: allText }),
      }).catch(() => {});
      fetch("/api/check-progress", { method: "POST" }).catch(() => {});

      setAiFeedback(feedback);
      setPosted(true);
    }
    setLoading(false);
  };

  if (suspended) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/sho.png" alt="Sho" width={80} height={80} className="rounded-full mb-4" />
        <h2 className="text-xl font-extrabold mb-2">投稿が制限されています</h2>
        <p className="text-sm text-text-mid leading-relaxed mb-6 max-w-xs">
          コミュニティガイドライン違反のため、アカウントが一時停止されました。<br />
          心当たりがない場合はお問い合わせください。
        </p>
        <a href="mailto:a1d.70th@gmail.com?subject=アカウント停止について"
          className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30">お問い合わせ</a>
      </div>
    );
  }

  if (crisis) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/sho.png" alt="Sho" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
        <h2 className="text-xl font-extrabold mb-2">あなたの気持ち、受け止めたよ</h2>
        <p className="text-sm text-text-mid leading-relaxed mb-6 max-w-sm">
          一人で抱え込まなくていいからね。<br />
          今つらい気持ちがあるなら、専門の相談窓口に連絡してほしい。
        </p>
        <div className="bg-mint-light rounded-2xl p-4 mb-6 text-left w-full max-w-sm">
          <p className="text-xs font-bold text-mint mb-2">📞 よりそいホットライン</p>
          <p className="text-sm font-bold mb-2">0120-279-338（24時間・無料）</p>
          <p className="text-xs font-bold text-mint mb-2">📞 いのちの電話</p>
          <p className="text-sm font-bold mb-2">0120-783-556（毎日16:00〜21:00）</p>
          <p className="text-xs font-bold text-mint mb-2">💬 チャット相談</p>
          <a href="https://www.npo-tms.or.jp/" target="_blank" rel="noopener"
            className="text-sm text-mint underline break-all">NPO法人 東京メンタルヘルス</a>
        </div>
        <p className="text-xs text-text-light mb-6 max-w-xs">あなたは一人じゃない。必ず助けてくれる人がいるよ。</p>
        <button onClick={() => setCrisis(false)}
          className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30">
          閉じる
        </button>
      </div>
    );
  }

  if (posted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/sho.png" alt="Sho" width={80} height={80} className="rounded-full mb-4 animate-sho-bounce" />
        <h2 className="text-xl font-extrabold mb-4">投稿できたよ！</h2>
        {aiFeedback && (
          <div className="bg-mint-light rounded-2xl p-4 max-w-xs mb-6 text-left">
            <div className="flex items-center gap-1.5 mb-2">
              <Image src="/sho.png" alt="Sho" width={20} height={20} className="rounded-full" />
              <span className="text-xs font-bold text-mint">Rizup より</span>
            </div>
            <p className="text-sm text-text leading-relaxed">{aiFeedback}</p>
          </div>
        )}
        <div className="flex gap-3">
          <a href="/home" className="bg-mint text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-mint/30">ホームへ</a>
          {mode === "morning" && (
            <a href="/today" className="border-2 border-mint text-mint font-bold px-6 py-3 rounded-full">今日のToDo</a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-5">
          <button onClick={() => setMode("morning")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${mode === "morning" ? "bg-orange-light text-orange" : "text-text-light"}`}>
            ☀️ 朝ジャーナル
          </button>
          <button onClick={() => setMode("evening")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${mode === "evening" ? "bg-mint-light text-mint" : "text-text-light"}`}>
            🌙 夜ジャーナル
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full" />
          <div>
            <p className="font-extrabold">{mode === "morning" ? "おはよう！☀️" : "おつかれさま🌙"}</p>
            <p className="text-xs text-text-mid">
              {mode === "morning" ? "今日の気分と、やること3つを決めよう" : "今日の振り返り。朝の目標は達成できた？"}
            </p>
          </div>
        </div>

        {/* 夜モード: 朝の振り返り */}
        {mode === "evening" && morningPost && (
          <div className="bg-orange-light rounded-2xl p-4 border border-orange/20 mb-3">
            <p className="text-xs font-bold text-orange mb-2">🌅 今朝のあなた</p>
            {morningPost.morning_goal && (
              <p className="text-sm text-text mb-2">「{morningPost.morning_goal}」</p>
            )}
            <p className="text-xs text-text-mid mb-3">気分 {morningPost.mood}/5</p>

            <p className="text-xs font-bold mb-2">達成できた？</p>
            <div className="flex gap-2 mb-3">
              {([
                { v: "yes", label: "✅ できた", color: "bg-mint text-white" },
                { v: "partial", label: "⚠️ 一部", color: "bg-orange text-white" },
                { v: "no", label: "❌ 今日は…", color: "bg-gray-200 text-text-mid" },
              ] as const).map(opt => (
                <button key={opt.v} onClick={() => setGoalAchieved(opt.v)}
                  className={`flex-1 py-2 rounded-full text-xs font-bold transition ${goalAchieved === opt.v ? opt.color : "bg-white border border-gray-200 text-text-mid"}`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {morningTodos.length > 0 && (
              <>
                <p className="text-xs font-bold mb-2">朝選んだToDoの状況</p>
                <div className="flex flex-col gap-1.5">
                  {morningTodos.map(t => (
                    <button key={t.id} onClick={() => toggleMorningTodoDone(t)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-left text-xs transition ${t.done ? "bg-mint/10" : "bg-white"}`}>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${t.done ? "bg-mint border-mint text-white" : "border-gray-300"}`}>
                        {t.done && "✓"}
                      </span>
                      <span className={t.done ? "line-through text-text-light" : ""}>{t.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 気分 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          <p className="text-sm font-bold mb-3">今の気分は？</p>
          <div className="flex justify-between">
            {moodOptions.map(m => (
              <button key={m.value} onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 transition ${mood === m.value ? "scale-110" : "opacity-50"}`}>
                <span className={`text-3xl p-2 rounded-full ${mood === m.value ? "bg-mint-light" : ""}`}>{m.emoji}</span>
                <span className="text-[10px] text-text-light">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 睡眠 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          {mode === "morning" ? (
            <>
              <p className="text-sm font-bold mb-2">😴 昨夜の睡眠時間</p>
              <input type="number" min="0" max="24" step="0.5"
                value={sleepHours} onChange={e => setSleepHours(e.target.value)}
                placeholder="例：7"
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint box-border"
                style={{ WebkitAppearance: "none" }} />
            </>
          ) : (
            <>
              <p className="text-sm font-bold mb-2">🛏️ 今夜は何時に寝る？</p>
              <input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint box-border"
                style={{ WebkitAppearance: "none" }} />
            </>
          )}
        </div>

        {/* 朝モード: 今日の目標 */}
        {mode === "morning" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
            <p className="text-sm font-bold mb-2">🎯 今日の一言目標</p>
            <input type="text" value={morningGoal} onChange={e => setMorningGoal(e.target.value)}
              placeholder="例：10分だけ読書する" maxLength={100}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" />
          </div>
        )}

        {/* 朝モード: ToDo選択 */}
        {mode === "morning" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
            <p className="text-sm font-bold mb-1">✅ 今日やること（3つまで）</p>
            <p className="text-[10px] text-text-light mb-3">選択: {selectedTodoIds.size}/3</p>
            <div className="flex flex-col gap-1.5 mb-2">
              {availableTodos.map(t => {
                const sel = selectedTodoIds.has(t.id);
                const atLimit = !sel && selectedTodoIds.size >= 3;
                return (
                  <button key={t.id} onClick={() => toggleTodoSelection(t.id)}
                    disabled={atLimit}
                    className={`flex items-center gap-2 p-2 rounded-xl text-left text-sm transition disabled:opacity-40 ${sel ? "bg-mint-light border-2 border-mint" : "bg-gray-50 border-2 border-transparent"}`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${sel ? "bg-mint border-mint text-white" : "border-gray-300"}`}>
                      {sel && "✓"}
                    </span>
                    <span>{t.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newTodoTitle} onChange={e => setNewTodoTitle(e.target.value)}
                placeholder="新しいToDoを追加" onKeyDown={e => { if (e.key === "Enter") addNewTodo(); }}
                className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2 text-xs outline-none focus:border-mint" />
              <button onClick={addNewTodo} disabled={!newTodoTitle.trim()}
                className="bg-mint text-white font-bold px-4 py-2 rounded-xl text-xs disabled:opacity-30">追加</button>
            </div>
          </div>
        )}

        {/* 本文 */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          <p className="text-sm font-bold mb-2">{mode === "morning" ? "今日の一言（任意）" : "今日の振り返り"}</p>
          <textarea value={content} onChange={e => { setContent(e.target.value); setModerationError(null); }}
            placeholder={mode === "morning" ? "例：ちょっと不安だけど、やってみる" : "例：散歩したら気分が軽くなった"}
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-mint"
            maxLength={500} />
          <div className="flex items-center justify-between mt-1">
            <button onClick={() => imageRef.current?.click()} type="button"
              className="flex items-center gap-1 text-xs text-text-light hover:text-mint transition">
              📷 画像を追加
            </button>
            <p className="text-xs text-text-light">{content.length}/500</p>
          </div>
          <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imagePreview && (
            <div className="relative mt-2">
              <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-xl" />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center">✕</button>
            </div>
          )}
        </div>

        {moderationError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3 flex items-start gap-3" role="alert">
            <Image src="/sho.png" alt="Sho" width={32} height={32} className="rounded-full shrink-0" />
            <p className="text-xs text-red-600 leading-relaxed">{moderationError}</p>
          </div>
        )}

        {/* 夜モード: 今日の複利スコア予測 */}
        {mode === "evening" && (() => {
          const todoRate = morningTodos.length === 0 ? 0.5
            : morningTodos.filter(t => t.done).length / morningTodos.length;
          const score = dailyCompoundScore({
            todoCompletionRate: todoRate,
            habitCompletionRate: habitDoneRatio,
            positivityRate: mood / 5,
          });
          return (
            <div className="glass-mint rounded-2xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">✨</span>
                <p className="text-sm font-extrabold flex-1">今日の複利スコア</p>
                <span className="text-2xl font-extrabold text-mint"><CountUp value={score} />/100</span>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                <div className="bg-gradient-to-r from-mint to-orange rounded-full h-2 transition-all duration-700"
                  style={{ width: `${score}%` }} />
              </div>
              <p className="text-[10px] text-text-mid">ToDo達成 × 習慣 × 気分から算出。この積み重ねが明日のあなたを作る。</p>
            </div>
          );
        })()}

        {mode === "evening" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
            <p className="text-sm font-bold mb-3">🙏 今日の感謝</p>
            {["今日ありがたかったこと", "誰かに感謝したいこと", "自分を褒めたいこと"].map((ph, i) => (
              <input key={i} type="text" value={gratitudes[i]}
                onChange={e => { const g = [...gratitudes]; g[i] = e.target.value; setGratitudes(g); }}
                placeholder={ph}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            ))}
          </div>
        )}

        <button onClick={handlePost}
          disabled={loading || (mode === "morning" ? (!morningGoal.trim() && !content.trim()) : !content.trim())}
          aria-label="ジャーナルを投稿"
          className="w-full bg-mint text-white font-bold py-4 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30 text-base">
          {loading ? "投稿中..." : mode === "morning" ? "☀️ 朝ジャーナルを投稿" : "🌙 夜ジャーナルを投稿"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
