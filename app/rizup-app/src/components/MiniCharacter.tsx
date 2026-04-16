"use client";
import { AnimalKind } from "./MyCharacter";

interface Props {
  animal?: AnimalKind | null;
  size?: number; // default 24
}

const FACE_COLORS: Record<AnimalKind, { bg: string; accent: string }> = {
  rabbit:   { bg: "#f5ede3", accent: "#c4a882" },
  raccoon:  { bg: "#c8c0b4", accent: "#6b5b4e" },
  cat:      { bg: "#fce0c8", accent: "#e8a060" },
  squirrel: { bg: "#d4a070", accent: "#8b5e3c" },
  owl:      { bg: "#c8b898", accent: "#7a6848" },
};

export default function MiniCharacter({ animal = "rabbit", size = 24 }: Props) {
  const colors = FACE_COLORS[animal || "rabbit"];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="rounded-full">
      <circle cx="12" cy="12" r="12" fill={colors.bg} />
      {/* 目 */}
      <circle cx="9" cy="11" r="1.5" fill="#3a3a3a" />
      <circle cx="15" cy="11" r="1.5" fill="#3a3a3a" />
      <circle cx="9.3" cy="10.7" r="0.5" fill="#fff" />
      <circle cx="15.3" cy="10.7" r="0.5" fill="#fff" />
      {/* ほっぺ */}
      <circle cx="6.5" cy="14" r="2" fill="#ffb6c1" opacity="0.3" />
      <circle cx="17.5" cy="14" r="2" fill="#ffb6c1" opacity="0.3" />
      {/* 口 */}
      <path d="M 10 15 Q 12 17 14 15" stroke={colors.accent} strokeWidth="0.8" fill="none" strokeLinecap="round" />
      {/* 動物ごとの特徴 */}
      {animal === "rabbit" && (
        <>
          <ellipse cx="8" cy="2" rx="2" ry="5" fill={colors.bg} stroke={colors.accent} strokeWidth="0.5" />
          <ellipse cx="16" cy="2" rx="2" ry="5" fill={colors.bg} stroke={colors.accent} strokeWidth="0.5" />
        </>
      )}
      {animal === "cat" && (
        <>
          <polygon points="4,4 8,0 10,6" fill={colors.bg} stroke={colors.accent} strokeWidth="0.5" />
          <polygon points="20,4 16,0 14,6" fill={colors.bg} stroke={colors.accent} strokeWidth="0.5" />
        </>
      )}
      {animal === "owl" && (
        <>
          <circle cx="9" cy="11" r="3" fill="none" stroke={colors.accent} strokeWidth="0.5" />
          <circle cx="15" cy="11" r="3" fill="none" stroke={colors.accent} strokeWidth="0.5" />
        </>
      )}
    </svg>
  );
}
