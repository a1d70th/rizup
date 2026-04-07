// Rizup 5 Type System

export const rizupTypes = {
  Seed: { emoji: "🌱", label: "シード", color: "#6ecbb0", desc: "新しいことを始めるのが好き。アイデアが豊富で、好奇心旺盛。" },
  Grow: { emoji: "🌿", label: "グロウ", color: "#34d399", desc: "毎日コツコツ積み上げる。継続力が高く、着実に成長する。" },
  Bloom: { emoji: "🌸", label: "ブルーム", color: "#f472b6", desc: "人とのつながりで成長する。応援上手で、周りを明るくする。" },
  Flame: { emoji: "🔥", label: "フレイム", color: "#f4976c", desc: "目標に向かって突き進む。情熱的で、エネルギッシュ。" },
  Flow: { emoji: "🌊", label: "フロウ", color: "#38bdf8", desc: "柔軟で適応力が高い。状況に合わせて自然に動ける。" },
} as const;

export type RizupType = keyof typeof rizupTypes;

export const typeQuestions = [
  {
    q: "自由な時間ができたら？",
    a: [
      { text: "新しいカフェを開拓する", type: "Seed" },
      { text: "読みかけの本を読む", type: "Grow" },
      { text: "友達と会う", type: "Bloom" },
      { text: "目標の作業を進める", type: "Flame" },
      { text: "その時の気分で決める", type: "Flow" },
    ],
  },
  {
    q: "チームで仕事するとき、あなたの役割は？",
    a: [
      { text: "アイデアを出す人", type: "Seed" },
      { text: "計画を立てて進める人", type: "Grow" },
      { text: "みんなをまとめる人", type: "Bloom" },
      { text: "先頭に立って引っ張る人", type: "Flame" },
      { text: "状況を見て必要なことをやる人", type: "Flow" },
    ],
  },
  {
    q: "落ち込んだときの回復方法は？",
    a: [
      { text: "新しいことを始めて気分転換", type: "Seed" },
      { text: "日記を書いて整理する", type: "Grow" },
      { text: "誰かに話を聞いてもらう", type: "Bloom" },
      { text: "運動して発散する", type: "Flame" },
      { text: "自然の中でぼーっとする", type: "Flow" },
    ],
  },
  {
    q: "理想の休日は？",
    a: [
      { text: "行ったことない場所に行く", type: "Seed" },
      { text: "計画通りに充実した1日", type: "Grow" },
      { text: "大切な人とゆっくり過ごす", type: "Bloom" },
      { text: "挑戦的なアクティビティ", type: "Flame" },
      { text: "何も決めずに流れに任せる", type: "Flow" },
    ],
  },
  {
    q: "あなたが一番大事にしていることは？",
    a: [
      { text: "可能性を広げること", type: "Seed" },
      { text: "着実に成長すること", type: "Grow" },
      { text: "人とのつながり", type: "Bloom" },
      { text: "目標を達成すること", type: "Flame" },
      { text: "心の平穏", type: "Flow" },
    ],
  },
];

export const zodiacSigns = [
  "おひつじ座", "おうし座", "ふたご座", "かに座",
  "しし座", "おとめ座", "てんびん座", "さそり座",
  "いて座", "やぎ座", "みずがめ座", "うお座",
];

export function calculateType(answers: string[]): RizupType {
  const counts: Record<string, number> = {};
  answers.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Bloom") as RizupType;
}
