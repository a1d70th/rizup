// Supabase の insert/select を「DBマイグレーション未実行」でも動かすためのフォールバック
// v3.2 の新カラム (morning_goal, goal_achieved, linked_morning_post_id, sleep_hours, bedtime,
// gratitudes, compound_score_today, posted_date) が無い時も core カラムで再試行する。

import type { SupabaseClient } from "@supabase/supabase-js";

export interface InsertResult<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: T | null;
  error: { message: string; code?: string } | null;
  usedFallback: boolean;
}

const KNOWN_POST_CORE_FIELDS = new Set([
  "user_id", "type", "content", "mood", "ai_feedback", "image_url",
]);

const KNOWN_TODO_CORE_FIELDS = new Set([
  "user_id", "title", "due_date", "is_done",
]);

function isColumnMissing(msg?: string) {
  if (!msg) return false;
  return /column|does not exist|schema/i.test(msg);
}
function isTableMissing(msg?: string) {
  if (!msg) return false;
  return /relation .* does not exist|table|not found in schema/i.test(msg);
}
// 外部キー違反: posts.user_id が profiles に存在しない（profile 行が未作成）
function isFkViolation(code?: string, msg?: string) {
  if (code === "23503") return true;
  if (msg && /foreign key|violates foreign key/i.test(msg)) return true;
  return false;
}

/** profiles 行が無いユーザー向けに upsert で自己修復する */
async function ensureProfileExists(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  // (1) クライアント側 upsert（RLS が通れば最速）
  try {
    const { data: u } = await supabase.auth.getUser();
    const email = u?.user?.email ?? null;
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, email }, { onConflict: "id" });
    if (!error) return true;
  } catch { /* fallthrough to server-side */ }

  // (2) サーバー側 service_role で RLS をバイパスして強制作成
  //     RLS INSERT ポリシーが未作成の環境でも profile 行を確実に作れる最終防衛線
  try {
    const res = await fetch("/api/ensure-profile", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      return !!data.ok;
    }
  } catch { /* ignore */ }
  return false;
}

export async function safeInsertPost<T = unknown>(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<InsertResult<T>> {
  const first = await supabase.from("posts").insert(payload).select().single();
  if (!first.error) return { data: first.data as T, error: null, usedFallback: false };

  // (A) FK 違反 = profile 行未作成。upsert してから 1 度だけ再試行
  if (isFkViolation(first.error.code, first.error.message)) {
    const userId = payload.user_id as string | undefined;
    if (userId && (await ensureProfileExists(supabase, userId))) {
      const retryFk = await supabase.from("posts").insert(payload).select().single();
      if (!retryFk.error) return { data: retryFk.data as T, error: null, usedFallback: true };
      // 再試行も失敗 → カラム不足の可能性に進む
      if (!isColumnMissing(retryFk.error.message)) {
        return { data: null, error: retryFk.error, usedFallback: true };
      }
      // カラム不足の場合は下のフォールバックに合流
      first.error = retryFk.error;
    } else {
      return {
        data: null,
        error: {
          message: "プロフィール初期化に失敗しました。再ログインしてもう一度試してください。",
          code: "PROFILE_INIT_FAILED",
        },
        usedFallback: false,
      };
    }
  }

  if (!isColumnMissing(first.error.message)) {
    return { data: null, error: first.error, usedFallback: false };
  }
  // (B) カラム不足フォールバック: コアカラムのみで再試行
  const fallback: Record<string, unknown> = {};
  for (const k of Object.keys(payload)) {
    if (KNOWN_POST_CORE_FIELDS.has(k)) fallback[k] = payload[k];
  }
  const retry = await supabase.from("posts").insert(fallback).select().single();

  // フォールバックでも FK 違反 → profile を upsert して 1 度だけ再々試行
  if (retry.error && isFkViolation(retry.error.code, retry.error.message)) {
    const userId = payload.user_id as string | undefined;
    if (userId && (await ensureProfileExists(supabase, userId))) {
      const retry2 = await supabase.from("posts").insert(fallback).select().single();
      if (retry2.error) return { data: null, error: retry2.error, usedFallback: true };
      return { data: retry2.data as T, error: null, usedFallback: true };
    }
  }

  if (retry.error) return { data: null, error: retry.error, usedFallback: true };
  return { data: retry.data as T, error: null, usedFallback: true };
}

export async function safeInsertTodo<T = unknown>(
  supabase: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<InsertResult<T>> {
  const first = await supabase.from("todos").insert(payload).select().single();
  if (!first.error) return { data: first.data as T, error: null, usedFallback: false };
  if (isTableMissing(first.error.message)) {
    return {
      data: null,
      error: {
        message: "ToDo機能はまだ有効になっていません。運営でDB準備中です（数分で完了）。",
        code: "TODOS_TABLE_MISSING",
      },
      usedFallback: false,
    };
  }
  if (!isColumnMissing(first.error.message)) {
    return { data: null, error: first.error, usedFallback: false };
  }
  const fallback: Record<string, unknown> = {};
  for (const k of Object.keys(payload)) {
    if (KNOWN_TODO_CORE_FIELDS.has(k)) fallback[k] = payload[k];
  }
  const retry = await supabase.from("todos").insert(fallback).select().single();
  if (retry.error) return { data: null, error: retry.error, usedFallback: true };
  return { data: retry.data as T, error: null, usedFallback: true };
}

/** posted_date カラムに依存しない「今日の投稿」検索 */
export async function findTodayPost(
  supabase: SupabaseClient,
  userId: string,
  type: "morning" | "evening",
): Promise<{ id: string; content?: string; mood?: number; morning_goal?: string } | null> {
  // JST の今日 00:00〜翌日 00:00 を ISO で
  const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const start = new Date(nowJST); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const { data } = await supabase.from("posts")
    .select("id, content, mood, morning_goal")
    .eq("user_id", userId).eq("type", type)
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  // morning_goal カラムがないとエラーになる可能性があるので、失敗時は content のみで再試行
  if (!data) {
    const { data: retry } = await supabase.from("posts")
      .select("id, content, mood")
      .eq("user_id", userId).eq("type", type)
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return retry || null;
  }
  return data;
}
