"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { compressImage } from "@/lib/image-compress";
import { dailyCompoundScore } from "@/lib/compound";
import CountUp from "@/components/CountUp";
import { safeInsertPost, safeInsertTodo, findTodayPost } from "@/lib/safe-insert";
import { showToast } from "@/components/Toast";

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

// 朝のプロンプト質問ローテ（曜日ごと・JST）
const MORNING_PROMPTS = [
  "来週の自分に一言送るなら？",        // 日
  "今日の一番大切なことは？",          // 月
  "今日どんな自分でいたい？",          // 火
  "今日終わったら何に感謝できそう？",  // 水
  "今日乗り越えたいことは？",          // 木
  "今週できたことを一つ挙げるなら？",  // 金
  "今日誰かに何かしてあげられる？",    // 土
];
function morningPromptOfToday(): string {
  const dow = new Date().getDay(); // 0=日
  return MORNING_PROMPTS[dow];
}

interface Todo { id: string; title: string; vision_id: string | null; is_done: boolean; }
interface MorningPost {
  id: string;
  morning_goal: string | null;
  mood: number;
  content: string;
}

export default function JournalPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"morning" | "evening">("morning");
  const [mood, setMood] = useState(3);
  const [content, setContent] = useState("");
  const [gratitudes, setGratitudes] = useState(["", "", ""]);
  const [sleepHours, setSleepHours] = useState("");
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

  // 昨日の朝目標（"⟳ 昨日と同じ" ボタン用）
  const [lastMorningGoal, setLastMorningGoal] = useState<string>("");

  // 朝1分タイマー（Fabulous 方式）
  const [timerSec, setTimerSec] = useState<number | null>(null);

  // もっと書く▼（デフォルト折りたたみ・最小2-3タップで投稿）
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (timerSec == null) return;
    if (timerSec <= 0) { showToast("success", "1分の自分時間、おつかれさま🌿"); setTimerSec(null); return; }
    const t = setTimeout(() => setTimerSec(s => (s == null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [timerSec]);

  const imageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const today = todayJST();
    setMode(new Date().getHours() < 15 ? "morning" : "evening");
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        // プロフィール取得（テーブル/カラム不在でも落ちない）
        try {
          const { data: prof } = await supabase.from("profiles").select("is_suspended").eq("id", user.id).maybeSingle();
          if (prof?.is_suspended) setSuspended(true);
        } catch { /* ignore */ }

        // 今日ToDo
        let todos: Todo[] | null = null;
        try {
          const { data } = await supabase.from("todos")
            .select("id, title, vision_id, is_done")
            .eq("user_id", user.id).eq("due_date", today)
            .order("created_at");
          todos = data as Todo[] | null;
          if (todos) setAvailableTodos(todos);
        } catch { /* ignore */ }

        // 習慣達成率
        try {
          const { data: habitsData } = await supabase.from("habits")
            .select("id").eq("user_id", user.id).is("archived_at", null);
          if (habitsData && habitsData.length > 0) {
            const { data: logs } = await supabase.from("habit_logs")
              .select("habit_id").eq("user_id", user.id).eq("logged_date", today);
            setHabitDoneRatio((logs?.length || 0) / habitsData.length);
          }
        } catch { /* ignore */ }

        // 昨日の朝目標（今日まだ未投稿時のみ再利用提案用）
        try {
          const yest = new Date();
          yest.setDate(yest.getDate() - 1);
          const yestJST = yest.toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
          const { data: yp } = await supabase.from("posts")
            .select("morning_goal, created_at")
            .eq("user_id", user.id).eq("type", "morning")
            .gte("created_at", `${yestJST}T00:00:00+09:00`)
            .lt("created_at", `${yestJST}T23:59:59+09:00`)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (yp?.morning_goal) setLastMorningGoal(yp.morning_goal);
        } catch { /* ignore */ }

        // 夜モード：朝投稿
        try {
          const currentHour = new Date().getHours();
          if (currentHour >= 15) {
            const morning = await findTodayPost(supabase, user.id, "morning");
            if (morning) {
              setMorningPost({
                id: morning.id,
                morning_goal: morning.morning_goal || null,
                mood: morning.mood ?? 3,
                content: morning.content || "",
              });
              try {
                const { data: jt } = await supabase.from("journal_todos")
                  .select("todo_id").eq("post_id", morning.id);
                if (jt && jt.length > 0 && todos) {
                  const ids = new Set(jt.map((r: { todo_id: string }) => r.todo_id));
                  setMorningTodos(todos.filter(t => ids.has(t.id)).map(t => ({ ...t, done: t.is_done })));
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore */ }
      } catch (e) {
        console.error("[Journal init]", e);
      }
    };
    init();
  }, []);

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
    const { data, error } = await safeInsertTodo<Todo>(supabase, {
      user_id: userId, title: newTodoTitle.trim(), due_date: todayJST(),
    });
    if (error) {
      showToast("error", `ToDoを追加できませんでした：${error.message}`);
      return;
    }
    if (data) {
      setAvailableTodos(prev => [...prev, data]);
      setSelectedTodoIds(prev => new Set(prev).add(data.id));
      showToast("success", `「${data.title}」を追加したよ🌱`);
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
          setModerationError(`Rizup「この内容はそのまま送れないよ。${modData.reason || "前向きな言葉で書き直してね"}」（警告 ${newCount}/3）`);
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
      if (sleepHours) payload.sleep_hours = parseFloat(sleepHours);
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

    // 新カラム (morning_goal, sleep_hours, 等) がまだDBに無い場合、
    // safeInsertPost が core カラムのみで再試行してくれる
    const { data, error, usedFallback } = await safeInsertPost<{ id: string }>(supabase, payload);

    if (error) {
      if (error.code === "23505") {
        setModerationError("今日はもう投稿済みだよ。明日また書いてね！");
        showToast("info", "今日はもう投稿済みだよ");
      } else {
        setModerationError(`投稿できませんでした：${error.message}`);
        showToast("error", `投稿に失敗：${error.message}`);
      }
      setLoading(false);
      return;
    }

    if (usedFallback) {
      showToast("info", "投稿できた（DB更新中のため一部情報は保存されてないかも）");
    }

    if (data) {
      // 朝モード: journal_todos に保存（テーブル未作成は無視）
      if (mode === "morning" && selectedTodoIds.size > 0) {
        try {
          const rows = Array.from(selectedTodoIds).map(tid => ({ post_id: data.id, todo_id: tid }));
          await supabase.from("journal_todos").insert(rows);
        } catch { /* 未作成は無視 */ }
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
      showToast("success", `投稿できたよ！${mode === "morning" ? "☀️" : "🌙"} 複利 +1% 積まれた🌱`);
      setPosted(true);
      // 朝ジャーナル投稿後: 3秒後にホームへ遷移
      if (mode === "morning") {
        setTimeout(() => router.push("/home"), 3000);
      }
    }
    setLoading(false);
  };

  if (suspended) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/icons/icon-192.png" alt="Rizup" width={80} height={80} className="rounded-full mb-4" />
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
        <Image src="/icons/icon-192.png" alt="Rizup" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
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
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-4">
          <Image src="/icons/icon-192.png" alt="Rizup" width={120} height={120} className="rounded-full animate-sho-bounce drop-shadow-xl" />
          <div className="absolute -top-2 -right-2 text-3xl animate-pop">🎉</div>
        </div>
        <h2 className="text-2xl font-extrabold mb-1">投稿できたよ！</h2>
        <p className="text-xs text-text-mid mb-4">複利が+1%積まれた 🌱</p>
        {aiFeedback && (
          <div className="bg-mint-light rounded-2xl p-4 max-w-xs mb-6 text-left">
            <div className="flex items-center gap-1.5 mb-2">
              <Image src="/icons/icon-192.png" alt="Rizup" width={20} height={20} className="rounded-full" />
              <span className="text-xs font-bold text-mint">Rizup より</span>
            </div>
            <p className="text-sm text-text leading-relaxed">{aiFeedback}</p>
          </div>
        )}
        <div className="flex gap-3">
          <a href="/home" className="bg-mint text-white font-bold px-6 py-3 rounded-full shadow-lg shadow-mint/30">ホームへ</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-5 shadow-sm">
          <button onClick={() => setMode("morning")}
            className={`flex-1 py-3 rounded-xl text-sm font-extrabold transition-all ${mode === "morning" ? "bg-gradient-to-br from-orange-light to-yellow-50 text-orange shadow-md shadow-orange/20 scale-[1.02]" : "text-text-light"}`}>
            ☀️ 朝ジャーナル
          </button>
          <button onClick={() => setMode("evening")}
            className={`flex-1 py-3 rounded-xl text-sm font-extrabold transition-all ${mode === "evening" ? "bg-gradient-to-br from-mint-light to-blue-50 text-mint shadow-md shadow-mint/20 scale-[1.02]" : "text-text-light"}`}>
            🌙 夜ジャーナル
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Image src="/icons/icon-192.png" alt="Rizup" width={40} height={40} className="rounded-full" />
          <div className="flex-1">
            <p className="font-extrabold">{mode === "morning" ? "おはよう！☀️" : "おつかれさま🌙"}</p>
            <p className="text-xs text-text-mid">
              {mode === "morning" ? "今日の気分と、やること3つを決めよう" : "今日の振り返り。朝の目標は達成できた？"}
            </p>
          </div>
          {mode === "morning" && timerSec == null && (
            <button
              onClick={() => setTimerSec(60)}
              aria-label="1分だけ自分と向き合う"
              className="text-[11px] font-bold bg-mint-light text-mint border border-mint/30 rounded-full px-3 py-1.5 hover:bg-mint/10 transition shrink-0">
              ⏱ 1分
            </button>
          )}
          {mode === "morning" && timerSec != null && (
            <button
              onClick={() => setTimerSec(null)}
              aria-label="タイマーを止める"
              className="text-[11px] font-extrabold bg-mint text-white rounded-full px-3 py-1.5 shrink-0 animate-pop">
              {timerSec}秒
            </button>
          )}
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
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
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

        {/* 睡眠（朝は折りたたみ / 夜は常時表示） */}
        {(mode === "evening" || showMore) && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <p className="text-sm font-bold mb-2">
              {mode === "morning" ? "😴 昨夜の睡眠時間" : "😴 昨夜は何時間寝ましたか？"}
            </p>
            <input type="number" min="0" max="24" step="0.5"
              value={sleepHours} onChange={e => setSleepHours(e.target.value)}
              placeholder="例：7"
              aria-label="睡眠時間"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint box-border"
              style={{ WebkitAppearance: "none" }} />
          </div>
        )}

        {/* 朝モード: 今日の問いかけ（曜日ローテ・大きめ） */}
        {mode === "morning" && (
          <div className="relative bg-gradient-to-br from-mint-light via-white to-mint-light/50 dark:from-[#132824] dark:via-[#1a1a1a] dark:to-[#132824] rounded-3xl px-5 py-4 border border-mint/30 shadow-md shadow-mint/10 mb-3 overflow-hidden">
            <span className="absolute -top-3 -right-3 text-[64px] opacity-10 select-none">🌿</span>
            <p className="text-[11px] font-extrabold text-mint mb-1 tracking-wider">🌿 今日の問いかけ</p>
            <p className="text-base font-extrabold text-text dark:text-gray-100 leading-relaxed">{morningPromptOfToday()}</p>
          </div>
        )}

        {/* 朝モード: 今日の目標（強調表示） */}
        {mode === "morning" && (
          <div className="bg-gradient-to-br from-orange-light to-yellow-50 dark:from-[#2a1f15] dark:to-[#1f1a10] rounded-3xl p-5 border-2 border-orange/40 shadow-lg shadow-orange/10 mb-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-base font-extrabold text-orange">🎯 今日の一言目標</p>
              {lastMorningGoal && morningGoal === "" && (
                <button
                  onClick={() => setMorningGoal(lastMorningGoal)}
                  aria-label="昨日と同じ目標を使う"
                  className="text-[12px] font-extrabold text-white bg-orange rounded-full px-3 py-1.5 shadow-md shadow-orange/30 hover:opacity-90 active:scale-95 transition"
                >
                  ⟳ 昨日と同じ
                </button>
              )}
            </div>
            <p className="text-[11px] text-text-mid mb-3">1日1つ、小さくてもOK（50字前後がちょうどいい）</p>
            <input type="text" value={morningGoal} onChange={e => setMorningGoal(e.target.value)}
              placeholder="例：10分だけ読書する" maxLength={100}
              aria-label="今日の目標"
              className="w-full border-2 border-orange/30 bg-white dark:bg-[#1a1a1a] rounded-xl px-4 py-3 text-base font-bold outline-none focus:border-orange" />
            <p className="text-[10px] text-text-light mt-1 text-right">{morningGoal.length}/100</p>
          </div>
        )}

        {/* 朝モード: ToDo選択（折りたたみ内） */}
        {mode === "morning" && showMore && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
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

        {/* もっと書く▼ トグル（朝は最初から折りたたむ） */}
        {mode === "morning" && !showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="w-full py-2 mb-3 text-xs font-extrabold text-mint hover:bg-mint-light dark:hover:bg-[#1f2824] rounded-full transition"
            aria-label="追加項目を表示">
            もっと書く ▼（睡眠・ToDo・本文・画像）
          </button>
        )}

        {/* 本文（朝モードは showMore 時のみ / 夜モードは常時） */}
        {(mode === "evening" || showMore) && (
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="添付プレビュー" className="w-full max-h-48 object-cover rounded-xl" />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                aria-label="画像を削除"
                className="absolute top-2 right-2 bg-black/50 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center">✕</button>
            </div>
          )}
        </div>
        )}

        {moderationError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3 flex items-start gap-3" role="alert">
            <Image src="/icons/icon-192.png" alt="Rizup" width={32} height={32} className="rounded-full shrink-0" />
            <p className="text-xs text-red-600 leading-relaxed">{moderationError}</p>
          </div>
        )}

        {/* 夜モード: もっと書く▼ */}
        {mode === "evening" && !showMore && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            className="w-full py-2 mb-3 text-xs font-extrabold text-mint hover:bg-mint-light dark:hover:bg-[#1f2824] rounded-full transition"
            aria-label="追加項目を表示">
            もっと書く ▼（感謝・複利スコア・画像）
          </button>
        )}

        {/* 夜モード: 今日の複利スコア予測（showMore 時のみ） */}
        {mode === "evening" && showMore && (() => {
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

        {mode === "evening" && showMore && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <p className="text-sm font-bold mb-3">🙏 今日の感謝</p>
            {["今日ありがたかったこと", "誰かに感謝したいこと", "自分を褒めたいこと"].map((ph, i) => (
              <input key={i} type="text" value={gratitudes[i]}
                onChange={e => { const g = [...gratitudes]; g[i] = e.target.value; setGratitudes(g); }}
                placeholder={ph}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            ))}
          </div>
        )}

        {/* スペーサー: 固定ボタンの裏に隠れないよう */}
        <div aria-hidden="true" className="h-20" />
      </div>

      {/* 固定投稿ボタン：スクロールせず常に押せる */}
      <div
        className="fixed left-0 right-0 bottom-16 z-40 px-4 pointer-events-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <button onClick={handlePost}
            disabled={loading || (mode === "morning" ? (!morningGoal.trim() && !content.trim()) : !content.trim())}
            aria-label="ジャーナルを投稿"
            className="w-full bg-mint text-white font-bold py-4 rounded-full shadow-xl shadow-mint/40 disabled:opacity-40 text-base backdrop-blur-md">
            {loading ? "投稿中..." : mode === "morning" ? "☀️ 朝ジャーナルを投稿" : "🌙 夜ジャーナルを投稿"}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
