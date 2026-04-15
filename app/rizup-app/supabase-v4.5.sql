-- Rizup v4.5 — Streak Freeze
-- 翔平さんの Supabase SQL Editor で 1回だけ実行してください
-- 再実行しても安全（IF NOT EXISTS）

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_freeze_used_at date;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_freeze_count integer DEFAULT 1;

-- 既存ユーザーに残数1付与（NULL の場合のみ）
UPDATE profiles
SET streak_freeze_count = 1
WHERE streak_freeze_count IS NULL;

-- streak_freeze_count を月初に1に戻す関数（任意・cronで月初に呼ぶ）
CREATE OR REPLACE FUNCTION reset_streak_freeze_monthly()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE profiles
  SET streak_freeze_count = 1, streak_freeze_used_at = NULL
  WHERE date_trunc('month', COALESCE(streak_freeze_used_at, '1970-01-01'::date))
        < date_trunc('month', CURRENT_DATE);
END;
$$;
