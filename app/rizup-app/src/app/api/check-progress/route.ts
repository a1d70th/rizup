import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// 連続投稿（streak）と「3ヶ月前の成長の手紙」のみ扱う。
// バッジ・MVP・ランキングは廃止済み。
export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`progress_${ip}`, 10, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = user.id;

    const toJSTDate = (d: Date | string): string => {
      const date = typeof d === "string" ? new Date(d) : d;
      return date.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit",
      }).replace(/\//g, "-");
    };

    // ── streak 計算（JST基準） ──
    const { data: recentPosts } = await supabase.from("posts")
      .select("created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(120);

    let streak = 0;
    if (recentPosts && recentPosts.length > 0) {
      const postDates = new Set(recentPosts.map(p => toJSTDate(p.created_at)));
      const todayJST = toJSTDate(new Date());
      const checkDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      for (let i = 0; i < 120; i++) {
        const dateStr = toJSTDate(checkDate);
        if (postDates.has(dateStr)) streak++;
        else if (dateStr === todayJST) { /* 今日未投稿は継続 */ }
        else break;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
    await supabase.from("profiles").update({ streak }).eq("id", userId);

    // ── 3ヶ月前の成長の手紙 ──
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const letterDateStr = threeMonthsAgo.toISOString().split("T")[0];

    const { data: oldPost } = await supabase.from("posts")
      .select("content, mood, created_at").eq("user_id", userId)
      .gte("created_at", `${letterDateStr}T00:00:00`)
      .lt("created_at", `${letterDateStr}T23:59:59`)
      .limit(1).maybeSingle();

    let growthLetter: string | null = null;
    if (oldPost) {
      const { count: alreadySent } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId).eq("type", "growth_letter")
        .gte("created_at", new Date().toISOString().split("T")[0]);
      if (!alreadySent) {
        growthLetter = `3ヶ月前の今日、あなたはこう書いていました：「${oldPost.content.slice(0, 80)}${oldPost.content.length > 80 ? "…" : ""}」 あの頃から今のあなたへ、成長を感じてね。`;
        await supabase.from("notifications").insert({
          user_id: userId, type: "growth_letter", content: growthLetter,
        });
      }
    }

    return NextResponse.json({ streak, growthLetter });
  } catch (err) {
    console.error("[Check Progress]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
