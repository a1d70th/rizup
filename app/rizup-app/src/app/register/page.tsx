"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

export default function RegisterPage() {
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: "https://rizup-app.vercel.app/auth/callback" },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: "https://rizup-app.vercel.app/auth/callback" },
      });
      if (error) setError("Google 登録に失敗しました。もう一度お試しください。");
    } catch {
      setError("Google 登録に失敗しました。");
    }
  };

  const handleAppleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: "https://rizup-app.vercel.app/auth/callback" },
      });
      if (error) setError("Apple 登録に失敗しました。もう一度お試しください。");
    } catch {
      setError("Apple 登録に失敗しました。");
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
        <Image src="/sho.png" alt="Sho" width={96} height={96} className="rounded-full mb-4 animate-sho-float" />
        <h1 className="text-2xl font-extrabold mb-2">メールを確認してね</h1>
        <p className="text-text-mid text-sm leading-relaxed max-w-xs">
          <strong>{email}</strong> に確認メールを送りました。<br />
          メール内のリンクをクリックして、登録を完了してください。
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <Image src="/sho.png" alt="Sho" width={72} height={72} className="rounded-full mb-4" />
      <h1 className="text-2xl font-extrabold mb-1">はじめよう</h1>
      <p className="text-text-mid text-sm mb-8">Rizup に新規登録</p>

      <form onSubmit={handleRegister} className="w-full max-w-xs flex flex-col gap-3">
        <input
          type="email"
          placeholder="メールアドレス"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
        />
        <input
          type="password"
          placeholder="パスワード（6文字以上）"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-mint transition"
        />
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-mint text-white font-bold py-3.5 rounded-full shadow-lg shadow-mint/30 hover:bg-mint-dark transition disabled:opacity-50"
        >
          {loading ? "登録中..." : "無料で登録する"}
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
          onClick={handleGoogleSignup}
          className="w-full border-2 border-gray-200 rounded-full py-3 text-sm font-bold text-text-mid hover:border-mint transition flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Google で登録
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={handleAppleSignup}
          className="w-full border-2 border-gray-200 rounded-full py-3 text-sm font-bold text-text-mid hover:border-gray-400 transition flex items-center justify-center gap-2 bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Apple で登録
        </button>
      </div>

      <p className="text-xs text-text-light mt-6 max-w-xs text-center leading-relaxed">
        登録することで、
        <a href="/legal/terms-of-service.html" className="text-mint">利用規約</a> と
        <a href="/legal/privacy-policy.html" className="text-mint">プライバシーポリシー</a> に同意したものとみなされます。
      </p>

      <div className="mt-4 text-sm text-text-mid">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="text-mint font-bold">ログイン</Link>
      </div>
    </div>
  );
}
