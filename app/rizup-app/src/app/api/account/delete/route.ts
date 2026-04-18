import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// アカウント削除 API
// - 認証済みユーザーが自分のアカウント + 関連データを完全削除する
// - posts / profiles / reactions / comments / habits 等は ON DELETE CASCADE で
//   profiles 行削除と同時に連鎖削除される（supabase-schema.sql の FK 定義）
// - auth.users 本体の削除には service_role 権限が必要（anon では不可）

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST() {
  try {
    // 1) 呼び出し元の認証を確認
    const cookieStore = cookies();
    const authed = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no-op */ },
        },
      }
    );
    const { data: { user }, error: authErr } = await authed.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({
        ok: false,
        error: "service_role_required",
        detail: "アカウント削除には SUPABASE_SERVICE_ROLE_KEY が必要です",
      }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 2) profiles 行を削除（CASCADE で posts/reactions/comments/habits 等が連鎖削除）
    const { error: profileErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (profileErr) {
      console.error("[account/delete] profile delete failed", profileErr.message);
      // 続行（最小限の削除でも試す）
    }

    // 3) auth.users 本体を削除（これで完全に消える）
    const { error: authErr2 } = await admin.auth.admin.deleteUser(user.id);
    if (authErr2) {
      console.error("[account/delete] auth.users delete failed", authErr2.message);
      return NextResponse.json({
        ok: false,
        error: "auth_delete_failed",
        detail: authErr2.message,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[account/delete]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
