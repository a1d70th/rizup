"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useRouter } from "next/navigation";

const avatarOptions = ["🌿", "🌸", "🌙", "☀️", "🌈", "🦋", "🍀", "🌊"];

export default function OnboardingPage() {
  const [name, setName] = useState("");
  const [dream, setDream] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("🌿");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("profiles").update({
      name,
      dream,
      avatar_url: selectedAvatar,
    }).eq("id", user.id);

    router.push("/home");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mb-4" />

      {step === 1 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">ようこそ、Rizup へ！</h1>
          <p className="text-text-mid text-sm text-center mb-6">まずは名前を教えてね</p>
          <input
            type="text"
            placeholder="ニックネーム"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition mb-4"
          />
          <p className="text-text-mid text-sm text-center mb-4">アイコンを選ぼう</p>
          <div className="flex justify-center gap-2 mb-6">
            {avatarOptions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedAvatar(emoji)}
                className={`w-12 h-12 rounded-full text-xl flex items-center justify-center transition border-2 ${
                  selectedAvatar === emoji ? "border-mint bg-mint-light scale-110" : "border-gray-200 bg-gray-50"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            onClick={() => name.trim() && setStep(2)}
            disabled={!name.trim()}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-30"
          >
            次へ
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-xs animate-fade-in">
          <h1 className="text-xl font-extrabold text-center mb-1">{name}さんの夢は？</h1>
          <p className="text-text-mid text-sm text-center mb-6">大きくても小さくても大丈夫</p>
          <textarea
            placeholder="例：フリーランスとして独立したい"
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition h-24 resize-none mb-4"
          />
          <button
            onClick={handleComplete}
            disabled={loading}
            className="w-full bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-50"
          >
            {loading ? "設定中..." : "Rizup を始める 🌿"}
          </button>
          <button onClick={() => setStep(1)} className="w-full text-text-light text-sm mt-3">
            戻る
          </button>
        </div>
      )}
    </div>
  );
}
