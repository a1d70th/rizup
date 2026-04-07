"use client";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const shoRecs = [
  { icon: "📕", title: "嫌われる勇気", desc: "「他人の評価を気にしなくていい」と教えてくれた本。", tag: "📚 本", bg: "bg-mint-light" },
  { icon: "🎬", title: "マイ・インターン", desc: "何歳からでも挑戦していいって思える映画。", tag: "🎬 映画", bg: "bg-orange-light" },
  { icon: "💬", title: "「できない」→「まだできてない」", desc: "この言い換えだけで気持ちが楽になった。", tag: "💡 言葉", bg: "bg-mint-light" },
];

const userRecs = [
  { icon: "🌿", name: "はなさん", title: "朝5分の散歩", desc: "気分が沈んだ日でもこれだけはやる。外の空気を吸うだけで全然違う。", tag: "🚶 習慣" },
  { icon: "📕", name: "たかしさん", title: "アウトプット大全", desc: "インプットだけじゃ変わらないって気づかせてくれた。", tag: "📚 本" },
];

export default function RecommendPage() {
  return (
    <div className="min-h-screen bg-bg pb-20 pt-16">
      <Header />
      <div className="max-w-md mx-auto px-4 py-4">
        <h2 className="text-lg font-extrabold mb-4">📖 おすすめ</h2>

        <p className="text-sm font-bold text-mint mb-3">Sho のおすすめ</p>
        {shoRecs.map((r, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 flex gap-3 items-start animate-fade-in">
            <div className={`w-12 h-12 rounded-xl ${r.bg} flex items-center justify-center text-2xl shrink-0`}>{r.icon}</div>
            <div>
              <h4 className="text-sm font-bold">{r.title}</h4>
              <p className="text-xs text-text-mid leading-relaxed mt-0.5">{r.desc}</p>
              <span className="text-[10px] font-bold text-mint mt-1 inline-block">{r.tag} — Sho のおすすめ</span>
            </div>
          </div>
        ))}

        <p className="text-sm font-bold text-orange mb-3 mt-6">💬 みんなのおすすめ</p>
        {userRecs.map((r, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-3 flex gap-3 items-start animate-fade-in">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mint-light to-orange-light flex items-center justify-center text-2xl shrink-0">{r.icon}</div>
            <div>
              <h4 className="text-sm font-bold">{r.title}</h4>
              <p className="text-xs text-text-mid leading-relaxed mt-0.5">{r.desc}</p>
              <span className="text-[10px] font-bold text-orange mt-1 inline-block">{r.tag} — {r.name}のおすすめ</span>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
