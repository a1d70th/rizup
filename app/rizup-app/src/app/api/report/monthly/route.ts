import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsPDF } from "jspdf";

const moodLabels: Record<number, string> = { 1: "Tsurai", 2: "Futsuu", 3: "Maamaa", 4: "Ii kanji", 5: "Saikou" };

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

    // Check plan
    const { data: profile } = await supabase.from("profiles")
      .select("name, plan, rizup_type, zodiac, streak, trial_ends_at, is_trial_ended")
      .eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const isPremium = profile.plan === "premium" || profile.plan === "vip";
    const isTrial = profile.trial_ends_at && !profile.is_trial_ended &&
      Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) > 0;
    if (!isPremium && !isTrial) {
      return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
    }

    // Get posts from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: posts } = await supabase.from("posts")
      .select("mood, content, type, created_at")
      .eq("user_id", user.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });

    const postList = posts || [];
    const totalPosts = postList.length;
    const morningPosts = postList.filter(p => p.type === "morning").length;
    const eveningPosts = postList.filter(p => p.type === "evening").length;
    const avgMood = totalPosts > 0 ? Math.round((postList.reduce((s, p) => s + p.mood, 0) / totalPosts) * 10) / 10 : 0;
    const moodDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    postList.forEach(p => { moodDist[p.mood] = (moodDist[p.mood] || 0) + 1; });

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(110, 203, 176); // mint
    doc.text("Rizup Monthly Report", w / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    const now = new Date();
    doc.text(`${now.getFullYear()}/${now.getMonth() + 1} - ${profile.name}`, w / 2, y, { align: "center" });
    y += 15;

    // Summary box
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(15, y, w - 30, 35, 3, 3, "F");
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Total Posts: ${totalPosts}  (Morning: ${morningPosts} / Evening: ${eveningPosts})`, 22, y);
    y += 7;
    doc.text(`Average Mood: ${avgMood} / 5`, 22, y);
    y += 7;
    doc.text(`Streak: ${profile.streak} days`, 22, y);
    y += 7;
    doc.text(`Type: ${profile.rizup_type || "-"}  |  Zodiac: ${profile.zodiac || "-"}`, 22, y);
    y += 15;

    // Mood Distribution
    doc.setFontSize(14);
    doc.setTextColor(110, 203, 176);
    doc.text("Mood Distribution", 15, y);
    y += 8;

    const barMaxW = 100;
    const barH = 6;
    const colors: Record<number, [number, number, number]> = {
      5: [90, 184, 157], 4: [110, 203, 176], 3: [234, 179, 8], 2: [249, 115, 22], 1: [239, 68, 68],
    };
    for (let mood = 5; mood >= 1; mood--) {
      const count = moodDist[mood] || 0;
      const pct = totalPosts > 0 ? count / totalPosts : 0;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${moodLabels[mood]}`, 15, y + 4);
      doc.setFillColor(...colors[mood]);
      doc.roundedRect(50, y, Math.max(pct * barMaxW, 2), barH, 1, 1, "F");
      doc.text(`${count}`, 50 + Math.max(pct * barMaxW, 2) + 3, y + 4);
      y += 9;
    }
    y += 10;

    // Weekly mood trend
    doc.setFontSize(14);
    doc.setTextColor(110, 203, 176);
    doc.text("Weekly Mood Trend", 15, y);
    y += 8;

    // Group posts by week
    const weeks: Record<string, number[]> = {};
    postList.forEach(p => {
      const d = new Date(p.created_at);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`;
      if (!weeks[key]) weeks[key] = [];
      weeks[key].push(p.mood);
    });

    const weekEntries = Object.entries(weeks).slice(-4);
    weekEntries.forEach(([week, moods]) => {
      const avg = Math.round((moods.reduce((s, m) => s + m, 0) / moods.length) * 10) / 10;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Week of ${week}~`, 15, y + 4);
      const pct = avg / 5;
      doc.setFillColor(110, 203, 176);
      doc.roundedRect(55, y, pct * 80, barH, 1, 1, "F");
      doc.text(`${avg}`, 55 + pct * 80 + 3, y + 4);
      y += 9;
    });
    y += 15;

    // Sho's message
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(15, y, w - 30, 25, 3, 3, "F");
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(110, 203, 176);
    doc.text("Message from Sho", 22, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const message = totalPosts >= 20
      ? `${profile.name}san, sugoi! ${totalPosts} posts this month. Keep going at your own pace.`
      : totalPosts >= 10
      ? `${profile.name}san, ${totalPosts} posts! You're building a great habit. Let's keep it up next month.`
      : `${profile.name}san, thank you for ${totalPosts} posts. Even small steps count. I'm always here for you.`;
    doc.text(message, 22, y, { maxWidth: w - 50 });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Generated by Rizup - rizup-app.vercel.app", w / 2, 285, { align: "center" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rizup-monthly-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[Monthly Report]", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
