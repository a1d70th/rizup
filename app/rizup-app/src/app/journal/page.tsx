"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const moodOptions = [
  { value: 1, emoji: "😔", label: "つらい" },
  { value: 2, emoji: "😐", label: "ふつう" },
  { value: 3, emoji: "🙂", label: "まあまあ" },
  { value: 4, emoji: "😊", label: "いい感じ" },
  { value: 5, emoji: "🤩", label: "最高！" },
];

export default function JournalPage() {
  const [mode, setMode] = useState<"morning" | "evening">("morning");
  const [mood, setMood] = useState(3);
  const [content, setContent] = useState("");
  const [gratitudes, setGratitudes] = useState(["", "", ""]);
  const [sleepHours, setSleepHours] = useState("");
  const [bedtime, setBedtime] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  useEffect(() => {
    setMode(new Date().getHours() < 15 ? "morning" : "evening");
  }, []);

  const handlePost = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    let postContent = content;
    if (mode === "evening") {
      const gs = gratitudes.filter(g => g.trim());
      if (gs.length > 0) {
        const labels = ["ありがたかったこと", "感謝したい人", "自分を褒めたいこと"];
        postContent += `\n\n【感謝】\n${gs.map((g, i) => `${labels[i]}：${g}`).join("\n")}`;
      }
      if (bedtime) {
        postContent += `\n\n🛏️ 今夜の就寝予定：${bedtime}`;
        // Save bedtime to profile for next morning
        await supabase.from("profiles").update({ last_bedtime: bedtime }).eq("id", user.id);
      }
    }
    if (mode === "morning" && sleepHours) {
      postContent += `\n\n😴 昨夜の睡眠：${sleepHours}時間`;
      await supabase.from("profiles").update({ last_sleep_hours: parseFloat(sleepHours) }).eq("id", user.id);
    }

    const { data, error } = await supabase.from("posts").insert({
      user_id: user.id, type: mode, content: postContent, mood,
    }).select().single();

    if (!error && data) {
      const feedbacks = [
        `今日も記録してくれたね。${mood >= 3 ? "いい調子だ" : "大変だったね"}。でもここに書いてくれたことが、もう一歩前に進んだ証拠だよ。`,
        `あなたの正直な気持ち、ちゃんと受け取ったよ。明日もあなたのペースで。`,
        `連続で投稿してくれてるのが嬉しい。小さな積み重ねが、大きな変化になる。一緒に続けていこう。`,
      ];
      const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];
      await supabase.from("posts").update({ ai_feedback: feedback }).eq("id", data.id);

      // Increment streak
      const { data: prof } = await supabase.from("profiles").select("streak").eq("id", user.id).single();
      const newStreak = (prof?.streak || 0) + 1;
      await supabase.from("profiles").update({ streak: newStreak }).eq("id", user.id);

      setAiFeedback(feedback);
      setPosted(true);
    }
    setLoading(false);
  };

  if (posted) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/sho.png" alt="Sho" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
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
        <button onClick={() => { window.location.href = "https://rizup-app.vercel.app/home"; }}
          className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30">タイムラインを見る</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-5">
          <button onClick={() => setMode("morning")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${mode === "morning" ? "bg-orange-light text-orange" : "text-text-light"}`}>
            ☀️ 朝ジャーナル</button>
          <button onClick={() => setMode("evening")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${mode === "evening" ? "bg-mint-light text-mint" : "text-text-light"}`}>
            🌙 夜ジャーナル</button>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full" />
          <div>
            <p className="font-extrabold">{mode === "morning" ? "おはよう！☀️" : "おつかれさま！🌙"}</p>
            <p className="text-xs text-text-mid">{mode === "morning" ? "今日の目標と気分を教えてね" : "今日の振り返りを書いてみよう"}</p>
          </div>
        </div>

        {/* Mood */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          <p className="text-sm font-bold mb-3">今の気分は？</p>
          <div className="flex justify-between">
            {moodOptions.map((m) => (
              <button key={m.value} onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 transition ${mood === m.value ? "scale-110" : "opacity-50"}`}>
                <span className={`text-3xl p-2 rounded-full ${mood === m.value ? "bg-mint-light" : ""}`}>{m.emoji}</span>
                <span className="text-[10px] text-text-light">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sleep */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          {mode === "morning" ? (
            <><p className="text-sm font-bold mb-2">😴 昨夜の睡眠時間</p>
            <input type="number" min="0" max="24" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)}
              placeholder="例：7" className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" /></>
          ) : (
            <><p className="text-sm font-bold mb-2">🛏️ 今夜は何時に寝る？</p>
            <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint" /></>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
          <p className="text-sm font-bold mb-2">{mode === "morning" ? "今日の目標・一言" : "今日の振り返り"}</p>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "morning" ? "例：10分だけ読書する" : "例：今日は散歩したらちょっと楽になった"}
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-24 outline-none focus:border-mint" maxLength={500} />
          <p className="text-right text-xs text-text-light mt-1">{content.length}/500</p>
        </div>

        {/* Gratitude */}
        {mode === "evening" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3">
            <p className="text-sm font-bold mb-3">🙏 今日の感謝</p>
            {["今日ありがたかったこと", "誰かに感謝したいこと", "自分を褒めたいこと"].map((ph, i) => (
              <input key={i} type="text" value={gratitudes[i]} onChange={(e) => {
                const g = [...gratitudes]; g[i] = e.target.value; setGratitudes(g);
              }} placeholder={ph} className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            ))}
          </div>
        )}

        <button onClick={handlePost} disabled={loading || !content.trim()}
          className="w-full bg-mint text-white font-bold py-4 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30 text-base">
          {loading ? "投稿中..." : mode === "morning" ? "☀️ 朝ジャーナルを投稿" : "🌙 夜ジャーナルを投稿"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
