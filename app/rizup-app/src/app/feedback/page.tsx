"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { showToast } from "@/components/Toast";

type Category = "usability" | "feature" | "bug" | "other";

const categories: { value: Category; label: string; emoji: string; color: string }[] = [
  { value: "usability", label: "使いにくい",      emoji: "😕", color: "border-orange text-orange bg-orange-light" },
  { value: "feature",   label: "欲しい機能がある", emoji: "💡", color: "border-mint text-mint bg-mint-light" },
  { value: "bug",       label: "バグがある",      emoji: "🐛", color: "border-red-500 text-red-500 bg-red-50" },
  { value: "other",     label: "その他",          emoji: "💬", color: "border-[#06b6d4] text-[#06b6d4] bg-[#06b6d4]/10" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [loading, setLoading] = useState(false);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    (document.activeElement as HTMLElement)?.blur();
    if (!content.trim()) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { error: insertErr } = await supabase.from("feedbacks").insert({
        user_id: user.id,
        content: content.trim(),
        category,
      });
      if (insertErr) {
        console.error("[Feedback] insert error:", insertErr);
        setError(`送信に失敗しました：${insertErr.message}`);
        setLoading(false);
        return;
      }
      setPosted(true);
      showToast("success", "フィードバックありがとう！🌱");
    } catch (e) {
      console.error("[Feedback]", e);
      setError("通信エラー。時間をおいて再度お試しください。");
      setLoading(false);
    }
  };

  if (posted) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center pb-20">
        <Header />
        <Image src="/icons/icon-192.png" alt="Rizup" width={96} height={96} className="rounded-[22%] mb-4 shadow-md animate-sho-bounce" />
        <h1 className="text-2xl font-extrabold mb-2">ありがとう 🌱</h1>
        <p className="text-text-mid text-sm leading-relaxed max-w-xs mb-6">
          いただいた声を元にアプリを改善していきます。<br />
          引き続きよろしくお願いします。
        </p>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <button onClick={() => { setPosted(false); setContent(""); setCategory("other"); setLoading(false); }}
            className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] text-text-mid font-bold py-3 rounded-full text-sm">
            もう一つ送る
          </button>
          <button onClick={() => router.push("/home")}
            className="bg-mint text-white font-bold py-3 rounded-full shadow-md shadow-mint/30 text-sm">
            ホームに戻る
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <Header />
      <main className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-xl font-extrabold mb-1">📝 Rizup をもっと良くしたい</h1>
        <p className="text-xs text-text-mid mb-5 leading-relaxed">
          使ってみてどうでしたか？<br />
          どんな小さな声でも、受け取ります。
        </p>

        {/* カテゴリ選択 */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
          <p className="text-sm font-bold mb-3">カテゴリ</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(c => (
              <button key={c.value} onClick={() => setCategory(c.value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition text-xs font-bold ${
                  category === c.value ? c.color : "border-gray-200 dark:border-[#2a2a2a] text-text-light"
                }`}>
                <span className="text-2xl">{c.emoji}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* テキスト入力 */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] mb-3">
          <label className="text-sm font-bold block mb-2">
            使ってみてどうでしたか？改善してほしいことは？
          </label>
          <textarea
            value={content}
            onChange={e => { setContent(e.target.value.slice(0, 200)); setError(""); }}
            placeholder="例：ジャーナル書くと気分が安定してきた！でも通知がちょっと多くて…"
            className="w-full border-2 border-gray-100 dark:border-[#2a2a2a] rounded-xl px-4 py-3 text-sm resize-none h-32 outline-none focus:border-mint bg-white dark:bg-[#111]"
            maxLength={200}
            autoFocus
          />
          <div className="flex justify-between mt-1">
            <p className="text-[11px] text-text-light">本音でどうぞ（匿名にはなりませんが運営のみ閲覧可能）</p>
            <p className="text-[11px] text-text-light font-mono">{content.length}/200</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mb-3" role="alert">
            <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !content.trim()}
          className="w-full bg-mint text-white font-extrabold py-3.5 rounded-full shadow-lg shadow-mint/30 disabled:opacity-40 text-sm"
        >
          {loading ? "送信中..." : "送信する"}
        </button>

        <p className="text-[11px] text-text-light text-center mt-4 leading-relaxed">
          送っていただいた声は翔平さんが全て読みます。<br />
          ただし返信は個別にはできないことがあります。ご了承ください。
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
