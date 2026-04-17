"use client";
import { useEffect, useState } from "react";

// BeforeInstallPromptEvent（Chrome/Edge 専用）
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua);
    const safari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari 独自判定
      // @ts-expect-error iOS Safari only
      window.navigator.standalone === true;
    setIsIOS(ios);
    setIsSafari(safari);

    if (standalone) return;
    try {
      if (localStorage.getItem("install_dismissed")) return;
    } catch {}

    // iOS は beforeinstallprompt が発火しないので直接表示
    if (ios) { setShow(true); return; }

    // Chrome / Edge / Android Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem("install_dismissed", "1"); } catch {}
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const res = await deferred.userChoice;
    if (res.outcome === "accepted") {
      setShow(false);
    }
    setDeferred(null);
  };

  if (!show) return null;

  return (
    <>
      <div
        className="fixed left-4 right-4 bg-white dark:bg-[#1a1a1a] border border-mint rounded-2xl p-4 shadow-xl z-50 flex items-center gap-3 max-w-md mx-auto"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <span className="text-2xl shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold dark:text-gray-100">アプリとして使う</p>
          <p className="text-[11px] text-text-mid">
            {isIOS ? "Safariの共有→ホーム画面に追加" : "ワンタップでインストール"}
          </p>
        </div>
        {isIOS ? (
          <button
            onClick={() => setShowIOSSteps(true)}
            className="bg-mint text-white text-xs font-extrabold px-3 py-2 rounded-full shrink-0">
            手順を見る
          </button>
        ) : (
          <button
            onClick={install}
            className="bg-mint text-white text-xs font-extrabold px-3 py-2 rounded-full shrink-0">
            インストール
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="閉じる"
          className="text-text-light text-lg px-2 shrink-0">✕</button>
      </div>

      {/* iOS 手順モーダル */}
      {showIOSSteps && (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-end sm:items-center justify-center"
          onClick={() => setShowIOSSteps(false)}>
          <div
            className="bg-white dark:bg-[#1a1a1a] rounded-t-3xl sm:rounded-3xl w-full max-w-md p-6 shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-extrabold mb-3 dark:text-gray-100">ホーム画面に追加</p>
            {!isSafari && (
              <div className="bg-amber-50 dark:bg-[#2a2515] border border-amber-200 rounded-xl p-3 mb-4 text-xs">
                <p className="font-bold text-amber-700 dark:text-amber-300">⚠️ iOS は Safari だけ対応</p>
                <p className="text-amber-700/90 dark:text-amber-300/90 mt-1">
                  Chrome/LINE のブラウザでは追加できません。右上メニューから「Safari で開く」を選んでね
                </p>
              </div>
            )}
            <ol className="text-sm space-y-3 text-text dark:text-gray-100 leading-relaxed">
              <li><b>1.</b> 画面下の <span className="inline-block bg-mint-light text-mint px-2 py-0.5 rounded text-xs font-bold">共有 ↑</span> ボタンをタップ</li>
              <li><b>2.</b> メニューから <b>「ホーム画面に追加」</b> を選ぶ</li>
              <li><b>3.</b> 右上の <b>「追加」</b> をタップ</li>
              <li><b>4.</b> ホーム画面の 🌱 Rizup アイコンから起動</li>
            </ol>
            <button
              onClick={() => setShowIOSSteps(false)}
              className="mt-5 w-full bg-mint text-white font-extrabold py-3 rounded-full">
              わかった
            </button>
          </div>
        </div>
      )}
    </>
  );
}
