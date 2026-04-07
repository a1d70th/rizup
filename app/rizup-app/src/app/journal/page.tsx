"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  const [loading, setLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const hour = new Date().getHours();
    setMode(hour < 15 ? "morning" : "evening");
  }, []);

  const handlePost = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const postContent = mode === "evening" && gratitudes.filter(g => g.trim()).length > 0
      ? `${content}\n\n【感謝】\n${gratitudes.filter(g => g.trim()).map((g, i) => `${i + 1}. ${g}`).join("\n")}`
      : content;

    const { data, error } = await supabase.from("posts").insert({
      user_id: user.id,
      type: mode,
      content: postContent,
      mood,
    }).select().single();

    if (!error && data) {
      // Simulate AI feedback (in production, call Claude API)
      const feedbacks = [
        `${content.slice(0, 20)}...って書いてくれたね。今日も一歩踏み出せたこと、すごいと思うよ。明日もあなたのペースでいこう。`,
        `気分が${mood >= 3 ? "良さそう" : "大変そう"}だね。でもここに書いてくれたこと自体が前進だよ。自分を褒めてあげて。`,
        `今日の記録、ちゃんと残せたね。小さなことでも続けることが一番大事。Sho はいつも応援してるよ。`,
      ];
      const feedback = feedbacks[Math.floor(Math.random() * feedbacks.length)];

      await supabase.from("posts").update({ ai_feedback: feedback }).eq("id", data.id);

      // Update streak
      try {
        await supabase.rpc("increment_streak", { uid: user.id });
      } catch {
        await supabase.from("profiles").update({ streak: 1 }).eq("id", user.id);
      }

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
              <span className="text-xs font-bold text-mint">Sho より</span>
            </div>
            <p className="text-sm text-text leading-relaxed">{aiFeedback}</p>
          </div>
        )}
        <button
          onClick={() => router.push("/home")}
          className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30"
        >
          タイムラインを見る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Mode Toggle */}
        <div className="flex bg-white rounded-2xl p-1 border border-gray-100 mb-6">
          <button
            onClick={() => setMode("morning")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              mode === "morning" ? "bg-orange-light text-orange" : "text-text-light"
            }`}
          >
            ☀️ 朝ジャーナル
          </button>
          <button
            onClick={() => setMode("evening")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition ${
              mode === "evening" ? "bg-mint-light text-mint" : "text-text-light"
            }`}
          >
            🌙 夜ジャーナル
          </button>
        </div>

        {/* Sho Greeting */}
        <div className="flex items-center gap-3 mb-6">
          <Image src="/sho.png" alt="Sho" width={40} height={40} className="rounded-full" />
          <div>
            <p className="font-extrabold">
              {mode === "morning" ? "おはよう！☀️" : "おつかれさま！🌙"}
            </p>
            <p className="text-xs text-text-mid">
              {mode === "morning" ? "今日の気分と目標を教えてね" : "今日の振り返りを書いてみよう"}
            </p>
          </div>
        </div>

        {/* Mood Selection */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
          <p className="text-sm font-bold mb-3">今の気分は？</p>
          <div className="flex justify-between">
            {moodOptions.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className={`flex flex-col items-center gap-1 transition ${
                  mood === m.value ? "scale-110" : "opacity-50"
                }`}
              >
                <span className={`text-3xl p-2 rounded-full ${
                  mood === m.value ? "bg-mint-light" : ""
                }`}>{m.emoji}</span>
                <span className="text-[10px] text-text-light">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Input */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
          <p className="text-sm font-bold mb-2">
            {mode === "morning" ? "今日やりたいこと・一言" : "今日の振り返り"}
          </p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={mode === "morning"
              ? "例：10分だけ読書する。昨日よりちょっとだけ頑張れたらいいな。"
              : "例：今日は朝から気分が重かったけど、散歩したらちょっと楽になった。"
            }
            className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-28 outline-none focus:border-mint transition"
            maxLength={500}
          />
          <p className="text-right text-xs text-text-light mt-1">{content.length}/500</p>
        </div>

        {/* Gratitude (Evening only) */}
        {mode === "evening" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4">
            <p className="text-sm font-bold mb-3">今日の感謝 3つ</p>
            {gratitudes.map((g, i) => (
              <input
                key={i}
                type="text"
                value={g}
                onChange={(e) => {
                  const newG = [...gratitudes];
                  newG[i] = e.target.value;
                  setGratitudes(newG);
                }}
                placeholder={`感謝 ${i + 1}`}
                className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint transition mb-2"
              />
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handlePost}
          disabled={loading || !content.trim()}
          className="w-full bg-mint text-white font-bold py-4 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-30 text-base"
        >
          {loading ? "投稿中..." : mode === "morning" ? "☀️ 朝ジャーナルを投稿" : "🌙 夜ジャーナルを投稿"}
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
