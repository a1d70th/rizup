import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

export async function GET(request: NextRequest) {
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get posts from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts } = await supabase.from("posts")
      .select("content, created_at, positivity_score")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });

    if (!posts || posts.length === 0) {
      return NextResponse.json({ weeklyTrend: [], topWords: [], overallScore: 0, changeMessage: null });
    }

    // Group by week and calculate scores
    const weeks: Record<string, { scores: number[]; contents: string[] }> = {};
    posts.forEach(p => {
      const d = new Date(p.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      if (!weeks[key]) weeks[key] = { scores: [], contents: [] };
      if (p.positivity_score != null) weeks[key].scores.push(p.positivity_score);
      weeks[key].contents.push(p.content);
    });

    // If we have pre-scored posts, use those
    const allScores = posts.filter(p => p.positivity_score != null).map(p => p.positivity_score as number);
    const overallScore = allScores.length > 0 ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length) : 50;

    const weeklyTrend = Object.entries(weeks).map(([week, data]) => ({
      week,
      score: data.scores.length > 0
        ? Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length)
        : 50,
    }));

    // Calculate change message
    let changeMessage: string | null = null;
    if (weeklyTrend.length >= 2) {
      const last = weeklyTrend[weeklyTrend.length - 1].score;
      const prev = weeklyTrend[weeklyTrend.length - 2].score;
      const diff = last - prev;
      if (diff > 5) changeMessage = `先週より${diff}%ポジティブな言葉が増えました`;
      else if (diff < -5) changeMessage = `先週より${Math.abs(diff)}%ポジティブ度が下がりました。無理しないでね`;
      else changeMessage = "先週と同じくらいのポジティブ度です";
    }

    // Top positive words (simple keyword count)
    const positiveWords = ["嬉しい", "楽しい", "感謝", "ありがとう", "最高", "幸せ", "頑張", "成長", "できた", "良い", "楽しかった", "嬉しかった", "すごい", "前向き", "がんばる"];
    const wordCounts: Record<string, number> = {};
    const allContent = posts.map(p => p.content).join(" ");
    positiveWords.forEach(w => {
      const count = (allContent.match(new RegExp(w, "g")) || []).length;
      if (count > 0) wordCounts[w] = count;
    });
    const topWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, count]) => ({ word, count }));

    // If Claude API available and no scores, analyze with Claude
    if (ANTHROPIC_API_KEY && allScores.length === 0 && posts.length > 0) {
      try {
        const sampleContent = posts.slice(-10).map(p => p.content).join("\n---\n");
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
            messages: [{ role: "user", content: `以下のジャーナル投稿のポジティブ度を0-100の数値1つだけで答えてください。数字のみ出力。\n\n${sampleContent}` }],
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const scoreText = data.content?.[0]?.text?.trim();
          const score = parseInt(scoreText);
          if (!isNaN(score) && score >= 0 && score <= 100) {
            return NextResponse.json({
              weeklyTrend: weeklyTrend.map(w => ({ ...w, score })),
              topWords,
              overallScore: score,
              changeMessage,
            });
          }
        }
      } catch { /* fallback to keyword-based */ }
    }

    return NextResponse.json({ weeklyTrend, topWords, overallScore, changeMessage });
  } catch (err) {
    console.error("[Word Analysis]", err);
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 });
  }
}
