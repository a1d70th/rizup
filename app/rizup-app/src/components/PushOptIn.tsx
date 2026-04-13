"use client";
import { useEffect, useState } from "react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof window !== "undefined" ? window.atob(b64) : "";
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function PushOptIn() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const enable = async () => {
    if (!VAPID_PUBLIC) {
      setMsg("通知サーバーが未設定です。運営に問い合わせてください。");
      return;
    }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setMsg("通知が許可されませんでした。");
        setLoading(false);
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const keyArr = urlBase64ToUint8Array(VAPID_PUBLIC);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyArr.buffer as ArrayBuffer,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error("Server rejected subscription");
      setMsg("通知をONにしたよ。朝7時に一声かけるね🌿");
    } catch (e) {
      console.error(e);
      setMsg("通知の登録に失敗したよ。もう一度お試しください。");
    }
    setLoading(false);
  };

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("push_optin_dismissed") === "1") setDismissed(true);
  }, []);

  if (!supported) return null;
  if (permission === "granted") return null; // 通知ONになったら非表示
  if (dismissed) return null;
  return (
    <div className="bg-white rounded-2xl border border-mint/30 shadow-sm p-4 relative">
      <button onClick={() => { localStorage.setItem("push_optin_dismissed", "1"); setDismissed(true); }}
        aria-label="閉じる"
        className="absolute top-2 right-2 text-text-light hover:text-text text-sm w-6 h-6 rounded-full flex items-center justify-center">
        ✕
      </button>
      <div className="flex items-center gap-2 mb-2 pr-6">
        <span className="text-xl">🔔</span>
        <p className="text-[15px] font-extrabold flex-1">朝の通知をON</p>
      </div>
      <p className="text-[13px] text-text-mid leading-relaxed mb-3">
        毎朝7時、Rizupが一声かけます。ジャーナル忘れを防ぎます。
      </p>
      <button onClick={enable} disabled={loading}
        className="w-full bg-mint text-white font-bold py-2.5 rounded-full text-sm shadow-md disabled:opacity-40">
        {loading ? "設定中..." : "通知をONにする"}
      </button>
      {msg && <p className="text-[10px] text-text-mid mt-2 text-center">{msg}</p>}
    </div>
  );
}
