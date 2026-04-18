import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 py-20">
      <Image src="/icons/icon-192.png" alt="Rizup" width={120} height={120} className="rounded-full mb-6 animate-sho-float" />
      <h1 className="text-3xl font-extrabold mb-2">
        <span className="text-mint">朝と夜</span>、<br />1分で<span className="text-orange">未来が変わる</span>。
      </h1>
      <p className="text-text-mid text-sm leading-relaxed mb-8 max-w-xs">
        朝のひとこと、夜のふりかえり。<br />
        1分の記録から、小さな積み重ねで未来を変えていく。
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/register"
          className="bg-mint text-white font-bold py-3.5 rounded-full text-center shadow-lg shadow-mint/30 hover:bg-mint-dark transition"
        >
          無料で始める
        </Link>
        <Link
          href="/login"
          className="border-2 border-gray-200 text-text-mid font-bold py-3.5 rounded-full text-center hover:border-mint transition"
        >
          ログイン
        </Link>
      </div>
      <p className="text-xs text-text-light mt-6">登録無料 / いつでも退会OK</p>
    </div>
  );
}
