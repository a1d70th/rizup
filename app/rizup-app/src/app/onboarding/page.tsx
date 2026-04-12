"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { rizupTypes, typeQuestions, zodiacSigns, calculateType } from "@/lib/rizup-types";
import type { RizupType } from "@/lib/rizup-types";
import Image from "next/image";

const avatarOptions = ["🌿", "🌸", "🌙", "☀️", "🌈", "🦋", "🍀", "🌊"];
const mbtiTypes = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dream, setDream] = useState("");
  const [avatar, setAvatar] = useState("🌿");
  const [zodiac, setZodiac] = useState("");
  const [birthday, setBirthday] = useState("");
  const [mbti, setMbti] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [resultType, setResultType] = useState<RizupType | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [personalDesc, setPersonalDesc] = useState<string | null>(null);

  const handleQuizAnswer = (type: string) => {
    const newAnswers = [...quizAnswers, type];
    setQuizAnswers(newAnswers);
    if (quizIndex < typeQuestions.length - 1) {
      setQuizIndex(quizIndex + 1);
    } else {
      const result = calculateType(newAnswers);
      setResultType(result);
      setStep(6);
      // Generate personalized description
      fetch("/api/sho-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zodiac, birthday, rizupType: result,
          mbti: mbti && mbti !== "unknown" ? mbti : null, name,
          generateTypeDesc: true,
        }),
      }).then(r => r.json()).then(d => {
        if (d.typeDesc) setPersonalDesc(d.typeDesc);
      }).catch(() => {});
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const profileData = {
        id: user.id,
        email: user.email,
        name: name.trim() || "ゲスト",
        dream: dream.trim() || "",
        avatar_url: avatar,
        zodiac: zodiac || "",
        birthday: birthday || "",
        mbti: mbti || "",
        rizup_type: resultType || "Grow",
        onboarding_completed: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Use upsert for reliability (handles both new and existing rows)
      const { error: upsertErr } = await supabase.from("profiles")
        .upsert(profileData, { onConflict: "id" });

      if (upsertErr) {
        console.warn("[Onboarding] Upsert failed:", upsertErr.message);
      }

      // Always navigate to /home regardless of save result
      window.location.href = "/home";
    } catch (err) {
      console.error("[Onboarding] Unexpected error:", err);
      // Always navigate to /home
      window.location.href = "/home";
    }
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
          <div className="flex justify-center gap-2 mb-4">
            {avatarOptions.map((emoji) => (
              <button key={emoji} onClick={() => setAvatar(emoji)}
                className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition border-2 ${
                  avatar === emoji ? "border-mint bg-mint-light scale-110" : "border-gray-200 bg-gray-50"}`}>
                {emoji}
              </button>
            ))}
          </div>
          {/* Terms & Age confirmation */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <label className="flex items-start gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={agreedTerms} onChange={(e) => { (document.activeElement as HTMLElement)?.blur(); setAgreedTerms(e.target.checked); }}
                className="mt-0.5 accent-mint w-4 h-4" />
              <span className="text-xs text-text-mid leading-relaxed">
                <a href="/legal/terms-of-service.html" target="_blank" className="text-mint font-bold">利用規約</a> と
                <a href="/legal/privacy-policy.html" target="_blank" className="text-mint font-bold"> プライバシーポリシー</a> に同意します
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreedAge} onChange={(e) => { (document.activeElement as HTMLElement)?.blur(); setAgreedAge(e.target.checked); }}
                className="mt-0.5 accent-mint w-4 h-4" />
              <span className="text-xs text-text-mid">13歳以上です</span>
            </label>
          </div>
          <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); if (name.trim()) setStep(2); }} disabled={!name.trim() || !agreedTerms || !agreedAge}
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
          <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); setStep(3); }} className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30">次へ</button>
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
          <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); setStep(4); }} disabled={!zodiac || !birthday}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">次へ</button>
          <button onClick={() => setStep(2)} className="w-full text-text-light text-sm mt-3">戻る</button>
        </div>
      )}

      {/* Step 4: MBTI */}
      {step === 4 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">MBTI タイプは？</h1>
          <p className="text-text-mid text-sm text-center mb-6">Sho Insight のパーソナライズに使います</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {mbtiTypes.map((t) => (
              <button key={t} onClick={() => setMbti(t)}
                className={`py-2.5 rounded-xl text-xs font-bold transition border ${
                  mbti === t ? "border-mint bg-mint-light text-mint" : "border-gray-200 text-text-mid"}`}>
                {t}
              </button>
            ))}
          </div>
          <button onClick={() => setMbti("unknown")}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition border mb-4 ${
              mbti === "unknown" ? "border-mint bg-mint-light text-mint" : "border-gray-200 text-text-mid"}`}>
            わからない
          </button>
          <button onClick={() => setStep(5)} disabled={!mbti}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">タイプ診断へ</button>
          <button onClick={() => setStep(3)} className="w-full text-text-light text-sm mt-3">戻る</button>
        </div>
      )}

      {/* Step 5: Type Quiz */}
      {step === 5 && (
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

      {/* Step 6: Result */}
      {step === 6 && resultType && (
        <div className="w-full max-w-xs animate-fade-in text-center">
          <div className="text-5xl mb-3">{rizupTypes[resultType].emoji}</div>
          <h1 className="text-2xl font-extrabold mb-1">あなたは{rizupTypes[resultType].label}タイプ！</h1>
          <p className="text-text-mid text-sm leading-relaxed mb-4">{rizupTypes[resultType].desc}</p>
          {personalDesc && (
            <div className="bg-white border border-mint/20 rounded-2xl p-4 mb-4 text-left">
              <p className="text-xs font-bold text-mint mb-1">✨ {zodiac}×{rizupTypes[resultType].label}タイプ{mbti && mbti !== "unknown" ? `×${mbti}` : ""}のあなたは...</p>
              <p className="text-xs text-text leading-relaxed">{personalDesc}</p>
            </div>
          )}
          <div className="bg-mint-light rounded-2xl p-4 mb-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Image src="/sho.png" alt="Sho" width={24} height={24} className="rounded-full" />
              <span className="text-xs font-bold text-mint">Sho より</span>
            </div>
            <p className="text-xs text-text leading-relaxed">
              {name}さん、{rizupTypes[resultType].label}タイプだね！
              これからあなたに合わせたインサイトを毎日届けるよ。一緒に前に進もう。
            </p>
          </div>
          <div className="bg-mint-light rounded-2xl p-3 mb-4">
            <p className="text-xs font-bold text-mint text-center">🎉 7日間無料トライアル（全機能使い放題）</p>
            <p className="text-[10px] text-text-mid text-center mt-1">8日目から自動的にProプラン（¥780/月）へ</p>
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
