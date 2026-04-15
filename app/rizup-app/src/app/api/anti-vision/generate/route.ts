import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface Vision { title: string; category?: string; time_horizon?: string; }

const FALLBACK: string[] = [
  "毎日を惰性で消費して、夢を口にしなくなった自分",
  "挑戦する前から諦めて、言い訳ばかりしている自分",
  "体も心も疲れ切って、周りの人を大切にできない自分",
  "お金にも時間にも追われて、本当にやりたいことが分からなくなった自分",
  "5年経っても今と何も変わっていない自分",
];

export async function POST(request: Request) {
  try {
    const { visions } = await request.json();
    if (!Array.isArray(visions) || visions.length === 0) {
      return NextResponse.json({ items: FALLBACK });
    }

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ items: FALLBACK });
    }

    const visionLines = (visions as Vision[]).slice(0, 10).map((v, i) =>
      `${i + 1}. ${v.title}${v.category ? `（${v.category}）` : ""}`
    ).join("\n");

    const prompt = `あなたはRizupアプリのコーチ「Rizup」です。ユーザーのビジョン（目標・理想の未来）の「裏返し」として、5年後に絶対になりたくない自分＝アンチビジョンを5つ日本語で生成してください。

ユーザーのビジョン：
${visionLines}

条件：
- 5つちょうど出力（多すぎず少なすぎず）
- 各項目は30〜80文字、一人称「自分」視点
- 否定的だが過度に暗すぎない、現実的で刺さる表現
- 各項目はそれぞれ違う角度（習慣・人間関係・お金・健康・心の状態など）で
- 出力は配列形式の JSON のみ。前後の説明文・装飾は一切なし。
- 例： ["...", "...", "...", "...", "..."]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ items: FALLBACK });
    }

    const data = await response.json();
    const text: string = data.content?.[0]?.text || "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ items: FALLBACK });
    try {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr) && arr.every(s => typeof s === "string") && arr.length >= 3) {
        return NextResponse.json({ items: arr.slice(0, 5) });
      }
    } catch { /* fall through */ }
    return NextResponse.json({ items: FALLBACK });
  } catch {
    return NextResponse.json({ items: FALLBACK });
  }
}
