import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const horizonLabels: Record<string, string> = {
  final: "最終ゴール",
  "3year": "3年後の目標",
  "1year": "1年後の目標",
  monthly: "今月の目標",
};

const categoryLabels: Record<string, string> = {
  work: "仕事", money: "お金", health: "健康",
  relationship: "人間関係", growth: "自己成長", other: "その他",
};

export async function POST(request: Request) {
  try {
    const { title, description, category, time_horizon, progress } = await request.json();

    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ feedback: "目標を設定できたこと自体がすごいことだよ。一歩ずつ進んでいこう！" });
    }

    const prompt = `あなたはRizupアプリのキャラクター「Sho」です。ユーザーの目標に対して具体的なアドバイスを日本語150文字以内で返してください。

目標情報：
- タイプ：${horizonLabels[time_horizon] || time_horizon}
- カテゴリ：${categoryLabels[category] || category}
- タイトル：${title}
- 詳細：${description || "なし"}
- 現在の進捗：${progress}%

条件：
- 友達のように話す（敬語なし）
- 具体的な次のアクションを1つ提案する
- 進捗${progress}%に合わせたトーン（0%なら最初の一歩を応援、50%以上なら称えつつ次へ、80%以上なら完走を応援）
- 前向きで温かいトーン
- テキストのみ出力（装飾なし）`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ feedback: "この目標、いい方向に向かってるよ。今日できる小さな一歩から始めよう！" });
    }

    const data = await response.json();
    const feedback = data.content?.[0]?.text || "目標に向かって進んでいること自体がすごい。一緒に頑張ろう！";

    return NextResponse.json({ feedback });
  } catch {
    return NextResponse.json({ feedback: "夢を言葉にできたあなたは、もう前に進んでるよ。応援してる！" });
  }
}
