"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";
import { compressImage } from "@/lib/image-compress";

interface VisionItem {
  id: string;
  title: string | null;
  image_url: string | null;
  affirmation: string | null;
  created_at: string;
}

export default function VisionPage() {
  const [items, setItems] = useState<VisionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [affirmation, setAffirmation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase.from("visions")
        .select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) setItems(data);
      setLoading(false);
    };
    init();
  }, []);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImageFile(compressed);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(compressed);
  };

  const handleAdd = async () => {
    if (!userId || (!title.trim() && !affirmation.trim() && !imageFile)) return;
    (document.activeElement as HTMLElement)?.blur();
    setSaving(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${userId}/vision_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, imageFile, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    const { data, error } = await supabase.from("visions").insert({
      user_id: userId, title: title.trim() || null, image_url: imageUrl, affirmation: affirmation.trim() || null,
    }).select().single();

    if (error) { setSaveError(`保存できませんでした：${error.message}`); setSaving(false); return; }
    if (data) setItems(prev => [data, ...prev]);
    setTitle(""); setAffirmation(""); setImageFile(null); setPreview(null); setShowForm(false);
    setSaving(false); setSaveError("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このビジョンを削除しますか？")) return;
    await supabase.from("visions").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">🎯 ビジョンボード</h2>
          <button onClick={() => setShowForm(!showForm)} aria-label="ビジョンを追加"
            className="bg-mint text-white text-xs font-bold px-4 py-2 rounded-full shadow-md shadow-mint/30">
            {showForm ? "✕ 閉じる" : "＋ 追加"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4 animate-fade-in">
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="夢・目標のタイトル" aria-label="タイトル"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-mint mb-2" />
            <textarea value={affirmation} onChange={(e) => setAffirmation(e.target.value)}
              placeholder="アファメーション（例：私は毎日成長している）" aria-label="アファメーション"
              className="w-full border-2 border-gray-100 rounded-xl px-4 py-3 text-sm resize-none h-20 outline-none focus:border-mint mb-2" />
            <button onClick={() => fileRef.current?.click()} type="button"
              className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-text-light hover:border-mint transition mb-2">
              {preview ? "📷 画像を変更" : "📷 画像を追加（任意）"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
            {preview && <img src={preview} alt="プレビュー" className="w-full max-h-40 object-cover rounded-xl mb-2" />}
            {saveError && <p className="text-red-500 text-xs mb-2">{saveError}</p>}
            <button onClick={handleAdd} disabled={saving || (!title.trim() && !affirmation.trim() && !imageFile)}
              className="w-full bg-mint text-white font-bold py-3 rounded-full shadow-lg shadow-mint/30 disabled:opacity-30">
              {saving ? "保存中..." : "ビジョンを追加"}
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="text-center py-12">
            <Image src="/sho.png" alt="Sho" width={64} height={64} className="rounded-full mx-auto mb-3 opacity-50" />
            <p className="text-sm font-bold text-text-mid mb-1">まだビジョンがありません</p>
            <p className="text-xs text-text-light">夢や目標を画像と言葉で可視化しよう！</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fade-in">
                {item.image_url && (
                  <img src={item.image_url} alt={item.title || "ビジョン"} className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  {item.title && <p className="text-sm font-bold mb-1">{item.title}</p>}
                  {item.affirmation && <p className="text-xs text-text-mid leading-relaxed italic">&ldquo;{item.affirmation}&rdquo;</p>}
                  <button onClick={() => handleDelete(item.id)} aria-label="削除"
                    className="text-[10px] text-text-light mt-2 hover:text-red-400 transition">削除</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
