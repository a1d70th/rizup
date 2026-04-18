import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 新規ユーザー（特に OAuth / email confirmation 経由）で profile 行が
// 未作成のまま posts insert しに来るとFK違反で失敗する。
// このエンドポイントは service_role でRLSをバイパスして profile 行を確実に作成する。
// migration 未実行環境でも動く最後の防御ライン。
//
// 追加: name カラムが空の場合は email プレフィックスをデフォルト名に設定
//       （名前未設定ユーザーの表示崩れを防ぐ）

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

    // email プレフィックスから安全なデフォルト名
    // 英数とアンダースコア・ハイフンだけ残す（日本語メールは稀 + サニタイズ優先）
    const defaultName = user.email
      ? (user.email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 20) || "ユーザー")
      : "ユーザー";

    // 2) service role が無い環境では anon key で upsert を試す（RLSは通る想定だが保険）
    if (!supabaseServiceKey) {
      const { error } = await authed
        .from("profiles")
        .upsert({ id: user.id, email: user.email ?? null, name: defaultName }, { onConflict: "id" });
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

    // 既に name が設定されているユーザーの名前を上書きしないように先に取得
    const { data: existing } = await admin
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();
    const needsName = !existing?.name || String(existing.name).trim() === "";

    const payload: Record<string, unknown> = {
      id: user.id,
      email: user.email ?? null,
    };
    if (needsName) payload.name = defaultName;

    const { error } = await admin
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

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

    return NextResponse.json({ ok: true, method: "service_role", nameSet: needsName });
  } catch (err) {
    console.error("[ensure-profile]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
