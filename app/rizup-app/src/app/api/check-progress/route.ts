import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`progress_${ip}`, 10, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
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

    const userId = user.id;

    // ── 1. Accurate streak calculation ──
    const { data: recentPosts } = await supabase.from("posts")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    let streak = 0;
    if (recentPosts && recentPosts.length > 0) {
      // Get unique dates (JST-ish: use local date string)
      const postDates = new Set(
        recentPosts.map(p => new Date(p.created_at).toISOString().split("T")[0])
      );
      const today = new Date().toISOString().split("T")[0];
      const checkDate = new Date();

      // Check from today backwards
      for (let i = 0; i < 100; i++) {
        const dateStr = checkDate.toISOString().split("T")[0];
        if (postDates.has(dateStr)) {
          streak++;
        } else if (dateStr === today) {
          // Today hasn't been posted yet — don't break, check yesterday
        } else {
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    await supabase.from("profiles").update({ streak }).eq("id", userId);

    // ── 2. Badge auto-granting ──
    const { data: existingBadges } = await supabase.from("badges")
      .select("type").eq("user_id", userId);
    const hasBadge = new Set((existingBadges || []).map(b => b.type));
    const newBadges: string[] = [];

    // Total posts
    const { count: totalPosts } = await supabase.from("posts")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);

    if ((totalPosts || 0) >= 1 && !hasBadge.has("first_post")) newBadges.push("first_post");
    if ((totalPosts || 0) >= 100 && !hasBadge.has("posts_100")) newBadges.push("posts_100");

    // Streak badges
    if (streak >= 7 && !hasBadge.has("streak_7")) newBadges.push("streak_7");
    if (streak >= 30 && !hasBadge.has("streak_30")) newBadges.push("streak_30");

    // Total comments made
    const { count: totalComments } = await supabase.from("comments")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((totalComments || 0) >= 50 && !hasBadge.has("comments_50")) newBadges.push("comments_50");

    // Total reactions given
    const { count: totalReactions } = await supabase.from("reactions")
      .select("id", { count: "exact", head: true }).eq("user_id", userId);
    if ((totalReactions || 0) >= 100 && !hasBadge.has("reactions_100")) newBadges.push("reactions_100");

    // Insert new badges
    if (newBadges.length > 0) {
      await supabase.from("badges").insert(
        newBadges.map(type => ({ user_id: userId, type }))
      );
      // Notify user about new badges
      const badgeLabels: Record<string, string> = {
        first_post: "🌱 初投稿", streak_7: "🔥 7日連続", streak_30: "💎 30日連続",
        posts_100: "📝 100投稿", comments_50: "💬 励ましの達人", reactions_100: "❤️ 応援王",
      };
      for (const b of newBadges) {
        await supabase.from("notifications").insert({
          user_id: userId, type: "badge",
          content: `新しいバッジを獲得しました！ ${badgeLabels[b] || b}`,
        });
      }
    }

    // ── 3. Growth letter (3 months ago) ──
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const letterDateStr = threeMonthsAgo.toISOString().split("T")[0];

    const { data: oldPost } = await supabase.from("posts")
      .select("content, mood, created_at")
      .eq("user_id", userId)
      .gte("created_at", `${letterDateStr}T00:00:00`)
      .lt("created_at", `${letterDateStr}T23:59:59`)
      .limit(1)
      .single();

    let growthLetter: string | null = null;
    if (oldPost) {
      // Check if already sent today
      const { count: alreadySent } = await supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("type", "growth_letter")
        .gte("created_at", new Date().toISOString().split("T")[0]);

      if (!alreadySent || alreadySent === 0) {
        growthLetter = `3ヶ月前の今日、あなたはこう書いていました：「${oldPost.content.slice(0, 80)}${oldPost.content.length > 80 ? "..." : ""}」 — あの頃から今のあなたへ。成長を感じてね。`;
        await supabase.from("notifications").insert({
          user_id: userId, type: "growth_letter", content: growthLetter,
        });
      }
    }

    // ── 4. Unreacted comment notification (24h) ──
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: myPosts } = await supabase.from("posts")
      .select("id").eq("user_id", userId).limit(20);

    if (myPosts && myPosts.length > 0) {
      const postIds = myPosts.map(p => p.id);
      const { data: unrepliedComments } = await supabase.from("comments")
        .select("id, post_id, created_at")
        .in("post_id", postIds)
        .neq("user_id", userId)
        .lt("created_at", oneDayAgo)
        .limit(5);

      if (unrepliedComments && unrepliedComments.length > 0) {
        // Check if we already sent this notification today
        const { count: alreadyNotified } = await supabase.from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("type", "unreplied")
          .gte("created_at", new Date().toISOString().split("T")[0]);

        if (!alreadyNotified || alreadyNotified === 0) {
          await supabase.from("notifications").insert({
            user_id: userId, type: "unreplied",
            content: `Sho より：あなたの投稿にコメントが来てるよ！返信してあげると、お互い前向きになれるかも。`,
          });
        }
      }
    }

    return NextResponse.json({
      streak,
      newBadges,
      growthLetter,
    });
  } catch (err) {
    console.error("[Check Progress]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
