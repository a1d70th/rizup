import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6 py-20">
      <Image src="/sho.png" alt="Rizup" width={120} height={120} className="rounded-full mb-6 animate-sho-float" />
      <h1 className="text-3xl font-extrabold mb-2">
        <span className="text-mint">夢</span>を、一人で<br />抱えなくて<span className="text-orange">いい</span>。
      </h1>
      <p className="text-text-mid text-sm leading-relaxed mb-8 max-w-xs">
        毎日成長が見える、前向きな人だけが集まるSNS。<br />
        Rizupと一緒に、前に進もう。
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
