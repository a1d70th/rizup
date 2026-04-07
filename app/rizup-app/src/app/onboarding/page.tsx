"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { rizupTypes, typeQuestions, zodiacSigns, calculateType } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";
import Image from "next/image";

const avatarOptions = ["🌿", "🌸", "🌙", "☀️", "🌈", "🦋", "🍀", "🌊"];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dream, setDream] = useState("");
  const [avatar, setAvatar] = useState("🌿");
  const [zodiac, setZodiac] = useState("");
  const [birthday, setBirthday] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [resultType, setResultType] = useState<RizupType | null>(null);
  const [loading, setLoading] = useState(false);

  const handleQuizAnswer = (type: string) => {
    const newAnswers = [...quizAnswers, type];
    setQuizAnswers(newAnswers);
    if (quizIndex < typeQuestions.length - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      const result = calculateType(newAnswers);
      setResultType(result);
      setStep(5);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    await supabase.from("profiles").update({
      name, dream, avatar_url: avatar, zodiac, birthday, rizup_type: resultType,
    }).eq("id", user.id);
    window.location.href = "https://rizup-app.vercel.app/home";
  };

  const handleShare = () => {
    if (!resultType) return;
    const t = rizupTypes[resultType];
    const text = encodeURIComponent(`私は${t.emoji}${t.label}タイプ！\n${t.desc}\n\n#Rizup #Rizupタイプ診断`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <Image src="/sho.png" alt="Sho" width={56} height={56} className="rounded-full mb-4" />

      {/* Step 1: Name & Avatar */}
      {step === 1 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">ようこそ、Rizup へ！</h1>
          <p className="text-text-mid text-sm text-center mb-6">まずは名前を教えてね</p>
          <input type="text" placeholder="ニックネーム" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4" />
          <p className="text-text-mid text-sm text-center mb-3">アイコンを選ぼう</p>
          <div className="flex justify-center gap-2 mb-6">
            {avatarOptions.map((emoji) => (
              <button key={emoji} onClick={() => setAvatar(emoji)}
                className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition border-2 ${
                  avatar === emoji ? "border-mint bg-mint-light scale-110" : "border-gray-200 bg-gray-50"}`}>
                {emoji}
              </button>
            ))}
          </div>
          <button onClick={() => name.trim() && setStep(2)} disabled={!name.trim()}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">次へ</button>
        </div>
      )}

      {/* Step 2: Dream */}
      {step === 2 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">{name}さんの夢は？</h1>
          <p className="text-text-mid text-sm text-center mb-6">大きくても小さくても大丈夫</p>
          <textarea placeholder="例：フリーランスとして独立したい" value={dream} onChange={(e) => setDream(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition h-24 resize-none mb-4" />
          <button onClick={() => setStep(3)} className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30">次へ</button>
          <button onClick={() => setStep(1)} className="w-full text-text-light text-sm mt-3">戻る</button>
        </div>
      )}

      {/* Step 3: Zodiac & Birthday */}
      {step === 3 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">あなたのこと、もう少し</h1>
          <p className="text-text-mid text-sm text-center mb-6">Sho Insight のパーソナライズに使います</p>
          <label className="text-sm font-bold block mb-2">生年月日</label>
          <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4" />
          <label className="text-sm font-bold block mb-2">星座</label>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {zodiacSigns.map((z) => (
              <button key={z} onClick={() => setZodiac(z)}
                className={`py-2 rounded-xl text-xs font-bold transition border ${
                  zodiac === z ? "border-mint bg-mint-light text-mint" : "border-gray-200 text-text-mid"}`}>
                {z}
              </button>
            ))}
          </div>
          <button onClick={() => setStep(4)} disabled={!zodiac || !birthday}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">タイプ診断へ</button>
          <button onClick={() => setStep(2)} className="w-full text-text-light text-sm mt-3">戻る</button>
        </div>
      )}

      {/* Step 4: Type Quiz */}
      {step === 4 && (
        <div className="w-full max-w-xs animate-fade-in">
          <div className="flex justify-center gap-1 mb-4">
            {typeQuestions.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= quizIndex ? "bg-mint" : "bg-gray-200"}`} />
            ))}
          </div>
          <h2 className="text-lg font-extrabold text-center mb-1">Q{quizIndex + 1}. {typeQuestions[quizIndex].q}</h2>
          <p className="text-text-light text-xs text-center mb-5">直感で選んでね</p>
          <div className="flex flex-col gap-2">
            {typeQuestions[quizIndex].a.map((a, i) => (
              <button key={i} onClick={() => handleQuizAnswer(a.type)}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm text-left font-medium hover:border-mint hover:bg-mint-light transition">
                {a.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Result */}
      {step === 5 && resultType && (
        <div className="w-full max-w-xs animate-fade-in text-center">
          <div className="text-5xl mb-3">{rizupTypes[resultType].emoji}</div>
          <h1 className="text-2xl font-extrabold mb-1">あなたは{rizupTypes[resultType].label}タイプ！</h1>
          <p className="text-text-mid text-sm leading-relaxed mb-6">{rizupTypes[resultType].desc}</p>
          <div className="bg-mint-light rounded-2xl p-4 mb-6 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/sho.png" alt="Sho" width={24} height={24} className="rounded-full" />
              <span className="text-xs font-bold text-mint">Sho より</span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              {name}さん、{rizupTypes[resultType].label}タイプだね！
              これからあなたのタイプに合わせたインサイトを毎日届けるよ。一緒に前に進もう。
            </p>
          </div>
          <button onClick={handleShare}
            className="w-full border-2 border-gray-200 rounded-full py-3 text-sm font-bold text-text-mid hover:border-mint transition mb-3">
            𝕏 で結果をシェアする
          </button>
          <button onClick={handleComplete} disabled={loading}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-50">
            {loading ? "設定中..." : "Rizup を始める 🌿"}
          </button>
        </div>
      )}
    </div>
  );
}
