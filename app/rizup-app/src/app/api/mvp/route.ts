import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// Monthly MVP auto-selection — call on 1st of each month (or via cron)
export async function POST() {
  try {
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Get all users' post counts last month
    const { data: posts } = await supabase.from("posts")
      .select("user_id")
      .gte("created_at", lastMonthStart)
      .lt("created_at", lastMonthEnd);

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: "No posts last month" });
    }

    // Count posts per user
    const userPostCounts: Record<string, number> = {};
    posts.forEach(p => { userPostCounts[p.user_id] = (userPostCounts[p.user_id] || 0) + 1; });

    // Get reaction counts for each user's posts
    const userIds = Object.keys(userPostCounts);
    const scores: { userId: string; score: number }[] = [];

    for (const uid of userIds) {
      const postCount = userPostCounts[uid];

      const { count: reactionCount } = await supabase.from("reactions")
        .select("id", { count: "exact", head: true })
        .in("post_id", (await supabase.from("posts").select("id").eq("user_id", uid)
          .gte("created_at", lastMonthStart).lt("created_at", lastMonthEnd)).data?.map(p => p.id) || []);

      const { count: commentCount } = await supabase.from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid)
        .gte("created_at", lastMonthStart)
        .lt("created_at", lastMonthEnd);

      const score = postCount * (reactionCount || 0) * Math.max(commentCount || 1, 1);
      scores.push({ userId: uid, score });
    }

    // Find MVP
    scores.sort((a, b) => b.score - a.score);
    const mvp = scores[0];
    if (!mvp) return NextResponse.json({ message: "No MVP" });

    // Grant badge
    const { data: existing } = await supabase.from("badges")
      .select("id").eq("user_id", mvp.userId).eq("type", "monthly_mvp").single();

    if (!existing) {
      await supabase.from("badges").insert({ user_id: mvp.userId, type: "monthly_mvp" });
    }

    // Get MVP name
    const { data: profile } = await supabase.from("profiles")
      .select("name").eq("id", mvp.userId).single();

    // Notify all users
    const { data: allProfiles } = await supabase.from("profiles").select("id");
    if (allProfiles) {
      const monthName = `${now.getFullYear()}年${now.getMonth()}月`;
      const notifs = allProfiles.map(p => ({
        user_id: p.id, type: "mvp_announcement",
        content: `${monthName}の月間MVPは ${profile?.name || "ユーザー"} さんです！おめでとう！ 👑`,
      }));
      await supabase.from("notifications").insert(notifs);
    }

    return NextResponse.json({ mvp: mvp.userId, score: mvp.score, name: profile?.name });
  } catch (err) {
    console.error("[Monthly MVP]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
