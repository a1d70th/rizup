import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { targetUserId, adminUserId, message } = await request.json();

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Service key not configured" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const { data: admin } = await supabase.from("profiles").select("is_admin").eq("id", adminUserId).single();
    if (!admin?.is_admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Increment warning count
    const { data: target } = await supabase.from("profiles").select("warning_count").eq("id", targetUserId).single();
    const newCount = (target?.warning_count || 0) + 1;
    const updates: Record<string, unknown> = { warning_count: newCount };
    if (newCount >= 3) updates.is_suspended = true;

    await supabase.from("profiles").update(updates).eq("id", targetUserId);

    // Create notification
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      type: "warning",
      content: message || `管理者から警告を受けました。（${newCount}/3）コミュニティガイドラインを確認してください。`,
    });

    return NextResponse.json({ success: true, warningCount: newCount, suspended: newCount >= 3 });
  } catch (err) {
    console.error("[Warn API]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
