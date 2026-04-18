"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    (document.activeElement as HTMLElement)?.blur();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      console.error("[Rizup Register] Error:", error.message, error.status);
      const messages: Record<string, string> = {
        "User already registered": "このメールアドレスは既に登録されています",
        "Password should be at least 6 characters": "パスワードは6文字以上にしてください",
        "Unable to validate email address: invalid format": "メールアドレスの形式が正しくありません",
        "Signups not allowed for this instance": "現在新規登録を停止しています",
      };
      setError(messages[error.message] || `登録に失敗しました：${error.message}`);
      setLoading(false);
    } else if (data?.session) {
      // Email confirmation disabled — session returned immediately
      console.log("[Rizup Register] Session created, redirecting to onboarding");
      router.replace("/onboarding");
      router.refresh();
    } else if (data?.user && !data.session) {
      // Email confirmation enabled — show confirmation screen
      console.log("[Rizup Register] Email confirmation required");
      setSuccess(true);
      setLoading(false);
    } else {
      setError("登録に失敗しました。もう一度お試しください。");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    // Detect in-app browser (LINE, Instagram, etc.) — Google blocks OAuth in WebViews
    const ua = navigator.userAgent || "";
    if (/Line|FBAN|FBAV|Instagram/i.test(ua)) {
      setError("アプリ内ブラウザではGoogleログインが使えません。右上の「…」メニューから「ブラウザで開く」を選んでください。");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        console.error("[Rizup Register] Google OAuth error:", error.message);
        setError("Google 登録に失敗しました。もう一度お試しください。");
      }
    } catch {
      setError("Google 登録に失敗しました。");
    }
  };


  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState("");

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) {
      setResendMsg("送信に失敗しました。しばらく待ってから再度お試しください。");
    } else {
      setResendMsg("確認メールを再送信しました。");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/icons/icon-192.png" alt="Rizup" width={96} height={96} className="rounded-[22%] mb-4 shadow-md animate-sho-float" />
        <h1 className="text-2xl font-extrabold mb-2">メールを確認してね</h1>
        <p className="text-text-mid text-sm leading-relaxed max-w-xs mb-4">
          <strong>{email}</strong> に確認メールを送りました。<br />
          メール内のリンクをクリックして、登録を完了してください。
        </p>
        <p className="text-xs text-text-light mb-4 max-w-xs">
          メールが届かない場合は迷惑メールフォルダを確認してください。
        </p>
        {resendMsg && <p className="text-xs text-mint mb-3">{resendMsg}</p>}
        <button onClick={handleResend} disabled={resendCooldown > 0}
          className="text-sm text-mint font-bold border border-mint rounded-full px-6 py-2.5 hover:bg-mint-light transition disabled:opacity-40">
          {resendCooldown > 0 ? `再送信まで ${resendCooldown}秒` : "確認メールを再送信"}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <Image src="/icons/icon-192.png" alt="Rizup" width={72} height={72} className="rounded-[22%] mb-4 shadow-md" />
      <h1 className="text-2xl font-extrabold mb-1">はじめよう</h1>
      <p className="text-text-mid text-sm mb-8">Rizup に新規登録</p>

      <form onSubmit={handleRegister} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="email"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          aria-label="メールアドレス"
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
        />
        <input
          type="password"
          placeholder="パスワードを入力（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          aria-label="パスワード"
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
        />
        {error && <div className="bg-red-50 border border-red-200 rounded-2xl p-3" role="alert"><p className="text-red-500 text-sm text-center font-medium">{error}</p></div>}
        <button
          type="submit"
          disabled={loading}
          className="bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-50"
        >
          {loading ? "登録中..." : "7日間無料で始める"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6 w-full max-w-xs">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-text-light">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Google */}
        <button
          type="button"
          onClick={handleGoogleSignup} aria-label="Googleで登録"
          className="w-full border-2 border-gray-200 rounded-full py-3 text-sm font-bold text-text-mid hover:border-mint transition flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google で登録
        </button>

      </div>

      <p className="text-xs text-text-light mt-6 max-w-xs text-center leading-relaxed">
        登録することで、
        <a href="/legal/terms-of-service.html" className="text-mint">利用規約</a>・
        <a href="/legal/privacy-policy.html" className="text-mint">プライバシーポリシー</a>・
        <a href="/legal/tokushoho.html" className="text-mint">特定商取引法</a> に同意したものとみなされます。
      </p>

      <div className="mt-4 text-sm text-text-mid">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-mint font-bold">ログイン</Link>
      </div>
    </div>
  );
}
