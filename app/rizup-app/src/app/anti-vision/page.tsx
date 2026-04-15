"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import Link from "next/link";
import { showToast } from "@/components/Toast";

interface AntiVision {
  id: string;
  content: string;
  created_at: string;
}

interface VisionLight { id: string; title: string; category: string; time_horizon: string; }

export default function AntiVisionPage() {
  const [items, setItems] = useState<AntiVision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [visions, setVisions] = useState<VisionLight[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const [{ data: avData }, { data: vData }] = await Promise.all([
        supabase.from("anti_visions").select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("visions").select("id, title, category, time_horizon").eq("user_id", user.id),
      ]);
      if (avData) setItems(avData);
      if (vData) setVisions(vData);
      setLoading(false);
    })();
  }, []);

  const handleGenerate = async () => {
    if (!userId || visions.length === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/anti-vision/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visions }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) {
        showToast("error", "生成に失敗しました");
        setGenerating(false);
        return;
      }
      // 既存を全削除して生成結果で置き換え
      await supabase.from("anti_visions").delete().eq("user_id", userId);
      const rows = data.items.slice(0, 5).map((content: string) => ({ user_id: userId, content }));
      const { data: inserted } = await supabase.from("anti_visions").insert(rows).select();
      if (inserted) setItems(inserted);
      showToast("success", "アンチビジョンを生成したよ🌿");
    } catch {
      showToast("error", "通信エラー");
    }
    setGenerating(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/icons/icon-192.png" alt="Rizup" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold">🚫 アンチビジョン</h2>
          <p className="text-xs text-text-mid mt-1">5年後、絶対にこうなりたくない自分。ビジョンから自動で生成されるよ。</p>
        </div>

        {visions.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
            <Image src="/icons/icon-192.png" alt="Rizup" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-60" />
            <p className="text-sm font-bold mb-2">先にビジョンを設定してください</p>
            <p className="text-xs text-text-light mb-4">ビジョンの裏返しがアンチビジョンになります。</p>
            <Link href="/vision" className="inline-block bg-mint text-white font-bold px-6 py-2.5 rounded-full shadow-md">
              🎯 ビジョンを設定する
            </Link>
          </div>
        ) : (
          <>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-orange text-white font-bold py-3 rounded-full shadow-md shadow-orange/30 disabled:opacity-50 mb-4"
            >
              {generating ? "生成中…" : items.length > 0 ? "🔄 再生成する" : "✨ AIで自動生成する"}
            </button>

            {items.length === 0 ? (
              <div className="text-center py-12">
                <Image src="/icons/icon-192.png" alt="Rizup" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
                <p className="text-sm font-bold text-text-mid mb-1">まだ生成されていません</p>
                <p className="text-xs text-text-light">上のボタンからAIで自動生成してみよう</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((x, i) => (
                  <div key={x.id} className="bg-white rounded-2xl p-4 border border-orange/20 shadow-sm animate-fade-in">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-light text-orange font-extrabold flex items-center justify-center text-sm shrink-0">
                        {i + 1}
                      </div>
                      <p className="text-sm text-text leading-relaxed flex-1 whitespace-pre-wrap break-words">{x.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {items.length > 0 && (
              <div className="mt-6 bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 border border-mint/20 flex gap-3 items-start">
                <Image src="/icons/icon-192.png" alt="Rizup" width={32} height={32} className="rounded-full shrink-0 mt-0.5" />
                <p className="text-xs text-text leading-relaxed">
                  ここに書いた未来から、あなたを遠ざけるのは毎日の小さな選択。<br />
                  <Link href="/habits" className="text-mint font-bold underline">習慣</Link>を積み重ねて、その一歩を踏み出そう。
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
