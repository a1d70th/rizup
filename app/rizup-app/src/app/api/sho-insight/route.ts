import { NextResponse } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const seasons: Record<number, string> = { 0: "冬", 1: "冬", 2: "春", 3: "春", 4: "春", 5: "夏", 6: "夏", 7: "夏", 8: "秋", 9: "秋", 10: "秋", 11: "冬" };
const weekdays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export async function POST(request: Request) {
  try {
    const { zodiac, birthday, rizupType, mbti } = await request.json();

    const now = new Date();
    const season = seasons[now.getMonth()];
    const weekday = weekdays[now.getDay()];

    // Fallback if no API key
    if (!ANTHROPIC_API_KEY) {
      const fallbacks = [
        `${weekday}の朝。${season}の空気を感じながら、今日も自分のペースで前に進もう。`,
        `おはよう。今日は${weekday}。新しい1日の始まり。完璧じゃなくていいから、1つだけやってみよう。`,
        `${season}の${weekday}。あなたが今日ここに来てくれたこと、それだけで十分すごいことだよ。`,
      ];
      return NextResponse.json({
        insight: fallbacks[now.getDate() % fallbacks.length],
      });
    }

    const prompt = `あなたは「Sho」というキャラクターです。Rizupアプリで毎朝ユーザーに届けるパーソナライズメッセージを1つ生成してください。

■ Shoの人格
- 丸くてかわいい、不完全で親しみやすい
- 友達のように話す（敬語なし）
- 絶対に否定しない
- 小さな変化を見逃さない

■ ユーザー情報
- 星座：${zodiac || "不明"}
- 生年月日：${birthday || "不明"}
- Rizupタイプ：${rizupType || "不明"}
- MBTI：${mbti && mbti !== "unknown" ? mbti : "不明"}
- 今日の曜日：${weekday}
- 季節：${season}

■ ルール
1. 80〜120字以内
2. 星座・Rizupタイプ・MBTIの特性を自然に織り込む（「○○座のあなたは〜」ではなく、さりげなく）
3. 今日の曜日・季節に合った内容
4. 具体的なアクション提案を1つ含める
5. 占いではなく「今日のヒント」として語る
6. 昨日と同じ内容にならないようにする

メッセージのみを出力してください（装飾なし）。`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Sho Insight API] Claude error:", err);
      return NextResponse.json({ insight: `${weekday}の朝。今日も自分のペースで前に進もう。あなたの味方だよ。` });
    }

    const data = await response.json();
    const insight = data.content?.[0]?.text || `${weekday}の朝。今日も自分のペースで前に進もう。`;

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[Sho Insight API] Error:", err);
    return NextResponse.json({ insight: "おはよう。今日も一緒にいるよ。あなたの味方だから。" });
  }
}
