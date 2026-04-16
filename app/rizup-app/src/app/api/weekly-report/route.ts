import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const FALLBACK = {
  mood_trend: "今週は、あなたなりのペースで積み重ねられた1週間だったね。",
  frequent_words: ["ありがとう", "今日", "がんばる"],
  strengths: ["続ける力", "自分を大切にする力"],
  next_week: "来週も、完璧じゃなくて大丈夫。小さな1歩を続けよう。",
};

type PostRow = { created_at: string; mood: number | null; content: string | null; type?: string };

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const userId: string | undefined = body.userId;
    if (!userId) {
      return NextResponse.json({ error: "userId required", ...FALLBACK }, { status: 400 });
    }

    // キャッシュ確認（24h 以内なら返却）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    try {
      const { data: prof } = await supabase.from("profiles")
        .select("weekly_report_cache, weekly_report_at").eq("id", userId).maybeSingle();
      if (prof?.weekly_report_cache && prof.weekly_report_at) {
        const age = Date.now() - new Date(prof.weekly_report_at).getTime();
        if (age < 24 * 60 * 60 * 1000) {
          return NextResponse.json({ ...prof.weekly_report_cache, cached: true });
        }
      }
    } catch { /* ignore */ }

    // 過去7日の posts
    const sevenAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts } = await supabase.from("posts")
      .select("created_at, mood, content, type")
      .eq("user_id", userId).gte("created_at", sevenAgo)
      .order("created_at", { ascending: true });

    if (!posts || posts.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    if (!ANTHROPIC_API_KEY) {
      // 最低限の統計返却
      const rows = posts as PostRow[];
      const avg = rows.reduce((s, p) => s + (p.mood || 0), 0) / rows.length;
      return NextResponse.json({
        ...FALLBACK,
        mood_trend: `今週の気分は平均 ${avg.toFixed(1)}/5。${avg >= 3.5 ? "前向きな日が多かったみたい🌱" : "少し疲れていた週かも。休もう"}`,
      });
    }

    const digest = (posts as PostRow[])
      .map(p => `- [${p.type || "?"}] 気分${p.mood ?? "-"}/5: ${(p.content || "").slice(0, 120)}`)
      .join("\n");

    const prompt = `あなたはRizupアプリの相棒コーチ「Rizup」です。ユーザーの過去7日のジャーナルを、やさしい日本語で分析してください。

ジャーナル：
${digest}

以下の JSON 形式で返してください。前後の説明は一切なし。
{
  "mood_trend": "今週の気分傾向（50字前後・共感的に）",
  "frequent_words": ["よく出た単語3つ"],
  "strengths": ["今週見えた強み2〜3個（動詞で）"],
  "next_week": "来週のあなたへ一言（温かく・50字前後）"
}`;

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

    if (!response.ok) return NextResponse.json(FALLBACK);

    const data = await response.json();
    const text: string = data.content?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json(FALLBACK);

    try {
      const parsed = JSON.parse(match[0]);
      const result = {
        mood_trend: typeof parsed.mood_trend === "string" ? parsed.mood_trend : FALLBACK.mood_trend,
        frequent_words: Array.isArray(parsed.frequent_words) ? parsed.frequent_words.slice(0, 5) : FALLBACK.frequent_words,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : FALLBACK.strengths,
        next_week: typeof parsed.next_week === "string" ? parsed.next_week : FALLBACK.next_week,
      };
      // キャッシュ
      try {
        await supabase.from("profiles").update({
          weekly_report_cache: result,
          weekly_report_at: new Date().toISOString(),
        }).eq("id", userId);
      } catch { /* ignore */ }
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(FALLBACK);
    }
  } catch (e) {
    console.error("[weekly-report]", e);
    return NextResponse.json(FALLBACK);
  }
}
