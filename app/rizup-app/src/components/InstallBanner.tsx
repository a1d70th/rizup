"use client";
import { useEffect, useState } from "react";

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsIOS(ios);
    if (!standalone && !localStorage.getItem("install_dismissed")) {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-white border border-mint rounded-2xl p-4 shadow-lg z-50 flex items-center gap-3">
      <span className="text-2xl">📲</span>
      <div className="flex-1">
        <p className="text-sm font-bold">アプリとして使う</p>
        {isIOS
          ? <p className="text-xs text-text-light">Safariの共有ボタン→「ホーム画面に追加」</p>
          : <p className="text-xs text-text-light">ブラウザメニュー→「ホーム画面に追加」</p>
        }
      </div>
      <button onClick={() => { setShow(false); localStorage.setItem("install_dismissed", "1"); }}
        className="text-text-light text-lg p-1">✕</button>
    </div>
  );
}
