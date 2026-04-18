import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 新規ユーザー（特に OAuth / email confirmation 経由）で profile 行が
// 未作成のまま posts insert しに来るとFK違反で失敗する。
// このエンドポイントは service_role でRLSをバイパスして profile 行を確実に作成する。
// migration 未実行環境でも動く最後の防御ライン。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST() {
  try {
    // 1) 呼び出し元の認証を確認（cookie ベース）
    const cookieStore = cookies();
    const authed = createServerClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() { /* no-op: read only */ },
        },
      }
    );
    const { data: { user }, error: authErr } = await authed.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    // 2) service role が無い環境では anon key で upsert を試す（RLSは通る想定だが保険）
    if (!supabaseServiceKey) {
      const { error } = await authed
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });
      if (error) {
        return NextResponse.json({
          ok: false, error: "no_service_key_and_rls_blocked",
          detail: error.message,
        }, { status: 500 });
      }
      return NextResponse.json({ ok: true, method: "anon_upsert" });
    }

    // 3) service role で RLS を完全バイパスして確実に作成
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await admin
      .from("profiles")
      .upsert({ id: user.id, email: user.email ?? null }, { onConflict: "id" });

    if (error) {
      // 既知のケース: 必須カラムが無い環境 → 最小ペイロードで再試行
      const minimal = await admin
        .from("profiles")
        .upsert({ id: user.id }, { onConflict: "id" });
      if (minimal.error) {
        console.error("[ensure-profile] both upserts failed", { a: error.message, b: minimal.error.message });
        return NextResponse.json({
          ok: false, error: "upsert_failed",
          detail: minimal.error.message,
        }, { status: 500 });
      }
      return NextResponse.json({ ok: true, method: "service_role_minimal" });
    }

    return NextResponse.json({ ok: true, method: "service_role" });
  } catch (err) {
    console.error("[ensure-profile]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
