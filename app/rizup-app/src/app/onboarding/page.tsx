"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const animalOptions = [
  { value: "rabbit", emoji: "🐰", name: "うさぎ", desc: "やさしくて、がんばり屋" },
  { value: "raccoon", emoji: "🦝", name: "たぬき", desc: "のんびりマイペース" },
  { value: "cat", emoji: "🐱", name: "ねこ", desc: "気まぐれだけど愛情深い" },
  { value: "squirrel", emoji: "🐿️", name: "りす", desc: "好奇心旺盛でアクティブ" },
  { value: "owl", emoji: "🦉", name: "ふくろう", desc: "物静かで思慮深い" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedAnimal, setSelectedAnimal] = useState<string>("");
  const [characterName, setCharacterName] = useState("");
  const [dream, setDream] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async (skipDream = false) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      // まず確実に profile 行が存在することを保証（RLS / 列不足環境でも通る）
      await fetch("/api/ensure-profile", { method: "POST" }).catch(() => {});

      const profileData = {
        id: user.id,
        email: user.email,
        name: name.trim() || "ゲスト",
        dream: skipDream ? "" : dream.trim(),
        avatar_url: "🌿",
        onboarding_completed: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        character_animal: selectedAnimal || null,
        character_name: characterName.trim() || null,
      };
      const up = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
      if (up.error) {
        // 新カラム (onboarding_completed / trial_* / character_* / avatar_url) 不足環境
        // → コアカラムのみで upsert する（マイグレ未実行でも最低限動く）
        console.warn("[Onboarding] full upsert failed, retrying minimal:", up.error.message);
        await supabase.from("profiles").upsert(
          { id: user.id, email: user.email, name: profileData.name },
          { onConflict: "id" }
        );
      }

      if (typeof window !== "undefined") {
        try {
          if (selectedAnimal) localStorage.setItem("rizup_character_animal", selectedAnimal);
          if (characterName.trim()) localStorage.setItem("rizup_character_name", characterName.trim());
        } catch {}
      }

      window.location.href = "/home";
    } catch (err) {
      console.error("[Onboarding]", err);
      window.location.href = "/home";
    }
  };

  const totalSteps = 3;
  const progress = Math.round((step / totalSteps) * 100);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-8">
      {/* プログレス */}
      <div className="max-w-xs w-full mx-auto mb-8">
        <div className="flex items-center justify-between text-[10px] text-text-light mb-2">
          <span>Step {step}/{totalSteps}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div className="bg-mint rounded-full h-1.5 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <Image src="/icons/icon-192.png" alt="Rizup" width={64} height={64} className="rounded-full mb-4 animate-sho-float" />

        {/* Step 1: どの動物があなたの相棒？ */}
        {step === 1 && (
          <div className="w-full max-w-xs animate-fade-in">
            <h1 className="text-2xl font-extrabold text-center mb-1">あなたの相棒を選ぼう</h1>
            <p className="text-text-mid text-sm text-center mb-6">毎日一緒に過ごす動物だよ</p>

            <div className="flex flex-col gap-2 mb-4">
              {animalOptions.map(a => (
                <button key={a.value} onClick={() => setSelectedAnimal(a.value)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                    selectedAnimal === a.value
                      ? "border-mint bg-mint-light scale-[1.02] shadow-md"
                      : "border-gray-200 bg-white dark:bg-[#1a1a1a]"
                  }`}>
                  <span className="text-3xl">{a.emoji}</span>
                  <div>
                    <p className="font-bold text-sm">{a.name}</p>
                    <p className="text-[11px] text-text-mid">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-text-mid block mb-2">ニックネーム</label>
            <input type="text" placeholder="あなたの呼び名"
              value={name} onChange={(e) => setName(e.target.value)} aria-label="ニックネーム"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4" />

            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <label className="flex items-start gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={agreedTerms}
                  onChange={(e) => { (document.activeElement as HTMLElement)?.blur(); setAgreedTerms(e.target.checked); }}
                  className="mt-0.5 accent-mint w-4 h-4" aria-label="利用規約に同意" />
                <span className="text-xs text-text-mid leading-relaxed">
                  <a href="/legal/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="text-mint font-bold">利用規約</a> と
                  <a href="/legal/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-mint font-bold"> プライバシーポリシー</a> に同意します
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={agreedAge}
                  onChange={(e) => { (document.activeElement as HTMLElement)?.blur(); setAgreedAge(e.target.checked); }}
                  className="mt-0.5 accent-mint w-4 h-4" aria-label="13歳以上である" />
                <span className="text-xs text-text-mid">13歳以上です</span>
              </label>
            </div>

            <button onClick={() => setStep(2)}
              disabled={!name.trim() || !agreedTerms || !agreedAge || !selectedAnimal}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">
              次へ
            </button>
          </div>
        )}

        {/* Step 2: 名前をつけてあげよう */}
        {step === 2 && (
          <div className="w-full max-w-xs animate-fade-in">
            <div className="text-5xl text-center mb-3">
              {animalOptions.find(a => a.value === selectedAnimal)?.emoji}
            </div>
            <h1 className="text-2xl font-extrabold text-center mb-1">名前をつけてあげよう</h1>
            <p className="text-text-mid text-sm text-center mb-6">
              {animalOptions.find(a => a.value === selectedAnimal)?.name}の相棒に名前をつけてね
            </p>
            <input type="text" placeholder="例：もこ、ぽんた、ミント"
              value={characterName} onChange={(e) => setCharacterName(e.target.value)}
              aria-label="相棒の名前"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4 text-center text-lg font-bold" />
            <button onClick={() => setStep(3)}
              disabled={!characterName.trim()}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 mb-2 disabled:opacity-30">
              次へ
            </button>
            <button onClick={() => setStep(1)} className="w-full text-text-light text-xs mt-2">戻る</button>
          </div>
        )}

        {/* Step 3: 最初の一言を書く？ */}
        {step === 3 && (
          <div className="w-full max-w-xs animate-fade-in text-center">
            <div className="text-5xl mb-3">
              {animalOptions.find(a => a.value === selectedAnimal)?.emoji}
            </div>
            <h1 className="text-2xl font-extrabold mb-1">{characterName}が待ってるよ</h1>
            <p className="text-text-mid text-sm mb-6">最初の一言、書いてみる？</p>
            <textarea placeholder="例：今日からよろしくね"
              value={dream} onChange={(e) => setDream(e.target.value)} aria-label="最初の一言"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition h-24 resize-none mb-4" />
            <button onClick={() => handleComplete(false)} disabled={loading}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 mb-2 disabled:opacity-50">
              {loading ? "準備中..." : "Rizup を始める 🌿"}
            </button>
            <button onClick={() => handleComplete(true)} disabled={loading}
              className="w-full text-text-light text-sm py-2">
              スキップして始める
            </button>
            <button onClick={() => setStep(2)} className="w-full text-text-light text-xs mt-2">戻る</button>
          </div>
        )}
      </div>
    </div>
  );
}
