import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const messages = [
  "おはよう。今日も完璧じゃなくていいから、1つだけ前に進もう。",
  "新しい朝だよ。昨日の自分を超える必要はない。今日の自分を大切にしよう。",
  "今日も来てくれたんだね。それだけで十分すごいことだよ。",
  "小さな一歩でいい。動いた自分を褒めてあげよう。",
  "比べなくていい。あなたはあなたのペースで、ちゃんと進んでる。",
  "今日はどんな日になるかな。楽しみだね。一緒に過ごそう。",
  "深呼吸して、今日の目標を1つだけ決めてみよう。それだけでOK。",
];

export async function GET(request: Request) {
  // Verify cron secret (Vercel Cron Jobs sends this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all active users (posted in last 14 days)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentPosters } = await supabase.from("posts")
      .select("user_id").gte("created_at", fourteenDaysAgo);

    if (!recentPosters || recentPosters.length === 0) {
      return NextResponse.json({ message: "No active users" });
    }

    const uniqueUsers = Array.from(new Set(recentPosters.map(p => p.user_id)));
    const todayMessage = messages[new Date().getDay() % messages.length];

    const notifications = uniqueUsers.map(uid => ({
      user_id: uid,
      type: "sho_morning",
      content: `Rizup より：${todayMessage}`,
    }));

    // Batch insert (max 100 at a time)
    for (let i = 0; i < notifications.length; i += 100) {
      await supabase.from("notifications").insert(notifications.slice(i, i + 100));
    }

    return NextResponse.json({ sent: uniqueUsers.length });
  } catch (err) {
    console.error("[Morning Notification]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
