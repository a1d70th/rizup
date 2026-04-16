"use client";
import { useState, useEffect, useMemo } from "react";

export type AnimalKind = "rabbit" | "raccoon" | "cat" | "squirrel" | "owl";

interface Props {
  streak: number;
  name?: string | null;
  animal?: AnimalKind | null;
  lastWritten?: Date | null;
  size?: number; // default 140
  mood?: 'good' | 'bad' | 'neutral';
}

// Stage と表情の判定
function stageOf(streak: number): number {
  if (streak <= 2) return 1;  // 卵（3日間あたためる）
  if (streak <= 6) return 2;  // 赤ちゃん
  if (streak <= 20) return 3; // 子供
  if (streak <= 44) return 4; // 大人
  if (streak <= 74) return 5; // 村人
  if (streak <= 99) return 6; // 村長
  return 7;                   // 伝説
}

const STAGE_MESSAGES: Record<number, string> = {
  1: "今日書くと生まれるよ🌱",
  2: "一緒に今日も🌱",
  3: "だんだん大きくなってきたよ✨",
  4: "村ができたよ！仲間が来るかも🏡",
  5: "村が賑やかになってきたね🌸",
  6: "あなたは村長だよ。みんなが頼りにしてる🌳",
  7: "この村はあなたが作った。すごいよ🌟",
};


// 時間帯別メッセージ
function timeOfDay(): "morning" | "day" | "evening" | "deep" {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 18) return "day";
  if (h >= 18 && h < 24) return "evening";
  return "deep";
}

function timeMessage(name: string, tod: string): string {
  const n = name || "相棒";
  // 日付ベースで30日周期のバリエーション
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const variant = dayOfYear % 5;

  const messages: Record<string, string[]> = {
    morning: [
      `${n}、おはよう！今日も来てくれてありがとう☀️`,
      `おはよう。${n}は早起きして待ってたよ🌱`,
      `新しい1日だね。${n}と一緒に始めよう`,
      `おはよう！昨日の自分より1%だけ前へ☀️`,
      `${n}、今日はどんな日になるかな？`,
    ],
    day: [
      `昨日より少しだけでいい🌿`,
      `${n}もお昼休憩中。ゆっくりしてね`,
      `午後も自分のペースでいこう🌱`,
      `ちょっと深呼吸して、また頑張ろう`,
      `${n}はいつもそばにいるよ`,
    ],
    evening: [
      `今日もお疲れさま🌙`,
      `今日1日、よく頑張ったね。${n}も嬉しい`,
      `夜はゆっくり自分を褒める時間🌙`,
      `今日できたこと、1つでもあれば十分だよ`,
      `${n}と一緒に今日を振り返ろう`,
    ],
    deep: [
      `眠れない夜は、ここにいるよ⭐`,
      `夜更かしさん。${n}も起きてるよ`,
      `考えすぎないで。明日また話そう💤`,
      `深呼吸して、温かくして寝よう`,
      `${n}がそばにいるから大丈夫`,
    ],
  };

  const list = messages[tod] || messages.day;
  return list[variant % list.length];
}

function wroteToday(last: Date | null | undefined): boolean {
  if (!last) return false;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  const lastJst = new Date(last).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  return today === lastJst;
}

// 動物別のカラーパレット（パステル系）
const PALETTE: Record<AnimalKind, { body: string; bodyLight: string; accent: string; cheek: string; ear: string }> = {
  rabbit:   { body: "#fff0e8", bodyLight: "#fff8f3", accent: "#d4a882", cheek: "#ff9eb5", ear: "#ffb8cc" },
  raccoon:  { body: "#d5cfc5", bodyLight: "#ede8e0", accent: "#7b6b5e", cheek: "#ff9eb5", ear: "#b8a898" },
  cat:      { body: "#ffe4cc", bodyLight: "#fff6ee", accent: "#f0a868", cheek: "#ff9eb5", ear: "#ffd0a8" },
  squirrel: { body: "#e0b080", bodyLight: "#f5dec0", accent: "#9b6e4c", cheek: "#ff9eb5", ear: "#d09860" },
  owl:      { body: "#d8c8a8", bodyLight: "#f0e4d0", accent: "#8a7858", cheek: "#ff9eb5", ear: "#c0b090" },
};

// アニメーションは stage と書いたかで分岐
export default function MyCharacter({
  streak,
  name,
  animal = "rabbit",
  lastWritten = null,
  size = 140,
  mood = 'neutral',
}: Props) {
  const [showBubble, setShowBubble] = useState(false);
  const [hatching, setHatching] = useState(false);
  const stage = stageOf(streak);
  const palette = PALETTE[animal || "rabbit"];
  const tod = useMemo(() => timeOfDay(), []);
  const wrote = wroteToday(lastWritten);
  const isHappy = mood === 'good' || (mood === 'neutral' && wrote);
  const isSad = mood === 'bad';
  const charName = name || "相棒";

  // streak=1 かつ lastWritten が今日 → 孵化アニメーション
  useEffect(() => {
    if (stage === 2 && wroteToday(lastWritten)) {
      setHatching(true);
      const timer = setTimeout(() => setHatching(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [stage, lastWritten]);

  const tapMsg = useMemo(() => timeMessage(charName, tod), [charName, tod]);
  const baseMsg = hatching
    ? `生まれたよ！一緒にいるね🌱`
    : isSad
    ? `そばにいるよ。${charName}はずっと一緒だよ🌿`
    : isHappy
      ? `今日もありがとう、${charName}がジャンプしてるよ✨`
      : lastWritten
        ? `${charName}と一緒に今日も🌱`
        : stage === 1
          ? streak === 0
            ? `今日書くとあたため始めるよ🥚`
            : streak === 1
              ? `あたたかい。中で何か動いてる...`
              : `もうすぐ会えるよ...！明日を楽しみに✨`
          : STAGE_MESSAGES[stage];

  return (
    <div className="flex flex-col items-center" style={{ width: size + 40 }}>
      <button
        type="button"
        aria-label={`${charName}をタップして話す`}
        onClick={() => setShowBubble(s => !s)}
        className={`relative focus:outline-none ${isHappy ? "animate-sho-bounce" : isSad ? "animate-sho-float" : wrote ? "animate-sho-bounce" : "animate-sho-float"}`}
      >
        {stage === 1 ? (
          <EggSvg size={size} palette={palette} crackLevel={streak} />
        ) : hatching ? (
          <div className="relative">
            <EggSvg size={size} palette={palette} cracking />
            <div className="absolute inset-0 flex items-center justify-center animate-fade-in" style={{ animationDelay: '1.5s', animationFillMode: 'both' }}>
              <AnimalSvg
                size={size * 0.7}
                animal={animal || "rabbit"}
                palette={palette}
                isHappy={true}
                isSad={false}
                stage={2}
              />
            </div>
          </div>
        ) : (
          <AnimalSvg
            size={size}
            animal={animal || "rabbit"}
            palette={palette}
            isHappy={isHappy}
            isSad={isSad}
            stage={stage}
          />
        )}
      </button>

      {name && (
        <div className="mt-2 text-center">
          <p className="text-[12px] font-extrabold text-mint">{name}</p>
        </div>
      )}

      {showBubble && (
        <div className="mt-2 max-w-[280px] bg-white dark:bg-[#1a1a1a] border border-mint/30 dark:border-[#2a3a34] rounded-2xl px-4 py-2.5 shadow-md animate-fade-in">
          <p className="text-[12px] text-text dark:text-gray-100 leading-relaxed">{tapMsg}</p>
        </div>
      )}
      {!showBubble && (
        <p className="mt-2 text-[11px] text-text-mid dark:text-gray-300 text-center max-w-[280px] leading-relaxed">
          {baseMsg}
        </p>
      )}
    </div>
  );
}

// ───────── SVG サブコンポーネント ─────────

function EggSvg({ size, crackLevel = 0, cracking }: { size: number; palette: { accent: string }; crackLevel?: number; cracking?: boolean }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 100 120"
      style={crackLevel >= 2 ? { animation: "eggWobble 1.5s ease-in-out infinite" } : undefined}>
      <defs>
        <radialGradient id="egg-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d4f0e7" />
        </radialGradient>
        <style>{`@keyframes eggWobble { 0%,100% { transform: rotate(0deg); } 25% { transform: rotate(3deg); } 75% { transform: rotate(-3deg); } }`}</style>
      </defs>
      {/* 卵本体 */}
      <ellipse cx="50" cy="65" rx="30" ry="38" fill="url(#egg-grad)" stroke="#b8e0d2" strokeWidth="2" />
      {/* 水玉模様 */}
      <circle cx="38" cy="55" r="4" fill="#c8ead8" opacity="0.5" />
      <circle cx="58" cy="48" r="3" fill="#c8ead8" opacity="0.5" />
      <circle cx="45" cy="75" r="3.5" fill="#c8ead8" opacity="0.5" />
      <circle cx="62" cy="68" r="2.5" fill="#c8ead8" opacity="0.4" />
      {/* 目（点2つ） */}
      <circle cx="43" cy="60" r="2" fill="#5a5a5a" />
      <circle cx="57" cy="60" r="2" fill="#5a5a5a" />
      {/* ハイライト */}
      <circle cx="43.5" cy="59.5" r="0.7" fill="#fff" />
      <circle cx="57.5" cy="59.5" r="0.7" fill="#fff" />
      {/* ほっぺ */}
      <ellipse cx="36" cy="66" rx="4" ry="2.5" fill="#ffc0cb" opacity="0.4" />
      <ellipse cx="64" cy="66" rx="4" ry="2.5" fill="#ffc0cb" opacity="0.4" />
      {/* ヒビ: streak 1 = 小さなヒビ1本 */}
      {(crackLevel >= 1 || cracking) && (
        <polyline points="42,46 46,39 50,47" fill="none" stroke="#7ab8a0" strokeWidth="1.5" strokeLinecap="round" />
      )}
      {/* ヒビ: streak 2 = 追加のヒビ + 揺れアニメ */}
      {(crackLevel >= 2 || cracking) && (
        <g>
          <polyline points="53,44 57,36 60,45" fill="none" stroke="#7ab8a0" strokeWidth="1.3" strokeLinecap="round" />
          <polyline points="46,50 50,43 54,50" fill="none" stroke="#7ab8a0" strokeWidth="1" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

function AnimalSvg({
  size,
  animal,
  palette,
  isHappy,
  isSad,
  stage,
}: {
  size: number;
  animal: AnimalKind;
  palette: { body: string; bodyLight: string; accent: string; cheek: string; ear: string };
  isHappy: boolean;
  isSad: boolean;
  stage: number;
}) {
  const stageScale = stage === 1 ? 0.75 : stage === 2 ? 0.85 : stage === 3 ? 0.9 : stage === 4 ? 0.95 : 1;
  const cheekOpacity = isHappy ? 0.8 : 0.7;

  // 共通の表情パーツ生成
  function Eyes() {
    if (animal === "owl") {
      // ふくろう専用の大きな目
      if (isHappy) {
        return (
          <>
            <circle cx="46" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
            <circle cx="74" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
            <path d="M 40 62 Q 46 67 52 62" stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 68 62 Q 74 67 80 62" stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        );
      }
      if (isSad) {
        return (
          <>
            <circle cx="46" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
            <circle cx="74" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
            <circle cx="46" cy="62" r="7" fill="#3a3a3a" />
            <circle cx="74" cy="62" r="7" fill="#3a3a3a" />
            <circle cx="48" cy="60" r="5" fill="#fff" />
            <circle cx="76" cy="60" r="5" fill="#fff" />
            <circle cx="44" cy="64" r="1.5" fill="#fff" opacity="0.6" />
            <circle cx="72" cy="64" r="1.5" fill="#fff" opacity="0.6" />
          </>
        );
      }
      return (
        <>
          <circle cx="46" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
          <circle cx="74" cy="62" r="10" fill={palette.bodyLight} stroke={palette.accent} strokeWidth="1" />
          <circle cx="46" cy="62" r="6" fill="#3a3a3a" />
          <circle cx="74" cy="62" r="6" fill="#3a3a3a" />
          <circle cx="48" cy="60" r="4" fill="#fff" />
          <circle cx="76" cy="60" r="4" fill="#fff" />
          <circle cx="44" cy="64" r="1.5" fill="#fff" opacity="0.6" />
          <circle cx="72" cy="64" r="1.5" fill="#fff" opacity="0.6" />
        </>
      );
    }

    // 通常動物の目
    const eyeY = 62;
    if (isHappy) {
      return (
        <>
          <path d={`M 42 ${eyeY} Q 48 ${eyeY - 6} 54 ${eyeY}`} stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={`M 66 ${eyeY} Q 72 ${eyeY - 6} 78 ${eyeY}`} stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      );
    }
    if (isSad) {
      return (
        <>
          <circle cx="48" cy={eyeY} r="11" fill="#2a2a2a" />
          <circle cx="72" cy={eyeY} r="11" fill="#2a2a2a" />
          {/* メインハイライト（うるうる） */}
          <circle cx="51" cy={eyeY - 3} r="5" fill="#ffffff" />
          <circle cx="75" cy={eyeY - 3} r="5" fill="#ffffff" />
          {/* 第2ハイライト */}
          <circle cx="46" cy={eyeY + 2} r="1.5" fill="#ffffff" opacity="0.6" />
          <circle cx="70" cy={eyeY + 2} r="1.5" fill="#ffffff" opacity="0.6" />
        </>
      );
    }
    // neutral
    return (
      <>
        <circle cx="48" cy={eyeY} r="11" fill="#2a2a2a" />
        <circle cx="72" cy={eyeY} r="11" fill="#2a2a2a" />
        {/* メインハイライト */}
        <circle cx="51" cy={eyeY - 3} r="4" fill="#ffffff" />
        <circle cx="75" cy={eyeY - 3} r="4" fill="#ffffff" />
        {/* 第2ハイライト */}
        <circle cx="46" cy={eyeY + 2} r="1.5" fill="#ffffff" opacity="0.6" />
        <circle cx="70" cy={eyeY + 2} r="1.5" fill="#ffffff" opacity="0.6" />
      </>
    );
  }

  function Mouth() {
    if (isHappy) {
      return <path d="M 54 74 Q 60 80 66 74" stroke={palette.accent} strokeWidth="2" fill="none" strokeLinecap="round" />;
    }
    if (isSad) {
      return <path d="M 56 76 Q 60 78 64 76" stroke={palette.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" />;
    }
    return <path d="M 56 75 Q 60 79 64 75" stroke={palette.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />;
  }

  // 動物別の装飾（stage 5+ 葉っぱ / 6+ 王冠 / 7+ キラキラ）
  function StageDecoration() {
    return (
      <>
        {stage >= 5 && stage < 6 && (
          <g>
            {/* 小さな葉っぱ */}
            <path d="M 60 18 Q 55 8 50 14 Q 48 20 55 22 Q 58 16 60 18 Z" fill="#7bc67e" stroke="#5aa85d" strokeWidth="0.8" />
            <line x1="55" y1="22" x2="58" y2="16" stroke="#5aa85d" strokeWidth="0.6" />
          </g>
        )}
        {stage >= 6 && (
          <g>
            {/* 王冠 */}
            <path d="M 46 20 L 48 8 L 54 16 L 60 6 L 66 16 L 72 8 L 74 20 Z" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
            <circle cx="54" cy="14" r="1.5" fill="#FF6B6B" />
            <circle cx="60" cy="9" r="1.5" fill="#87CEEB" />
            <circle cx="66" cy="14" r="1.5" fill="#FF6B6B" />
          </g>
        )}
        {stage >= 7 && (
          <g>
            {/* キラキラエフェクト（4つの星） */}
            <g>
              <path d="M 15 30 L 17 26 L 19 30 L 17 34 Z" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
              </path>
            </g>
            <g>
              <path d="M 105 35 L 107 31 L 109 35 L 107 39 Z" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2.3s" repeatCount="indefinite" begin="0.5s" />
              </path>
            </g>
            <g>
              <path d="M 20 85 L 22 81 L 24 85 L 22 89 Z" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" begin="0.8s" />
              </path>
            </g>
            <g>
              <path d="M 100 80 L 102 76 L 104 80 L 102 84 Z" fill="#FFD700" opacity="0.8">
                <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" begin="1.2s" />
              </path>
            </g>
          </g>
        )}
      </>
    );
  }

  // 動物ごとの本体SVG
  function AnimalBody() {
    switch (animal) {
      case "rabbit":
        return (
          <>
            {/* 耳 */}
            <ellipse cx="42" cy="25" rx="8" ry="22" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <ellipse cx="78" cy="25" rx="8" ry="22" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <ellipse cx="42" cy="27" rx="4" ry="14" fill={palette.ear} opacity="0.5" />
            <ellipse cx="78" cy="27" rx="4" ry="14" fill={palette.ear} opacity="0.5" />
            {/* 体 */}
            <ellipse cx="60" cy="78" rx="32" ry="28" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            {/* お腹 */}
            <ellipse cx="60" cy="86" rx="18" ry="16" fill={palette.bodyLight} />
            {/* 目 */}
            <Eyes />
            {/* ほっぺ */}
            <ellipse cx="38" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            <ellipse cx="82" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            {/* 鼻 */}
            <ellipse cx="60" cy="70" rx="3" ry="2" fill={palette.accent} />
            {/* 口 */}
            <Mouth />
          </>
        );

      case "raccoon":
        return (
          <>
            {/* 丸い耳 */}
            <circle cx="38" cy="38" r="7" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <circle cx="82" cy="38" r="7" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <circle cx="38" cy="38" r="4" fill={palette.ear} />
            <circle cx="82" cy="38" r="4" fill={palette.ear} />
            {/* 体（大きめ） */}
            <ellipse cx="60" cy="78" rx="34" ry="29" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            {/* お腹 */}
            <ellipse cx="60" cy="86" rx="20" ry="18" fill={palette.bodyLight} />
            {/* タヌキ目模様 */}
            <ellipse cx="46" cy="60" rx="10" ry="8" fill="#4a3a2a" opacity="0.3" />
            <ellipse cx="74" cy="60" rx="10" ry="8" fill="#4a3a2a" opacity="0.3" />
            {/* 目 */}
            <Eyes />
            {/* ほっぺ */}
            <ellipse cx="36" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            <ellipse cx="84" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            {/* 鼻 */}
            <ellipse cx="60" cy="70" rx="3" ry="2" fill={palette.accent} />
            {/* 口 */}
            <Mouth />
            {/* 縞しっぽ */}
            <path d="M 90 80 Q 105 70 108 60 Q 110 50 105 45" fill="none" stroke={palette.body} strokeWidth="8" strokeLinecap="round" />
            <path d="M 105 70 Q 108 65 106 60" fill="none" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
            <path d="M 107 58 Q 109 53 106 48" fill="none" stroke={palette.accent} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
          </>
        );

      case "cat":
        return (
          <>
            {/* 三角耳 */}
            <polygon points="35,48 28,18 50,40" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <polygon points="85,48 92,18 70,40" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <polygon points="37,44 32,24 48,40" fill={palette.ear} opacity="0.5" />
            <polygon points="83,44 88,24 72,40" fill={palette.ear} opacity="0.5" />
            {/* やや横長の体 */}
            <ellipse cx="60" cy="78" rx="34" ry="26" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            {/* お腹 */}
            <ellipse cx="60" cy="84" rx="18" ry="14" fill={palette.bodyLight} />
            {/* ねこ目 */}
            {isHappy ? (
              <>
                <path d="M 42 62 Q 48 56 54 62" stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 66 62 Q 72 56 78 62" stroke="#3a3a3a" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : isSad ? (
              <>
                <ellipse cx="48" cy="62" rx="5" ry="6" fill="#3a3a3a" />
                <ellipse cx="72" cy="62" rx="5" ry="6" fill="#3a3a3a" />
                <ellipse cx="49" cy="60" rx="2" ry="2.5" fill="#fff" />
                <ellipse cx="73" cy="60" rx="2" ry="2.5" fill="#fff" />
              </>
            ) : (
              <>
                <ellipse cx="48" cy="62" rx="5" ry="4" fill="#3a3a3a" />
                <ellipse cx="72" cy="62" rx="5" ry="4" fill="#3a3a3a" />
                <ellipse cx="49.5" cy="61" rx="1.5" ry="2" fill="#fff" />
                <ellipse cx="73.5" cy="61" rx="1.5" ry="2" fill="#fff" />
              </>
            )}
            {/* ひげ */}
            <line x1="25" y1="66" x2="42" y2="68" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            <line x1="24" y1="70" x2="42" y2="70" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            <line x1="25" y1="74" x2="42" y2="72" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            <line x1="78" y1="68" x2="95" y2="66" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            <line x1="78" y1="70" x2="96" y2="70" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            <line x1="78" y1="72" x2="95" y2="74" stroke={palette.accent} strokeWidth="0.8" opacity="0.6" />
            {/* ほっぺ */}
            <ellipse cx="38" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            <ellipse cx="82" cy="72" rx="8" ry="5" fill={palette.cheek} opacity={cheekOpacity} />
            {/* 鼻 */}
            <ellipse cx="60" cy="68" rx="3" ry="2" fill={palette.accent} />
            {/* 口 */}
            <Mouth />
            {/* 長いしっぽ */}
            <path d="M 90 85 Q 105 75 110 60 Q 112 48 105 42" fill="none" stroke={palette.body} strokeWidth="6" strokeLinecap="round" />
          </>
        );

      case "squirrel":
        return (
          <>
            {/* 小さい丸耳 */}
            <ellipse cx="40" cy="38" rx="6" ry="7" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <ellipse cx="80" cy="38" rx="6" ry="7" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            <ellipse cx="40" cy="38" r="3" fill={palette.ear} />
            <ellipse cx="80" cy="38" r="3" fill={palette.ear} />
            {/* 大きくふわふわのしっぽ（右上に大きなカーブ） */}
            <path d="M 85 80 Q 110 65 108 42 Q 106 25 95 22 Q 82 20 85 35 Q 88 50 85 65 Z" fill={palette.body} stroke={palette.accent} strokeWidth="1" opacity="0.9" />
            {/* 小さめの体 */}
            <ellipse cx="60" cy="78" rx="28" ry="24" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            {/* お腹 */}
            <ellipse cx="60" cy="84" rx="15" ry="14" fill={palette.bodyLight} />
            {/* 目 */}
            <Eyes />
            {/* ぷっくりほっぺ（大きめ） */}
            <ellipse cx="36" cy="72" rx="10" ry="6.5" fill={palette.cheek} opacity={cheekOpacity} />
            <ellipse cx="84" cy="72" rx="10" ry="6.5" fill={palette.cheek} opacity={cheekOpacity} />
            {/* 鼻 */}
            <ellipse cx="60" cy="70" rx="3" ry="2" fill={palette.accent} />
            {/* 口 */}
            <Mouth />
            {/* 短い手を前に出す */}
            <path d="M 38 80 Q 32 85 34 90" stroke={palette.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M 82 80 Q 88 85 86 90" stroke={palette.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );

      case "owl":
        return (
          <>
            {/* サイドに小さな羽 */}
            <path d="M 22 72 Q 12 65 18 55 Q 24 60 28 68 Z" fill={palette.body} stroke={palette.accent} strokeWidth="1" />
            <path d="M 98 72 Q 108 65 102 55 Q 96 60 92 68 Z" fill={palette.body} stroke={palette.accent} strokeWidth="1" />
            {/* ずんぐり丸い体 */}
            <ellipse cx="60" cy="78" rx="34" ry="30" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
            {/* お腹 */}
            <ellipse cx="60" cy="86" rx="20" ry="19" fill={palette.bodyLight} />
            {/* 羽模様（V字のストローク） */}
            <path d="M 48 86 L 52 82 L 56 86" fill="none" stroke={palette.accent} strokeWidth="1" opacity="0.3" />
            <path d="M 56 90 L 60 86 L 64 90" fill="none" stroke={palette.accent} strokeWidth="1" opacity="0.3" />
            <path d="M 64 86 L 68 82 L 72 86" fill="none" stroke={palette.accent} strokeWidth="1" opacity="0.3" />
            {/* 耳（ツノのような飾り羽） */}
            <path d="M 38 40 Q 32 28 40 34" fill={palette.body} stroke={palette.accent} strokeWidth="1" />
            <path d="M 82 40 Q 88 28 80 34" fill={palette.body} stroke={palette.accent} strokeWidth="1" />
            {/* 大きな目 */}
            <Eyes />
            {/* くちばし */}
            <polygon points="57,72 63,72 60,78" fill={palette.accent} />
            {/* ほっぺ */}
            <ellipse cx="36" cy="72" rx="6.5" ry="4" fill={palette.cheek} opacity={cheekOpacity} />
            <ellipse cx="84" cy="72" rx="6.5" ry="4" fill={palette.cheek} opacity={cheekOpacity} />
          </>
        );

      default:
        return null;
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      style={{
        transform: `scale(${stageScale})${isHappy ? ' translateY(-2px)' : isSad ? ' rotate(2deg)' : ''}`,
      }}
    >
      <StageDecoration />
      <AnimalBody />
    </svg>
  );
}
