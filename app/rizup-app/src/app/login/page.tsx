"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showError = (msg: string) => {
    // Clear any existing timer so the error stays visible
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);
    console.error("[Rizup Login Error]", msg);
    // Auto-clear after 8 seconds
    errorTimerRef.current = setTimeout(() => setError(""), 8000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    // Prevent form submission / page reload
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);
    setError("");

    console.log("[Rizup Login] Attempting login for:", email);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.log("[Rizup Login] Auth error:", authError.message, authError.status);
        const messages: Record<string, string> = {
          "Invalid login credentials": "メールアドレスまたはパスワードが間違っています",
          "Email not confirmed": "メール認証が完了していません。受信トレイを確認してください",
          "Too many requests": "ログイン試行回数が多すぎます。しばらく待ってからお試しください",
          "Failed to fetch": "サーバーに接続できません。Supabase の設定を確認してください",
        };
        showError(messages[authError.message] || `ログインに失敗しました：${authError.message}`);
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log("[Rizup Login] Success! Redirecting to /home");
        // Use window.location for a full page navigation to ensure
        // middleware picks up the new auth cookie
        window.location.href = "https://rizup-app.vercel.app/home";
        // Don't setLoading(false) — page is navigating away
      } else {
        console.log("[Rizup Login] No session returned");
        showError("ログインに失敗しました。もう一度お試しください。");
        setLoading(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "不明なエラー";
      console.error("[Rizup Login] Catch block:", message);
      showError(`通信エラーが発生しました：${message}`);
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) { showError("メールアドレスを入力してください"); return; }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://rizup-app.vercel.app/login",
    });
    setResetLoading(false);
    if (error) { showError("リセットメールの送信に失敗しました"); }
    else { setResetSent(true); }
  };

  const handleGoogleLogin = async () => {
    console.log("[Rizup Login] Google OAuth start");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/home` },
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <Image src="/sho.png" alt="Sho" width={72} height={72} className="rounded-full mb-4" />
      <h1 className="text-2xl font-extrabold mb-1">おかえりなさい</h1>
      <p className="text-text-mid text-sm mb-8">Rizup にログイン</p>

      {/* Use type="button" on submit to double-ensure no native form submit */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          autoFocus={false}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
          onKeyDown={(e) => { if (e.key === "Enter") handleLogin(e); }}
        />
        <input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus={false}
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
          onKeyDown={(e) => { if (e.key === "Enter") handleLogin(e); }}
        />

        {/* Error message — stays visible for 8 seconds */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 animate-fade-in">
            <p className="text-red-500 text-xs text-center font-medium">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading || !email || !password}
          className="bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-50"
        >
          {loading ? "ログイン中..." : "ログイン"}
        </button>

        {resetSent ? (
          <p className="text-mint text-xs text-center mt-2">リセットメールを送信しました。メールを確認してください。</p>
        ) : (
          <button type="button" onClick={handleResetPassword} disabled={resetLoading}
            className="text-xs text-text-light text-center mt-2 hover:text-mint transition w-full">
            {resetLoading ? "送信中..." : "パスワードを忘れた方"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 my-6 w-full max-w-xs">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-text-light">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full max-w-xs border-2 border-gray-200 rounded-full py-3 text-sm font-bold text-text-mid hover:border-mint transition flex items-center justify-center gap-2"
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Google でログイン
      </button>

      <div className="mt-6 text-sm text-text-mid">
        アカウントがない方は{" "}
        <Link href="/register" className="text-mint font-bold">新規登録</Link>
      </div>
    </div>
  );
}
