"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Link from "next/link";

interface Feedback {
  id: string;
  content: string;
  category: "usability" | "feature" | "bug" | "other";
  created_at: string;
  user_id: string;
  profiles?: { name: string | null; email: string | null } | null;
}

const CATEGORY_META: Record<string, { label: string; emoji: string; cls: string }> = {
  usability: { label: "使いにくい",      emoji: "😕", cls: "bg-orange-light text-orange" },
  feature:   { label: "欲しい機能",      emoji: "💡", cls: "bg-mint-light text-mint" },
  bug:       { label: "バグ",            emoji: "🐛", cls: "bg-red-50 text-red-500" },
  other:     { label: "その他",          emoji: "💬", cls: "bg-[#06b6d4]/10 text-[#06b6d4]" },
};

export default function AdminFeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/home"; return; }
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
      if (!profile?.is_admin) { window.location.href = "/home"; return; }
      setAuthorized(true);

      const { data } = await supabase
        .from("feedbacks")
        .select("id, content, category, created_at, user_id, profiles(name, email)")
        .order("created_at", { ascending: false });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (data) setItems(data as any);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-mid text-sm">読み込み中...</p>
      </div>
    );
  }
  if (!authorized) return null;

  const filtered = filter === "all" ? items : items.filter(i => i.category === filter);
  const counts = {
    all: items.length,
    usability: items.filter(i => i.category === "usability").length,
    feature:   items.filter(i => i.category === "feature").length,
    bug:       items.filter(i => i.category === "bug").length,
    other:     items.filter(i => i.category === "other").length,
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "たった今";
    if (diffMin < 60) return `${diffMin}分前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}時間前`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `${diffDay}日前`;
    return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-extrabold">📝 フィードバック <span className="text-xs font-normal text-text-light">（{items.length}件）</span></h1>
          <Link href="/admin" className="text-xs text-mint font-bold">← 管理 TOP</Link>
        </div>

        {/* カテゴリフィルタ */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(["all", "usability", "feature", "bug", "other"] as const).map(k => {
            const meta = k === "all" ? { label: "すべて", emoji: "📋", cls: "bg-gray-100 text-text-mid" } : CATEGORY_META[k];
            const active = filter === k;
            return (
              <button key={k} onClick={() => setFilter(k)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold transition ${active ? "bg-mint text-white shadow-md" : meta.cls}`}>
                {meta.emoji} {meta.label} ({counts[k as keyof typeof counts]})
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 text-center border border-gray-100 dark:border-[#2a2a2a]">
            <p className="text-text-mid text-sm">まだフィードバックはありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(f => {
              const meta = CATEGORY_META[f.category] || CATEGORY_META.other;
              const name = f.profiles?.name?.trim() || "名無しさん";
              return (
                <article key={f.id} className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-4 border border-gray-100 dark:border-[#2a2a2a] shadow-sm">
                  <header className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-extrabold rounded-full px-2 py-1 whitespace-nowrap ${meta.cls}`}>
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="text-[12px] font-extrabold truncate">{name}</span>
                    </div>
                    <span className="text-[11px] text-text-light shrink-0">{formatDate(f.created_at)}</span>
                  </header>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">{f.content}</p>
                  {f.profiles?.email && (
                    <p className="text-[10px] text-text-light mt-2 font-mono">{f.profiles.email}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
