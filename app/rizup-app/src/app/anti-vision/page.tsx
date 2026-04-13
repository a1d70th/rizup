"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

interface AntiVision {
  id: string;
  content: string;
  created_at: string;
}

const MAX = 5;

export default function AntiVisionPage() {
  const [items, setItems] = useState<AntiVision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("anti_visions")
        .select("*").eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setItems(data);
      setLoading(false);
    })();
  }, []);

  const handleAdd = async () => {
    if (!userId || !newContent.trim() || items.length >= MAX) return;
    (document.activeElement as HTMLElement)?.blur();
    setSaving(true);
    const { data } = await supabase.from("anti_visions")
      .insert({ user_id: userId, content: newContent.trim() })
      .select().single();
    if (data) setItems(prev => [...prev, data]);
    setNewContent("");
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("anti_visions").delete().eq("id", id);
    setItems(prev => prev.filter(x => x.id !== id));
  };

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Image src="/sho.png" alt="Sho" width={48} height={48} className="animate-sho-float rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <div className="mb-4">
          <h2 className="text-lg font-extrabold">🚫 アンチビジョン</h2>
          <p className="text-xs text-text-mid mt-1">5年後、絶対にこうなりたくない自分。ここに書くことで「今日の一歩」の意味が変わる。</p>
        </div>

        {/* 入力 */}
        {items.length < MAX && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="例：自分を信じられないまま、言い訳ばかりしている自分"
              maxLength={300}
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-20 outline-none focus:border-orange" />
            <div className="flex items-center justify-between mt-2">
              <p className="text-[10px] text-text-light">{newContent.length}/300 ・ あと{MAX - items.length}個追加可能</p>
              <button onClick={handleAdd} disabled={!newContent.trim() || saving}
                className="bg-orange text-white font-bold px-5 py-2 rounded-full text-xs shadow-md disabled:opacity-30">
                {saving ? "..." : "追加"}
              </button>
            </div>
          </div>
        )}

        {/* リスト */}
        {items.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだ書かれていません</p>
            <p className="text-xs text-text-light">避けたい未来を言葉にしてみよう</p>
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
                  <button onClick={() => handleDelete(x.id)} aria-label="削除"
                    className="text-text-light hover:text-red-400 text-xs p-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-6 bg-gradient-to-br from-mint-light to-orange-light rounded-2xl p-4 border border-mint/20 flex gap-3 items-start">
            <Image src="/sho.png" alt="Sho" width={32} height={32} className="rounded-full shrink-0 mt-0.5" />
            <p className="text-xs text-text leading-relaxed">
              ここに書いた未来から、あなたを遠ざけるのは毎日の小さな選択。<br />
              今日の <a href="/today" className="text-mint font-bold underline">ToDo</a> と <a href="/habits" className="text-mint font-bold underline">習慣</a> が、その一歩になるよ。
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
