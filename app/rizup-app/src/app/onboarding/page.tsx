"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";

const avatarOptions = ["🌿", "🌸", "🌙", "☀️", "🌈", "🦋", "🍀", "🌊"];

// v3.2: 3ステップにシンプル化（名前/規約 → 夢 → 完了）
// MBTI/星座/タイプ診断はプロフィール編集画面で後から追加可能
export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🌿");
  const [dream, setDream] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleComplete = async (skipDream = false) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const profileData = {
        id: user.id,
        email: user.email,
        name: name.trim() || "ゲスト",
        dream: skipDream ? "" : dream.trim(),
        avatar_url: avatar,
        onboarding_completed: true,
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await supabase.from("profiles").upsert(profileData, { onConflict: "id" });
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

        {/* Step 1: 名前・アバター・規約 */}
        {step === 1 && (
          <div className="w-full max-w-xs animate-fade-in">
            <h1 className="text-2xl font-extrabold text-center mb-1">ようこそ、Rizup へ</h1>
            <p className="text-text-mid text-sm text-center mb-6">まずは名前だけ。3ステップで始められるよ。</p>

            <label className="text-xs font-bold text-text-mid block mb-2">ニックネーム</label>
            <input type="text" placeholder="あなたの呼び名"
              value={name} onChange={(e) => setName(e.target.value)} aria-label="ニックネーム"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4" />

            <label className="text-xs font-bold text-text-mid block mb-2">アイコン</label>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {avatarOptions.map((emoji) => (
                <button key={emoji} onClick={() => setAvatar(emoji)} aria-label={`アイコン ${emoji} を選択`}
                  className={`w-11 h-11 rounded-full text-xl flex items-center justify-center transition border-2 ${
                    avatar === emoji ? "border-mint bg-mint-light scale-110" : "border-gray-200 bg-gray-50"}`}>
                  {emoji}
                </button>
              ))}
            </div>

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

            <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); if (name.trim()) setStep(2); }}
              disabled={!name.trim() || !agreedTerms || !agreedAge}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">
              次へ
            </button>
          </div>
        )}

        {/* Step 2: 夢（スキップ可） */}
        {step === 2 && (
          <div className="w-full max-w-xs animate-fade-in">
            <h1 className="text-2xl font-extrabold text-center mb-1">{name}さんの夢は？</h1>
            <p className="text-text-mid text-sm text-center mb-6">大きくても小さくても大丈夫。後で変えられるよ。</p>
            <textarea placeholder="例：フリーランスで独立したい / 毎朝6時に起きる"
              value={dream} onChange={(e) => setDream(e.target.value)} aria-label="あなたの夢"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition h-28 resize-none mb-4" />
            <button onClick={() => { (document.activeElement as HTMLElement)?.blur(); setStep(3); }}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 mb-2">
              次へ
            </button>
            <button onClick={() => { setDream(""); setStep(3); }}
              className="w-full text-text-light text-sm py-2">
              今はスキップする
            </button>
            <button onClick={() => setStep(1)} className="w-full text-text-light text-xs mt-2">戻る</button>
          </div>
        )}

        {/* Step 3: 完了 */}
        {step === 3 && (
          <div className="w-full max-w-xs animate-fade-in text-center">
            <div className="text-5xl mb-3">🌿</div>
            <h1 className="text-2xl font-extrabold mb-1">準備完了！</h1>
            <p className="text-text-mid text-sm leading-relaxed mb-5">
              {name}さん、ようこそ。<br />
              今日から毎日1%、前に進もう。
            </p>
            <div className="bg-mint-light rounded-2xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Image src="/icons/icon-192.png" alt="Rizup" width={24} height={24} className="rounded-full" />
                <span className="text-xs font-bold text-mint">Rizup より</span>
              </div>
              <p className="text-xs text-text leading-relaxed">
                まずはホームで「今日やること3つ」を決めよう。<br />
                MBTI・星座・タイプ診断はあとでプロフィールから追加できるよ。
              </p>
            </div>
            <div className="bg-orange-light rounded-2xl p-3 mb-4">
              <p className="text-xs font-bold text-orange">🎉 7日間無料トライアル</p>
              <p className="text-[10px] text-text-mid mt-1">8日目から自動でProプラン（¥780/月）へ</p>
            </div>
            <button onClick={() => handleComplete(false)} disabled={loading}
              className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-50">
              {loading ? "準備中..." : "Rizup を始める 🌿"}
            </button>
            <button onClick={() => setStep(2)} className="w-full text-text-light text-xs mt-2">戻る</button>
          </div>
        )}
      </div>
    </div>
  );
}
