import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const FALLBACKS = [
  "続ける力",
  "自分と向き合う力",
  "感謝を言葉にする力",
  "ちゃんと休める力",
  "小さく始める力",
];

export async function POST(request: Request) {
  try {
    const { content, mood } = await request.json().catch(() => ({}));
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ strength: null });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ strength: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    }

    const prompt = `Rizupアプリのコーチとして、以下のジャーナル本文から「ユーザーの強み」を1つだけ、6〜12文字の短い日本語で抽出してください。
- 動詞＋"力" の形式（例：続ける力、気づく力、受け止める力）
- 本文にない美辞麗句は使わない
- JSON のみで {"strength":"..."} と返す

本文（気分${mood ?? "-"}/5）：
${content.slice(0, 400)}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 80,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ strength: FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] });
    }
    const data = await response.json();
    const text: string = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ strength: FALLBACKS[0] });
    try {
      const parsed = JSON.parse(match[0]);
      const s = typeof parsed.strength === "string" ? parsed.strength.slice(0, 14) : null;
      return NextResponse.json({ strength: s || FALLBACKS[0] });
    } catch {
      return NextResponse.json({ strength: FALLBACKS[0] });
    }
  } catch (e) {
    console.error("[strength-detect]", e);
    return NextResponse.json({ strength: FALLBACKS[0] });
  }
}
