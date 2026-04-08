import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(request: Request) {
  try {
    const { postId, content } = await request.json();
    if (!postId || !content) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Simple keyword-based scoring as fallback
    const positiveWords = ["嬉しい", "楽しい", "感謝", "ありがとう", "最高", "幸せ", "頑張", "成長", "できた", "良い", "前向き", "がんばる", "希望", "素敵"];
    const negativeWords = ["つらい", "辛い", "不安", "疲れ", "しんどい", "嫌", "悲しい", "できない", "ダメ", "無理", "苦しい"];

    let score = 50; // neutral default

    if (ANTHROPIC_API_KEY) {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 10,
            messages: [{ role: "user", content: `この日記のポジティブ度を0-100の数値1つだけで答えて。数字のみ。\n\n${content}` }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const parsed = parseInt(data.content?.[0]?.text?.trim());
          if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) score = parsed;
        }
      } catch { /* fallback to keyword */ }
    }

    // Keyword fallback if API didn't produce a result
    if (score === 50 && !ANTHROPIC_API_KEY) {
      let posCount = 0;
      let negCount = 0;
      positiveWords.forEach(w => { if (content.includes(w)) posCount++; });
      negativeWords.forEach(w => { if (content.includes(w)) negCount++; });
      const total = posCount + negCount;
      if (total > 0) score = Math.round((posCount / total) * 100);
    }

    await supabase.from("posts").update({ positivity_score: score }).eq("id", postId);

    return NextResponse.json({ score });
  } catch (err) {
    console.error("[Positivity Score]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
