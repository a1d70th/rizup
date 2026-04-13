"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 text-center">
          <img src="/sho.png" alt="Rizup" width={80} height={80} className="rounded-full mb-4 animate-sho-float" />
          <h2 className="text-xl font-extrabold mb-2">一時的に表示できなかったよ</h2>
          <p className="text-sm text-text-mid max-w-xs mb-5">
            ネットワークかサーバーの問題かもしれません。少し待ってもう一度お試しください。
          </p>
          <button onClick={() => window.location.reload()}
            className="bg-mint text-white font-bold px-8 py-3 rounded-full shadow-lg shadow-mint/30">
            再読み込みする
          </button>
          <a href="/home" className="mt-3 text-xs text-text-light hover:text-mint">ホームへ戻る</a>
        </div>
      );
    }
    return this.props.children;
  }
}
