import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsPDF } from "jspdf";

const moodLabels: Record<number, string> = { 1: "Tsurai", 2: "Futsuu", 3: "Maamaa", 4: "Ii kanji", 5: "Saikou" };
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

    const { data: profile } = await supabase.from("profiles")
      .select("name, plan, rizup_type, zodiac, streak, trial_ends_at")
      .eq("id", user.id).single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const isPremium = profile.plan === "premium" || profile.plan === "vip";
    const isTrial = profile.trial_ends_at &&
      new Date(profile.trial_ends_at).getTime() > Date.now();
    if (!isPremium && !isTrial) {
      return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
    }

    // Get posts from this week (Sunday to now)
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: posts } = await supabase.from("posts")
      .select("mood, content, type, created_at")
      .eq("user_id", user.id)
      .gte("created_at", weekStart.toISOString())
      .order("created_at", { ascending: true });

    // Also get last week's posts for comparison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const { data: lastWeekPosts } = await supabase.from("posts")
      .select("mood")
      .eq("user_id", user.id)
      .gte("created_at", lastWeekStart.toISOString())
      .lt("created_at", weekStart.toISOString());

    const postList = posts || [];
    const lastList = lastWeekPosts || [];
    const totalPosts = postList.length;
    const avgMood = totalPosts > 0 ? Math.round((postList.reduce((s, p) => s + p.mood, 0) / totalPosts) * 10) / 10 : 0;
    const lastAvgMood = lastList.length > 0 ? Math.round((lastList.reduce((s, p) => s + p.mood, 0) / lastList.length) * 10) / 10 : 0;
    const moodDiff = avgMood - lastAvgMood;

    // Daily mood map
    const dailyMoods: Record<number, number[]> = {};
    postList.forEach(p => {
      const day = new Date(p.created_at).getDay();
      if (!dailyMoods[day]) dailyMoods[day] = [];
      dailyMoods[day].push(p.mood);
    });

    // Generate PDF
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    let y = 20;

    // Header
    doc.setFontSize(22);
    doc.setTextColor(110, 203, 176);
    doc.text("Rizup Weekly Report", w / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`${weekStart.getMonth() + 1}/${weekStart.getDate()} ~ ${now.getMonth() + 1}/${now.getDate()} - ${profile.name}`, w / 2, y, { align: "center" });
    y += 15;

    // Summary
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(15, y, w - 30, 28, 3, 3, "F");
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Posts this week: ${totalPosts}`, 22, y);
    y += 7;
    doc.text(`Average Mood: ${avgMood} / 5`, 22, y);
    y += 7;
    const diffText = moodDiff > 0 ? `+${moodDiff.toFixed(1)} from last week` : moodDiff < 0 ? `${moodDiff.toFixed(1)} from last week` : "Same as last week";
    doc.text(`Trend: ${diffText}`, 22, y);
    y += 13;

    // Daily breakdown
    doc.setFontSize(14);
    doc.setTextColor(110, 203, 176);
    doc.text("Daily Mood", 15, y);
    y += 8;

    const barH = 6;
    const colors: Record<number, [number, number, number]> = {
      5: [90, 184, 157], 4: [110, 203, 176], 3: [234, 179, 8], 2: [249, 115, 22], 1: [239, 68, 68],
    };

    for (let day = 0; day < 7; day++) {
      const moods = dailyMoods[day];
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(dayLabels[day], 15, y + 4);
      if (moods && moods.length > 0) {
        const avg = moods.reduce((s, m) => s + m, 0) / moods.length;
        const rounded = Math.round(avg);
        const pct = avg / 5;
        doc.setFillColor(...(colors[rounded] || colors[3]));
        doc.roundedRect(40, y, pct * 100, barH, 1, 1, "F");
        doc.text(`${avg.toFixed(1)} (${moodLabels[rounded]})`, 40 + pct * 100 + 3, y + 4);
      } else {
        doc.setTextColor(180, 180, 180);
        doc.text("No posts", 40, y + 4);
      }
      y += 9;
    }
    y += 10;

    // Mood distribution
    doc.setFontSize(14);
    doc.setTextColor(110, 203, 176);
    doc.text("Mood Distribution", 15, y);
    y += 8;

    const moodDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    postList.forEach(p => { moodDist[p.mood] = (moodDist[p.mood] || 0) + 1; });

    for (let mood = 5; mood >= 1; mood--) {
      const count = moodDist[mood] || 0;
      const pct = totalPosts > 0 ? count / totalPosts : 0;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(moodLabels[mood], 15, y + 4);
      doc.setFillColor(...colors[mood]);
      doc.roundedRect(50, y, Math.max(pct * 90, 2), barH, 1, 1, "F");
      doc.text(`${count}`, 50 + Math.max(pct * 90, 2) + 3, y + 4);
      y += 9;
    }
    y += 15;

    // Sho's message
    doc.setFillColor(245, 250, 248);
    doc.roundedRect(15, y, w - 30, 30, 3, 3, "F");
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(110, 203, 176);
    doc.text("Message from Sho for next week", 22, y);
    y += 7;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    let message: string;
    if (moodDiff > 0) {
      message = `Great progress this week, ${profile.name}san! Your mood improved by ${moodDiff.toFixed(1)} points. Keep this momentum going next week.`;
    } else if (totalPosts === 0) {
      message = `${profile.name}san, it looks like this week was quiet. No worries - even opening the app is a step forward. Try one small journal entry next week.`;
    } else {
      message = `${profile.name}san, thank you for sharing ${totalPosts} entries. Every post is progress. Next week, try to notice one small good thing each day.`;
    }
    doc.text(message, 22, y, { maxWidth: w - 50 });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text("Generated by Rizup - rizup-app.vercel.app", w / 2, 285, { align: "center" });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rizup-weekly-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[Weekly Report]", err);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
