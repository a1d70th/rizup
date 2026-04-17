"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MyCharacter, { AnimalKind } from "@/components/MyCharacter";
import Header from "@/components/Header";

const animals: { kind: AnimalKind; label: string; desc: string }[] = [
  { kind: "rabbit",   label: "うさぎ",   desc: "やさしくて、ふわっと跳ねる" },
  { kind: "raccoon",  label: "たぬき",   desc: "好奇心いっぱい、夜が得意" },
  { kind: "cat",      label: "ねこ",     desc: "マイペース、静かなあなたに" },
  { kind: "squirrel", label: "りす",     desc: "コツコツ貯める、小さな幸せ" },
  { kind: "owl",      label: "ふくろう", desc: "落ち着きと、知恵の相棒" },
];


export default function CharacterSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [animal, setAnimal] = useState<AnimalKind | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // URL ?edit=1 で来た場合は再編集モード（既存値を復元、自動遷移しない）
    const isEdit = typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("edit") === "1";
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: prof } = await supabase.from("profiles")
          .select("character_animal, character_name").eq("id", user.id).maybeSingle();
        if (isEdit) {
          if (prof?.character_animal) setAnimal(prof.character_animal as AnimalKind);
          if (prof?.character_name) setName(prof.character_name);
          return;
        }
        if (prof?.character_animal && prof?.character_name) {
          router.replace("/home");
        }
      }
    })();
  }, [router]);

  const save = async () => {
    if (!userId || !animal || !name.trim()) return;
    setSaving(true);
    try {
      localStorage.setItem("rizup_character_animal", animal);
      localStorage.setItem("rizup_character_name", name.trim());
      const { error } = await supabase.from("profiles")
        .update({ character_animal: animal, character_name: name.trim() })
        .eq("id", userId);
      if (error && !/column|does not exist|schema cache/i.test(error.message)) {
        console.warn("[character-setup]", error.message);
      }
    } catch (e) { console.warn("[character-setup]", e); }
    setSaving(false);
    router.push("/home");
  };

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#111111] pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-5">
        {step === 1 && (
          <>
            <h1 className="text-xl font-extrabold mb-1 dark:text-gray-100">どの動物があなたに合いそう？</h1>
            <p className="text-xs text-text-mid mb-5">一緒に村で過ごす相棒だよ。直感で選んでOK</p>
            <div className="grid grid-cols-2 gap-3">
              {animals.map(a => (
                <button
                  key={a.kind}
                  onClick={() => setAnimal(a.kind)}
                  className={`bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border-2 flex flex-col items-center text-center transition active:scale-95 ${
                    animal === a.kind
                      ? "border-mint bg-[#ecfdf5] dark:bg-[#0d2818] shadow-lg shadow-mint/20 scale-[1.02]"
                      : "border-gray-100 dark:border-[#2a2a2a]"
                  }`}
                >
                  <div className="h-[96px] w-full flex items-start justify-center pointer-events-none overflow-hidden">
                    <div style={{ marginTop: 0 }}>
                      <MyCharacter streak={10} animal={a.kind} size={88} />
                    </div>
                  </div>
                  <p className="text-sm font-extrabold dark:text-gray-100 mt-1">{a.label}</p>
                  <p className="text-[10px] text-text-light mt-0.5">{a.desc}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!animal}
              className="mt-6 w-full bg-mint text-white font-extrabold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30"
            >
              次へ →
            </button>
          </>
        )}
        {step === 2 && animal && (
          <>
            <h1 className="text-xl font-extrabold mb-1 dark:text-gray-100">
              {animals.find(a => a.kind === animal)?.label}に名前をつけてあげよう
            </h1>
            <p className="text-xs text-text-mid mb-5">呼ぶたびに、ちょっとだけ頑張れる名前を</p>
            <div className="flex justify-center my-4">
              <MyCharacter streak={1} name={name || "あいぼう"} animal={animal} size={140} />
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              placeholder="例：もも、くも、はな"
              className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-4 py-3 text-base font-bold bg-white dark:bg-[#1a1a1a] outline-none focus:border-mint mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-100 dark:bg-[#2a2a2a] text-text-mid font-bold py-3.5 rounded-full"
              >
                戻る
              </button>
              <button
                onClick={save}
                disabled={!name.trim() || saving}
                className="flex-[2] bg-mint text-white font-extrabold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30"
              >
                {saving ? "保存中..." : "はじめる"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
