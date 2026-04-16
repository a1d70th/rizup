"use client";
import { useState, useMemo } from "react";

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
  if (streak <= 0) return 1;
  if (streak <= 3) return 2;
  if (streak <= 14) return 3;
  if (streak <= 29) return 4;
  if (streak <= 59) return 5;
  if (streak <= 99) return 6;
  return 7;
}

const STAGE_MESSAGES: Record<number, string> = {
  1: "まだ生まれていないよ。今日書くと孵るかも🥚",
  2: "生まれたよ！一緒にいるね🌱",
  3: "だんだん大きくなってきたよ✨",
  4: "村ができたよ！仲間が来るかも🏡",
  5: "村が賑やかになってきたね🌸",
  6: "あなたは村長だよ。みんなが頼りにしてる🌳",
  7: "この村はあなたが作った。すごいよ🌟",
};

const STAGE_LABELS: Record<number, string> = {
  1: "たまご",
  2: "あかちゃん",
  3: "こども",
  4: "おとな",
  5: "村びと",
  6: "村長",
  7: "伝説",
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
  const map: Record<string, string[]> = {
    morning: [
      `おはよう🌞 ${n}はもう起きてたよ`,
      `今日はどんな日にする？${n}は楽しみ`,
      `朝の空気、気持ちいいね🌿`,
    ],
    day: [
      `${n}も日向ぼっこ中☀️`,
      `ちょっと休憩する？`,
      `今日の1歩、どう進んでる？`,
    ],
    evening: [
      `おつかれさま🌙 ${n}も今日はよく頑張ったね`,
      `今日のいいこと、1つだけ教えて`,
      `ゆっくりしよう。夜はもう少し`,
    ],
    deep: [
      `まだ起きてるの？${n}も一緒だよ🌙`,
      `夜は考えすぎないでね。明日話そう`,
      `深呼吸して、あったかくして寝よう💤`,
    ],
  };
  const list = map[tod] || map.day;
  return list[new Date().getDate() % list.length];
}

function wroteToday(last: Date | null | undefined): boolean {
  if (!last) return false;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  const lastJst = new Date(last).toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
  return today === lastJst;
}

// 動物別のカラーパレット（ミント系・自然風）
const PALETTE: Record<AnimalKind, { body: string; belly: string; accent: string; cheek: string }> = {
  rabbit:   { body: "#d4e8dd", belly: "#f5fbf7", accent: "#6ecbb0", cheek: "#f4976c" },
  raccoon:  { body: "#b7c9c0", belly: "#f5fbf7", accent: "#5a7368", cheek: "#f4976c" },
  cat:      { body: "#e9d6c0", belly: "#fdf7ef", accent: "#f4976c", cheek: "#e17a63" },
  squirrel: { body: "#d9a87a", belly: "#fdf2e4", accent: "#a66a3d", cheek: "#f4976c" },
  owl:      { body: "#c0b39c", belly: "#f5eeda", accent: "#6e5a45", cheek: "#f4976c" },
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
  const stage = stageOf(streak);
  const palette = PALETTE[animal || "rabbit"];
  const tod = useMemo(() => timeOfDay(), []);
  const wrote = wroteToday(lastWritten);
  const isHappy = mood === 'good' || (mood === 'neutral' && wrote);
  const isSad = mood === 'bad';
  const charName = name || "相棒";

  const tapMsg = useMemo(() => timeMessage(charName, tod), [charName, tod]);
  const baseMsg = isSad
    ? `そばにいるよ。${charName}はずっと一緒だよ🌿`
    : isHappy
      ? `今日もありがとう、${charName}がジャンプしてるよ✨`
      : lastWritten
        ? `おかえり、${charName}は待ってたよ🌿`
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
          <EggSvg size={size} palette={palette} />
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

      <div className="mt-2 text-center">
        <p className="text-[11px] font-extrabold text-mint">
          {charName !== "相棒" ? charName : "名前をつけてね"}
          <span className="ml-1 text-[10px] text-text-light font-bold">・{STAGE_LABELS[stage]}</span>
        </p>
      </div>

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

function EggSvg({ size, palette }: { size: number; palette: { accent: string } }) {
  const r = size;
  return (
    <svg width={r} height={r} viewBox="0 0 100 100">
      <defs>
        <radialGradient id="egg-g" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={palette.accent} stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="55" rx="26" ry="34" fill="url(#egg-g)" stroke={palette.accent} strokeWidth="1.5" />
      <ellipse cx="42" cy="45" rx="4" ry="6" fill="#ffffff" opacity="0.8" />
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
  palette: { body: string; belly: string; accent: string; cheek: string };
  isHappy: boolean;
  isSad: boolean;
  stage: number;
}) {
  // stage に応じてサイズを少し変える（2=小、3=中、4+=大）
  const scale = stage === 2 ? 0.85 : stage === 3 ? 0.92 : 1;
  const eyeY = isHappy ? 42 : 44;
  const mouth = isHappy
    ? <path d="M 45 58 Q 50 64 55 58" stroke={palette.accent} strokeWidth="2" fill="none" strokeLinecap="round" />
    : isSad
      ? <path d="M 46 57 Q 50 59 54 57" stroke={palette.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      : <path d="M 46 58 Q 50 61 54 58" stroke={palette.accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `scale(${scale})${isHappy ? ' translateY(-2px)' : isSad ? ' rotate(2deg)' : ''}` }}>
      <defs>
        <radialGradient id={`body-${animal}`} cx="50%" cy="60%" r="55%">
          <stop offset="0%" stopColor={palette.belly} />
          <stop offset="60%" stopColor={palette.body} />
          <stop offset="100%" stopColor={palette.accent} stopOpacity="0.4" />
        </radialGradient>
      </defs>

      {/* Ears / accessory depending on animal */}
      {animal === "rabbit" && (
        <>
          <ellipse cx="36" cy="22" rx="5" ry="14" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <ellipse cx="64" cy="22" rx="5" ry="14" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <ellipse cx="36" cy="24" rx="2" ry="8" fill={palette.cheek} opacity="0.4" />
          <ellipse cx="64" cy="24" rx="2" ry="8" fill={palette.cheek} opacity="0.4" />
        </>
      )}
      {animal === "raccoon" && (
        <>
          <polygon points="32,24 40,10 44,28" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <polygon points="68,24 60,10 56,28" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
        </>
      )}
      {animal === "cat" && (
        <>
          <polygon points="30,22 38,6 44,26" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <polygon points="70,22 62,6 56,26" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <polygon points="34,22 38,14 42,24" fill={palette.cheek} opacity="0.5" />
          <polygon points="66,22 62,14 58,24" fill={palette.cheek} opacity="0.5" />
        </>
      )}
      {animal === "squirrel" && (
        <>
          <ellipse cx="34" cy="18" rx="4" ry="6" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <ellipse cx="66" cy="18" rx="4" ry="6" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          {/* big fluffy tail */}
          <path d="M 80 55 Q 95 40 88 70 Q 82 85 70 70" fill={palette.body} stroke={palette.accent} strokeWidth="1.5" />
        </>
      )}
      {animal === "owl" && (
        <>
          <polygon points="28,24 34,12 40,26" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
          <polygon points="72,24 66,12 60,26" fill={palette.body} stroke={palette.accent} strokeWidth="1.2" />
        </>
      )}

      {/* Body */}
      <ellipse cx="50" cy="62" rx="28" ry="30" fill={`url(#body-${animal})`} stroke={palette.accent} strokeWidth="1.5" />
      {/* Belly */}
      <ellipse cx="50" cy="70" rx="18" ry="18" fill={palette.belly} />

      {/* Owl face discs */}
      {animal === "owl" && (
        <>
          <circle cx="42" cy={eyeY} r="8" fill={palette.belly} stroke={palette.accent} strokeWidth="1" />
          <circle cx="58" cy={eyeY} r="8" fill={palette.belly} stroke={palette.accent} strokeWidth="1" />
        </>
      )}

      {/* Eyes */}
      {isHappy ? (
        <>
          <path d={`M 38 ${eyeY - 1} Q 42 ${eyeY + 3} 46 ${eyeY - 1}`} stroke={palette.accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <path d={`M 54 ${eyeY - 1} Q 58 ${eyeY + 3} 62 ${eyeY - 1}`} stroke={palette.accent} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </>
      ) : isSad ? (
        <>
          <circle cx="42" cy={eyeY} r="3" fill={palette.accent} />
          <circle cx="58" cy={eyeY} r="3" fill={palette.accent} />
          <circle cx="43" cy={eyeY - 1} r="1.2" fill="#ffffff" />
          <circle cx="59" cy={eyeY - 1} r="1.2" fill="#ffffff" />
        </>
      ) : (
        <>
          <circle cx="42" cy={eyeY} r="2.4" fill={palette.accent} />
          <circle cx="58" cy={eyeY} r="2.4" fill={palette.accent} />
          <circle cx="42.8" cy={eyeY - 0.8} r="0.8" fill="#ffffff" />
          <circle cx="58.8" cy={eyeY - 0.8} r="0.8" fill="#ffffff" />
        </>
      )}

      {/* Cheeks */}
      <circle cx="36" cy="52" r="3" fill={palette.cheek} opacity="0.45" />
      <circle cx="64" cy="52" r="3" fill={palette.cheek} opacity="0.45" />

      {/* Nose / beak */}
      {animal === "owl" ? (
        <polygon points="48,52 52,52 50,58" fill={palette.accent} />
      ) : (
        <ellipse cx="50" cy="53" rx="2" ry="1.5" fill={palette.accent} />
      )}

      {/* Mouth */}
      {mouth}

      {/* Stage 5+ : small crown/leaf for village/elder */}
      {stage >= 5 && (
        <g>
          <path d="M 44 14 L 50 8 L 56 14 L 54 20 L 46 20 Z" fill={palette.cheek} stroke={palette.accent} strokeWidth="1" />
        </g>
      )}
      {stage >= 7 && (
        <g>
          <circle cx="20" cy="20" r="2" fill={palette.cheek} />
          <circle cx="80" cy="22" r="1.5" fill={palette.cheek} />
          <circle cx="12" cy="60" r="1.5" fill={palette.cheek} />
          <circle cx="88" cy="60" r="2" fill={palette.cheek} />
        </g>
      )}
    </svg>
  );
}
