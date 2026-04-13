"use client";
import { useEffect, useState } from "react";

interface Piece {
  id: number;
  left: number;
  delay: number;
  color: string;
  emoji?: string;
}

const COLORS = ["#6ecbb0", "#f4976c", "#5ab89d", "#fbbf24", "#34d399"];

export default function Confetti({ trigger }: { trigger: unknown }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (trigger == null || trigger === false) return;
    const next: Piece[] = Array.from({ length: 24 }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.2,
      color: COLORS[i % COLORS.length],
      emoji: i % 6 === 0 ? "🎉" : undefined,
    }));
    setPieces(next);
    const t = setTimeout(() => setPieces([]), 1200);
    return () => clearTimeout(t);
  }, [trigger]);

  if (pieces.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {pieces.map(p => (
        <div key={p.id}
          className="absolute top-[40%] animate-confetti"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            fontSize: p.emoji ? "18px" : "12px",
          }}>
          {p.emoji || (
            <div style={{
              width: 10, height: 14,
              background: p.color,
              borderRadius: 2,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
