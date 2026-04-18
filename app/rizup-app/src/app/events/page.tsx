"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import Image from "next/image";

// Phase 1 軽量運用:
// - 月 1 オンラインミーティングは Free/Pro 両方参加可能（初期は無料開放）
// - Google フォーム（参加希望）に誘導
// - Phase 2 で events テーブル + アプリ内登録に移行
const PARTICIPATION_FORM_URL =
  process.env.NEXT_PUBLIC_EVENTS_FORM_URL
  || "https://forms.gle/YOUR_FORM_ID_HERE"; // TODO: 実フォーム作成後に .env.local.example + Vercel に登録

export default function EventsPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAuthed(true);
          setUserEmail(user.email || "");
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-20">
      <Header />
      <main className="max-w-md mx-auto px-4 py-4">
        <h1 className="text-lg font-extrabold mb-1">🎥 イベント</h1>
        <p className="text-xs text-text-mid mb-5">Rizup コミュニティ交流</p>

        {/* 月1オンラインミーティングカード */}
        <section className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🎥</span>
            <div className="flex-1">
              <h2 className="text-base font-extrabold font-extrabold">月1オンラインミーティング</h2>
              <p className="text-[11px] text-text-mid">Zoom / 毎月第〇土曜 20:00〜21:30</p>
            </div>
            <span className="text-[10px] font-extrabold bg-mint-light text-mint rounded-full px-2 py-1 whitespace-nowrap">参加無料</span>
          </div>
          <p className="text-sm text-text-mid leading-relaxed mb-4">
            翔平さんの近況 45 分 + 参加者のシェアタイム 45 分。<br />
            聞き専 OK・本音で話せる少人数空間。
          </p>

          {loading ? (
            <div className="text-xs text-text-light text-center py-3">読み込み中...</div>
          ) : authed ? (
            <a href={PARTICIPATION_FORM_URL} target="_blank" rel="noopener"
              className="block w-full bg-mint text-white font-extrabold py-3 rounded-full text-center text-sm shadow-md shadow-mint/30">
              参加登録フォームへ →
            </a>
          ) : (
            <a href="/login"
              className="block w-full bg-mint text-white font-extrabold py-3 rounded-full text-center text-sm shadow-md shadow-mint/30">
              ログインして参加登録
            </a>
          )}
        </section>

        {/* 不定期オフ会カード（金額は伏せる） */}
        <section className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🍻</span>
            <div className="flex-1">
              <h2 className="text-base font-extrabold">オフ会</h2>
              <p className="text-[11px] text-text-mid">不定期で開催予定</p>
            </div>
            <span className="text-[10px] font-extrabold bg-gray-100 dark:bg-[#2a2a2a] text-text-mid rounded-full px-2 py-1 whitespace-nowrap">準備中</span>
          </div>
          <p className="text-sm text-text-mid leading-relaxed">
            翔平さんがホスト・自由交流のリアル会。<br />
            詳細が決まり次第ここで案内します。
          </p>
        </section>

        {/* 情報 */}
        <div className="bg-gray-50 dark:bg-[#1a1a1a]/50 rounded-2xl p-4">
          <p className="text-[11px] text-text-mid leading-relaxed">
            💌 開催告知は登録メールアドレス（{userEmail || "ログイン後に表示"}）宛に送ります。<br />
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
