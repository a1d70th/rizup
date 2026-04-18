import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 投稿削除 API
// RLS の DELETE ポリシーが古い Supabase 環境で未作成の場合、
// クライアント側の supabase.from("posts").delete() が握り潰されて
// 「削除ボタンを押しても消えない」現象が起きる。
// service_role で RLS をバイパスしつつ、所有権は自前でチェックする。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const { postId } = await request.json();
    if (!postId || typeof postId !== "string") {
      return NextResponse.json({ ok: false, error: "invalid_post_id" }, { status: 400 });
    }

    // 1) 認証 + 呼び出し元ユーザー取得
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
        ok: false, error: "service_role_required",
      }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // 2) 所有権チェック（service_role で RLS 無視しても、ここで自前ガードする）
    //    または is_admin フラグ保持者も削除可能
    const { data: post, error: fetchErr } = await admin
      .from("posts")
      .select("id, user_id")
      .eq("id", postId)
      .maybeSingle();

    if (fetchErr || !post) {
      return NextResponse.json({ ok: false, error: "post_not_found" }, { status: 404 });
    }

    let allowed = post.user_id === user.id;
    if (!allowed) {
      const { data: prof } = await admin.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (prof?.is_admin) allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    // 3) 関連データを先に削除（FK ON DELETE CASCADE が無い/不完全な環境への保険）
    //    エラーは握り潰す（無くても posts 本体削除は通る想定）
    await admin.from("reactions").delete().eq("post_id", postId).then(() => null, () => null);
    await admin.from("comments").delete().eq("post_id", postId).then(() => null, () => null);
    await admin.from("journal_todos").delete().eq("post_id", postId).then(() => null, () => null);
    await admin.from("strength_gifts").delete().eq("source_post_id", postId).then(() => null, () => null);

    // 4) 本体削除
    const { error: delErr } = await admin.from("posts").delete().eq("id", postId);
    if (delErr) {
      console.error("[posts/delete] delete failed", delErr.message);
      return NextResponse.json({
        ok: false, error: "delete_failed", detail: delErr.message,
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[posts/delete]", err);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}
