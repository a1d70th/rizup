import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function POST(request: Request) {
  try {
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ safe: true });
    }

    if (!ANTHROPIC_API_KEY) {
      // No API key — allow all posts (cannot moderate)
      return NextResponse.json({ safe: true });
    }

    const prompt = `あなたはコミュニティの安全を守るモデレーターです。以下の投稿内容を確認してください。

■ 判定基準（NGとする内容）
- 誹謗中傷・差別的表現
- 性的に不適切な内容
- 暴力的・脅迫的な内容
- スパム・詐欺・勧誘
- 個人情報の公開
- 自傷・自殺を助長する内容

■ OKとする内容
- ネガティブな感情の表現（辛い、悲しい等）はOK
- 愚痴や不満はOK（攻撃的でなければ）
- 日常の記録はすべてOK

■ 投稿内容
${content}

■ 出力（JSONのみ、装飾なし）
{"safe": true} または {"safe": false, "reason": "理由を20字以内で"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      // API error — allow post (fail open)
      return NextResponse.json({ safe: true });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Extract JSON from response
    const match = text.match(/\{[^}]+\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      return NextResponse.json({ safe: !!result.safe, reason: result.reason || "" });
    }

    return NextResponse.json({ safe: true });
  } catch (err) {
    console.error("[Moderate API]", err);
    return NextResponse.json({ safe: true });
  }
}
