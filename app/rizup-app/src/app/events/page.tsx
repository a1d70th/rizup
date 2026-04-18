"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { isProOrAbove } from "@/lib/plan";
import Link from "next/link";
import Image from "next/image";

// Phase 1 (MVP 軽量運用):
// - Pro ユーザー: Google フォーム（参加希望）へのリンクを表示
// - Free ユーザー: Pro 誘導 CTA を表示
// - Phase 2 でアプリ統合・events テーブル連携予定
// 参加希望 Google フォーム URL は env で注入可能にしておく
const PARTICIPATION_FORM_URL =
  process.env.NEXT_PUBLIC_EVENTS_FORM_URL
  || "https://forms.gle/YOUR_FORM_ID_HERE"; // TODO: 実フォーム作成後に .env.local.example + Vercel に登録

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserEmail(user.email || "");
        const { data: p } = await supabase
          .from("profiles")
          .select("plan, trial_ends_at")
          .eq("id", user.id)
          .maybeSingle();
        setIsPro(isProOrAbove(p));
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <main className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-lg font-extrabold mb-1">🎥 イベント</h1>
        <p className="text-xs text-text-mid mb-5">Pro 会員限定のコミュニティ交流</p>

        {/* 月1オンラインミーティングカード */}
        <section className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎥</span>
            <div className="flex-1">
              <h2 className="text-base font-extrabold">月1オンラインミーティング</h2>
              <p className="text-[11px] text-text-mid">Zoom / 毎月第〇土曜 20:00〜21:30</p>
            </div>
            <span className="text-[10px] font-extrabold bg-mint-light text-mint rounded-full px-2 py-1 whitespace-nowrap">Pro 限定</span>
          </div>
          <p className="text-sm text-text-mid leading-relaxed mb-4">
            翔平さんの近況 45 分 + 参加者のシェアタイム 45 分。<br />
            聞き専 OK・本音で話せる少人数空間。
          </p>

          {loading ? (
            <div className="text-xs text-text-light text-center py-3">読み込み中...</div>
          ) : isPro ? (
            <a href={PARTICIPATION_FORM_URL} target="_blank" rel="noopener"
              className="block w-full bg-mint text-white font-extrabold py-3 rounded-full text-center text-sm shadow-md shadow-mint/30">
              参加登録フォームへ →
            </a>
          ) : (
            <div className="bg-orange-light rounded-xl p-3">
              <p className="text-xs text-orange font-bold mb-2">🔒 Pro 会員限定のイベントです</p>
              <p className="text-[11px] text-text-mid leading-relaxed mb-3">
                Pro（¥480/月）にアップグレードで<br />
                月1ミーティング参加 + 不定期オフ会の優先案内。
              </p>
              <Link href="/settings"
                className="block w-full bg-mint text-white font-bold py-2.5 rounded-full text-center text-xs">
                Pro にアップグレード
              </Link>
            </div>
          )}
        </section>

        {/* 不定期オフ会カード */}
        <section className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🍻</span>
            <div className="flex-1">
              <h2 className="text-base font-extrabold">不定期オフ会（大阪）</h2>
              <p className="text-[11px] text-text-mid">難波・梅田・中崎町 等 / 2〜3 ヶ月に 1 回</p>
            </div>
            <span className="text-[10px] font-extrabold bg-mint-light text-mint rounded-full px-2 py-1 whitespace-nowrap">Pro 優先</span>
          </div>
          <p className="text-sm text-text-mid leading-relaxed mb-4">
            翔平さんがホスト。自由交流。<br />
            参加費: Pro ¥500-1,000 / 一般 ¥2,000-3,000（場所代のみ）
          </p>
          <p className="text-xs text-text-light text-center">次回開催は近日告知予定</p>
        </section>

        {/* 情報 */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a]/50 rounded-2xl p-4">
          <p className="text-[11px] text-text-mid leading-relaxed">
            💌 開催告知は Pro ユーザーのメールアドレス（{userEmail || "登録メール"}）宛に送ります。<br />
            スレッズ（<a href="https://www.threads.net/@shohei_rizup" target="_blank" rel="noopener" className="text-mint font-bold">@shohei_rizup</a>）でも告知。
          </p>
        </div>

        {/* 近日公開機能 */}
        <div className="mt-6 text-center">
          <Image src="/icons/icon-192.png" alt="Rizup" width={48} height={48} className="rounded-[22%] mx-auto mb-2 opacity-60" />
          <p className="text-[11px] text-text-light">アプリ内参加登録は近日公開</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
