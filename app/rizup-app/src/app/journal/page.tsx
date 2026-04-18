"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import type { AnimalKind } from "@/components/MyCharacter";
import { compressImage } from "@/lib/image-compress";
import { dailyCompoundScore } from "@/lib/compound";
import { safeInsertPost, findTodayPost } from "@/lib/safe-insert";
import { showToast } from "@/components/Toast";

const moodOptions = [
  { value: 4, emoji: "😊", label: "いい感じ", color: "bg-mint-light border-mint text-mint" },
  { value: 2, emoji: "😔", label: "しんどい", color: "bg-[#1a2030] border-[#2a3a50] text-[#8aa0c0]" },
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
  const router = useRouter();
  const [mode, setMode] = useState<"morning" | "evening">("morning");
  const [mood, setMood] = useState(0);
  const [content, setContent] = useState("");
  const [sleepHours, setSleepHours] = useState("");
  const [bedtime, setBedtime] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      return localStorage.getItem(`rizup_bedtime_${today}`) || "";
    } catch { return ""; }
  });
  // 夜の3行日記（B案）
  const [didWell, setDidWell] = useState("");
  const [grateful, setGrateful] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  // 朝活チャレンジ: 起床時刻（朝モード）
  const [wakeTime, setWakeTime] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      const raw = localStorage.getItem("rizup_wake_log") || "[]";
      const log: { date: string; time: string }[] = JSON.parse(raw);
      return log.find(r => r.date === today)?.time || "";
    } catch { return ""; }
  });
  const saveWakeTime = (t: string) => {
    setWakeTime(t);
    if (!t) return;
    try {
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
      const raw = localStorage.getItem("rizup_wake_log") || "[]";
      const log: { date: string; time: string }[] = JSON.parse(raw);
      const filtered = log.filter(r => r.date !== today);
      localStorage.setItem("rizup_wake_log", JSON.stringify([...filtered, { date: today, time: t }].slice(-60)));
    } catch { /* ignore */ }
  };
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [wantWrite, setWantWrite] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [, setCharAnimal] = useState<AnimalKind | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  // 夜モード用: 今朝の投稿
  const [morningPost, setMorningPost] = useState<MorningPost | null>(null);
  const [goalAchieved, setGoalAchieved] = useState<"yes" | "partial" | "no" | null>(null);
  const [morningTodos, setMorningTodos] = useState<(Todo & { done: boolean })[]>([]);
  const [habitDoneRatio, setHabitDoneRatio] = useState(0);


  // もっと書く▼（デフォルト折りたたみ・最小2-3タップで投稿）

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
        // 行が存在しない場合は client upsert → ダメなら server-side /api/ensure-profile で強制作成
        // → posts insert の FK 違反を撲滅
        try {
          const { data: prof } = await supabase.from("profiles").select("is_suspended, character_animal, streak").eq("id", user.id).maybeSingle();
          if (!prof) {
            const clientUpsert = await supabase
              .from("profiles")
              .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
            if (clientUpsert.error) {
              // RLS 等で失敗 → サーバー側 service_role で強制作成
              await fetch("/api/ensure-profile", { method: "POST" }).catch(() => {});
            }
          } else {
            if (prof.is_suspended) setSuspended(true);
            if (prof.character_animal) setCharAnimal(prof.character_animal as AnimalKind);
            if (prof.streak) setCurrentStreak(prof.streak);
          }
        } catch {
          // 最終防衛：例外でもサーバー側で試す
          fetch("/api/ensure-profile", { method: "POST" }).catch(() => {});
        }

        // 今日ToDo（夜の振り返り用）
        let todos: Todo[] | null = null;
        try {
          const { data } = await supabase.from("todos")
            .select("id, title, vision_id, is_done")
            .eq("user_id", user.id).eq("due_date", today)
            .order("created_at");
          todos = data as Todo[] | null;
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
    const allText = [content, didWell, grateful, tomorrow].filter(Boolean).join(" ");
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

    // 夜モード: 3行日記（できたこと/感謝/明日へ）を本文に整形
    const combinedContent = (() => {
      if (mode === "evening") {
        const lines: string[] = [];
        if (didWell.trim())  lines.push(`🌱 できたこと：${didWell.trim()}`);
        if (grateful.trim()) lines.push(`🙏 感謝：${grateful.trim()}`);
        if (tomorrow.trim()) lines.push(`💭 明日へ：${tomorrow.trim()}`);
        const three = lines.join("\n");
        if (three && content.trim()) return `${three}\n\n${content.trim()}`;
        if (three) return three;
        return content.trim();
      }
      // 朝は自由記述のみ
      return content.trim();
    })();

    // posts insert
    const payload: Record<string, unknown> = {
      user_id: userId, type: mode, content: combinedContent,
      mood, image_url: imageUrl,
    };
    if (mode === "morning") {
      // 朝活データ: 起床/入眠/睡眠を保存（safe-insert が未マイグレ列を落とす）
      if (wakeTime) payload.wake_time = wakeTime;
      if (bedtime) payload.bedtime = bedtime;
      if (sleepHours) payload.sleep_hours = parseFloat(sleepHours);
    } else {
      if (sleepHours) payload.sleep_hours = parseFloat(sleepHours);
      // 3行日記のフィールドを個別に保存（検索・集計用）
      if (didWell.trim())  payload.did_well = didWell.trim();
      if (grateful.trim()) payload.grateful = grateful.trim();
      if (tomorrow.trim()) payload.tomorrow_word = tomorrow.trim();
      if (morningPost) {
        payload.linked_morning_post_id = morningPost.id;
        if (goalAchieved) payload.goal_achieved = goalAchieved;
      }
      // 夜の積み上げスコアを保存
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

      // 非同期: ポジティブ度
      fetch("/api/analyze/score", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: data.id, content: allText }),
      }).catch(() => {});
      // ── streak 更新（投稿 OR 起床時刻記録 のどちらかで加算） ──
      try {
        const { data: recent } = await supabase.from("posts")
          .select("created_at").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(120);
        const toJst = (d: string) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
        const dateSet = new Set((recent || []).map(p => toJst(p.created_at)));
        // 起床時刻のみを記録した日も streak に含める（習慣化の摩擦を最小化）
        try {
          const wakeRaw = localStorage.getItem("rizup_wake_log") || "[]";
          const wakeLog: { date: string; time: string }[] = JSON.parse(wakeRaw);
          wakeLog.forEach(r => { if (r.date) dateSet.add(r.date); });
        } catch { /* ignore */ }
        const todayJstStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
        let newStreak = 0;
        const cursor = new Date(todayJstStr + "T00:00:00");
        if (!dateSet.has(todayJstStr)) cursor.setDate(cursor.getDate() - 1);
        for (let i = 0; i < 120; i++) {
          const k = cursor.toLocaleDateString("en-CA");
          if (dateSet.has(k)) { newStreak++; cursor.setDate(cursor.getDate() - 1); }
          else break;
        }
        setCurrentStreak(newStreak);
        try {
          await supabase.from("profiles").update({ streak: newStreak }).eq("id", userId);
        } catch { /* RLS 等で失敗しても UI は先行 */ }
      } catch {
        setCurrentStreak(s => s + 1);
      }
      // 3) サーバー側で手紙等のロジックも走らせる（UI 反映はしない）
      fetch("/api/check-progress", { method: "POST" }).catch(() => {});

      // 強み抽出（非同期・失敗してもUXに影響しない）
      fetch("/api/strength-detect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: allText, mood }),
      }).then(r => r.json()).then(async (res) => {
        if (res?.strength) {
          showToast("info", `今日の投稿から「${res.strength}」という強みが見えます✨`);
          try {
            const { data: prof } = await supabase.from("profiles")
              .select("strengths").eq("id", userId).maybeSingle();
            const current = Array.isArray(prof?.strengths) ? prof.strengths : [];
            const next = [...current.filter((s: string) => s !== res.strength), res.strength].slice(-12);
            await supabase.from("profiles").update({ strengths: next }).eq("id", userId);
          } catch { /* ignore */ }
        }
      }).catch(() => {});

      setAiFeedback(feedback);
      showToast("success", `投稿できたよ！${mode === "morning" ? "☀️" : "🌙"} 今日の積み上げ +1🌱`);
      setPosted(true);
      // 朝のひとこと投稿後: 3秒後にホームへ遷移
      if (mode === "morning") {
        setTimeout(() => router.push("/home?posted=true"), 3000);
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
        <h2 className="text-2xl font-extrabold mb-1">{!content.trim() ? "来てくれただけで十分だよ" : "投稿できたよ！"}</h2>
        <p className="text-xs text-text-mid mb-4">今日の積み上げ +1🌱</p>
        {aiFeedback && (
          <div className="bg-mint-light rounded-2xl p-4 max-w-xs mb-6 text-left">
            <div className="flex items-center gap-1.5 mb-2">
              <Image src="/icons/icon-192.png" alt="Rizup" width={20} height={20} className="rounded-full" />
              <span className="text-xs font-bold text-mint">Rizup より</span>
            </div>
            <p className="text-sm text-text leading-relaxed">{aiFeedback}</p>
          </div>
        )}
        {/* 明日のプレビュー */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl px-4 py-3 max-w-xs mb-4 border border-gray-100 dark:border-[#2a2a2a]">
          <p className="text-xs font-bold text-text-mid mb-1">🔮 明日のプレビュー</p>
          <p className="text-sm font-extrabold text-text dark:text-gray-100">
            {currentStreak <= 2
              ? "明日、もっとヒビが入るかも...！🥚"
              : currentStreak <= 6
                ? "明日は何の冒険かな？🐣"
                : ["明日もあなたの言葉を待ってるよ🌱", "明日来たら、森がもう少し育ってるかも🌿", "明日はどんな発見があるかな？✨", "明日の自分に楽しみを残しておこう"][Math.floor(Date.now() / 86400000) % 4]}
          </p>
        </div>
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
            ☀️ 朝のひとこと
          </button>
          <button onClick={() => setMode("evening")}
            className={`flex-1 py-3 rounded-xl text-sm font-extrabold transition-all ${mode === "evening" ? "bg-gradient-to-br from-mint-light to-blue-50 text-mint shadow-md shadow-mint/20 scale-[1.02]" : "text-text-light"}`}>
            🌙 夜のふりかえり
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1">
            <p className="font-extrabold text-lg">{mode === "morning" ? "おはよう！☀️" : "おつかれさま🌙"}</p>
            <p className="text-xs text-text-mid">
              {mode === "morning" ? "気分をタップするだけでOK" : "今日の振り返り。朝の目標は達成できた？"}
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

        {/* 朝モード: 朝活チャレンジ（入眠・起床・睡眠） */}
        {mode === "morning" && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🌅</span>
              <p className="text-sm font-extrabold dark:text-gray-100">みんなの朝活チャレンジ</p>
            </div>
            <div className="flex flex-col gap-2">
              {/* 入眠時刻 */}
              <div className="flex items-center gap-3 py-1">
                <span className="text-[13px] font-bold text-text-mid w-16 shrink-0">🌙 昨夜入眠</span>
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => {
                    const v = e.target.value;
                    setBedtime(v);
                    try {
                      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
                      if (v) localStorage.setItem(`rizup_bedtime_${today}`, v);
                      else localStorage.removeItem(`rizup_bedtime_${today}`);
                    } catch {}
                    if (v && wakeTime) {
                      const [bH, bM] = v.split(":").map(Number);
                      const [wH, wM] = wakeTime.split(":").map(Number);
                      let mins = (wH * 60 + wM) - (bH * 60 + bM);
                      if (mins <= 0) mins += 24 * 60;
                      setSleepHours((mins / 60).toFixed(1));
                    }
                  }}
                  aria-label="昨夜の入眠時刻"
                  className="flex-1 border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-[15px] font-extrabold bg-white dark:bg-[#111111] text-orange outline-none focus:border-orange"
                  style={{ WebkitAppearance: "none", minWidth: 0 }}
                />
              </div>
              {/* 起床時刻 */}
              <div className="flex items-center gap-3 py-1">
                <span className="text-[13px] font-bold text-text-mid w-16 shrink-0">☀️ 起床</span>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => {
                    const v = e.target.value;
                    saveWakeTime(v);
                    if (v && bedtime) {
                      const [bH, bM] = bedtime.split(":").map(Number);
                      const [wH, wM] = v.split(":").map(Number);
                      let mins = (wH * 60 + wM) - (bH * 60 + bM);
                      if (mins <= 0) mins += 24 * 60;
                      setSleepHours((mins / 60).toFixed(1));
                    }
                  }}
                  aria-label="起床時刻"
                  className="flex-1 border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-[15px] font-extrabold bg-white dark:bg-[#111111] text-orange outline-none focus:border-orange"
                  style={{ WebkitAppearance: "none", minWidth: 0 }}
                />
              </div>
              {/* 睡眠時間 */}
              <div className="flex items-center gap-3 py-1">
                <span className="text-[13px] font-bold text-text-mid w-16 shrink-0">⏱ 睡眠</span>
                <input
                  type="number" min="0" max="24" step="0.5"
                  value={sleepHours}
                  onChange={e => setSleepHours(e.target.value)}
                  aria-label="睡眠時間（時間）"
                  placeholder="7"
                  inputMode="decimal"
                  className="flex-1 border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-3 py-2 text-[15px] font-extrabold bg-white dark:bg-[#111111] text-orange outline-none focus:border-orange"
                  style={{ WebkitAppearance: "none", minWidth: 0 }} />
                <span className="text-[13px] font-bold text-text-mid w-4 text-left shrink-0">h</span>
              </div>
            </div>
            <p className="text-[11px] text-text-light mt-3">入眠・起床を入れると睡眠時間を自動計算するよ</p>
          </div>
        )}

        {/* 夜モード: 3行日記（B案） */}
        {mode === "evening" && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <p className="text-sm font-extrabold mb-3 dark:text-gray-100">📖 3行でふりかえる</p>
            <div className="space-y-3">
              <label className="block">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-mint mb-1">
                  🌱 できたこと <span className="text-text-light font-normal">（小さくてもOK）</span>
                </span>
                <input
                  type="text" value={didWell}
                  onChange={e => setDidWell(e.target.value)}
                  placeholder="例：散歩を15分できた"
                  maxLength={100}
                  className="w-full border-2 border-mint/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint bg-white dark:bg-[#111111]"
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-orange mb-1">
                  🙏 感謝したこと <span className="text-text-light font-normal">（人・モノ・空気なんでも）</span>
                </span>
                <input
                  type="text" value={grateful}
                  onChange={e => setGrateful(e.target.value)}
                  placeholder="例：同僚が声をかけてくれた"
                  maxLength={100}
                  className="w-full border-2 border-orange/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-orange bg-white dark:bg-[#111111]"
                />
              </label>
              <label className="block">
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#06b6d4] mb-1">
                  💭 明日への一言 <span className="text-text-light font-normal">（未来の自分へ）</span>
                </span>
                <input
                  type="text" value={tomorrow}
                  onChange={e => setTomorrow(e.target.value)}
                  placeholder="例：早起きできたらコーヒーご褒美"
                  maxLength={100}
                  className="w-full border-2 border-[#06b6d4]/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#06b6d4] bg-white dark:bg-[#111111]"
                />
              </label>
            </div>
            <p className="text-[11px] text-text-light mt-3">どれか1つだけでも送信OK</p>
          </div>
        )}

        {/* 気分（二択・大きめ） */}
        <div className="bg-white dark:bg-[#252535] rounded-2xl p-6 border border-gray-100 dark:border-[#3a3a4a] mb-3">
          <p className="text-base font-extrabold mb-5 text-center dark:text-gray-100">今の気分は？</p>
          <div className="flex gap-4 justify-center">
            {moodOptions.map(m => (
              <button key={m.value} onClick={() => { setMood(m.value); setWantWrite(false); }}
                className={`flex flex-col items-center gap-3 px-10 py-6 min-h-[80px] rounded-2xl border-2 transition-all ${
                  mood === m.value ? m.color + " scale-105 shadow-lg" : "bg-gray-50 dark:bg-[#2a2a3a] border-gray-200 dark:border-[#3a3a4a] opacity-50"
                }`}>
                <span className="text-5xl">{m.emoji}</span>
                <span className="text-base font-extrabold">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 気分選択後：一言追加する のみ（送信ボタンは sticky） */}
        {mood !== 0 && !wantWrite && (
          <div className="flex flex-col gap-3 mb-3 animate-fade-in">
            <button onClick={() => setWantWrite(true)}
              className="w-full bg-white dark:bg-[#252535] border-2 border-gray-100 dark:border-[#3a3a4a] text-text-mid font-bold py-3.5 rounded-2xl text-sm active:scale-95 transition">
              💬 一言追加する
            </button>
          </div>
        )}

        {/* スキップ導線 */}
        <div className="text-center mb-2">
          <button
            onClick={() => router.push("/home")}
            className="text-emerald-400 font-bold underline-offset-2 hover:underline py-2"
            style={{ fontSize: 16 }}
          >
            今日は書かなくていい
          </button>
        </div>

        {/* 一言入力（wantWrite時のみ表示） */}
        {mood !== 0 && wantWrite && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3 animate-fade-in">
            <p className="text-sm font-bold mb-2">
              {mood === 4 ? "今日のひとこと（書かなくてもOK）" : "少し話す？（無理しなくていいよ）"}
            </p>
            <textarea value={content} onChange={e => { setContent(e.target.value); setModerationError(null); }}
              placeholder="今日のひとこと、何でも"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-20 outline-none focus:border-mint"
              maxLength={500}
              autoFocus />
          </div>
        )}

        {/* 夜モード: ✍️ もっと書く（自由記述・任意） */}
        {mode === "evening" && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <p className="text-sm font-bold mb-2 dark:text-gray-100">✍️ もっと書く <span className="text-[11px] text-text-light font-normal">（任意）</span></p>
            <textarea value={content} onChange={e => { setContent(e.target.value); setModerationError(null); }}
              placeholder="今日あったこと、感じたこと、なんでも"
              className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-4 py-3 text-sm resize-none h-28 outline-none focus:border-mint bg-white dark:bg-[#111111]"
              maxLength={500} />
          </div>
        )}

        {moderationError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-3 flex items-start gap-3" role="alert">
            <Image src="/icons/icon-192.png" alt="Rizup" width={32} height={32} className="rounded-full shrink-0" />
            <p className="text-xs text-red-600 leading-relaxed">{moderationError}</p>
          </div>
        )}

        {/* 夜モード: 任意の画像添付 */}
        {mode === "evening" && (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
            <button onClick={() => imageRef.current?.click()} type="button"
              className="flex items-center gap-1 text-sm text-text-light hover:text-mint transition">
              📷 画像を追加（任意）
            </button>
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

        {/* スペーサー: 固定ボタン + BottomNav の裏に隠れないよう（iOS safe-area 分を多めに） */}
        <div aria-hidden="true" className="h-44" />
      </div>

      {/* 固定投稿ボタン（気分選択済み or 夜モード時に常時表示） */}
      {(mood !== 0 || mode === "evening") && (
        <div
          className="fixed left-0 right-0 z-40 px-4 pointer-events-none"
          style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="max-w-md mx-auto pointer-events-auto">
            <button onClick={handlePost}
              disabled={loading || mood === 0}
              aria-label="ジャーナルを投稿"
              className="w-full bg-mint text-white font-extrabold py-3.5 sm:py-4 rounded-full shadow-xl shadow-mint/40 disabled:opacity-40 text-[15px] sm:text-base flex items-center justify-center gap-2">
              {loading ? "投稿中..." : mode === "morning"
                ? (wantWrite ? <><span>☀️</span><span>朝のひとことを送る</span></> : <><span>✨</span><span>このまま送る</span></>)
                : <><span>🌙</span><span>夜のふりかえりを送る</span></>}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
