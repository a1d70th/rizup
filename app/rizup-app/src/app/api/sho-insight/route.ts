import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const seasons: Record<number, string> = { 0: "冬", 1: "冬", 2: "春", 3: "春", 4: "春", 5: "夏", 6: "夏", 7: "夏", 8: "秋", 9: "秋", 10: "秋", 11: "冬" };
const weekdays = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];

export async function POST(request: NextRequest) {
  try {
    const { zodiac, rizupType, mbti, name, birthday, generateTypeDesc } = await request.json();

    const now = new Date();
    const season = seasons[now.getMonth()];
    const weekday = weekdays[now.getDay()];

    // ── Type description for onboarding result ──
    if (generateTypeDesc && ANTHROPIC_API_KEY) {
      try {
        const birthMonth = birthday ? new Date(birthday).getMonth() + 1 : null;
        const descPrompt = `あなたはRizupアプリの性格分析AIです。以下の組み合わせから、その人だけの特徴を日本語100〜150文字で生成してください。

星座：${zodiac || "不明"}
${birthMonth ? `誕生月：${birthMonth}月` : ""}
Rizupタイプ：${rizupType || "不明"}
${mbti ? `MBTI：${mbti}` : ""}

条件：
- 「あなたは〜」で始める
- 強みと伸びしろを1つずつ含める
- 前向きで温かいトーン
- 占いではなく性格分析として書く
- テキストのみ出力（装飾なし）`;

        const descRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 300, messages: [{ role: "user", content: descPrompt }] }),
        });
        if (descRes.ok) {
          const descData = await descRes.json();
          const typeDesc = descData.content?.[0]?.text;
          if (typeDesc) return NextResponse.json({ typeDesc });
        }
      } catch (e) { console.error("[Rizup Insight] TypeDesc error:", e); }
      return NextResponse.json({ typeDesc: null });
    }

    // ── Fetch recent mood & sleep data from DB ──
    let moodAvg: number | null = null;
    let sleepAvg: number | null = null;

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll(); },
            setAll() {},
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Mood average (last 7 days)
        const { data: moodPosts } = await supabase.from("posts")
          .select("mood")
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo);

        if (moodPosts && moodPosts.length > 0) {
          const total = moodPosts.reduce((s, p) => s + p.mood, 0);
          moodAvg = Math.round((total / moodPosts.length) * 10) / 10;
        }

        // Sleep average (last 7 days — extracted from post content)
        const { data: sleepPosts } = await supabase.from("posts")
          .select("content")
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo)
          .like("content", "%昨夜の睡眠%");

        if (sleepPosts && sleepPosts.length > 0) {
          const hours: number[] = [];
          sleepPosts.forEach(p => {
            const match = p.content.match(/昨夜の睡眠：([\d.]+)時間/);
            if (match) hours.push(parseFloat(match[1]));
          });
          if (hours.length > 0) {
            sleepAvg = Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 10) / 10;
          }
        }
      }
    } catch (e) {
      console.error("[Rizup Insight] DB fetch error (non-fatal):", e);
    }

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

    const moodText = moodAvg !== null ? `${moodAvg}/5` : "データなし";
    const sleepText = sleepAvg !== null ? `${sleepAvg}時間` : "データなし";

    const prompt = `あなたはRizupのキャラクター「Sho」です。
以下のユーザー情報を基に、今日だけの完全パーソナライズされた前向きなメッセージを日本語で100文字以内で生成してください。

ユーザー情報：
- 名前：${name || "ユーザー"}
- MBTIタイプ：${mbti && mbti !== "unknown" ? mbti : "不明"}
- 星座：${zodiac || "不明"}
- Rizupタイプ：${rizupType || "不明"}
- 今日：${weekday}・${season}
- 最近7日の気分平均：${moodText}
- 最近の睡眠時間平均：${sleepText}

条件：
- MBTIの特性を自然に反映させる
- 気分が低い場合は励ます・高い場合は称える
- 睡眠が少ない場合は休息を促す
- 占いっぽく・でも科学的根拠があるように
- 毎日違う内容になるよう曜日テーマを活用
- 押しつけがましくない温かいトーン
- 友達のように話す（敬語なし）
- 絶対に否定しない

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
      console.error("[Rizup Insight API] Claude error:", err);
      return NextResponse.json({ insight: `${weekday}の朝。今日も自分のペースで前に進もう。あなたの味方だよ。` });
    }

    const data = await response.json();
    const insight = data.content?.[0]?.text || `${weekday}の朝。今日も自分のペースで前に進もう。`;

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[Rizup Insight API] Error:", err);
    return NextResponse.json({ insight: "おはよう。今日も一緒にいるよ。あなたの味方だから。" });
  }
}
