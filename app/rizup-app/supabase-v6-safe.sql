-- Rizup v6 セーフ・マイグレーション
-- profiles?select=...character_animal,character_name 400 エラー対策
-- Supabase SQL Editor で一括実行可能。IF NOT EXISTS により複数回実行しても安全。

-- ──────────────────────────────────────────────
-- 1. profiles に必要なカラムを追加
-- ──────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak            integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_admin          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS character_animal  text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS character_name    text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan              text    DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS warning_count     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_suspended      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS strengths         jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weekly_report     jsonb   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS streak_freeze_count       integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak_freeze_used_at     timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_id        text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id    text    DEFAULT NULL;

-- ──────────────────────────────────────────────
-- 2. RLS を有効化（既に ON でも問題ない）
-- ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 自分の行の SELECT を許可
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 自分の行の UPDATE を許可（streak / character_* 更新に必要）
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 村の仲間の profiles を閲覧（name/avatar/character/streak のみ）
-- 既に friends ベースの行レベルポリシーがあればそれで OK
DROP POLICY IF EXISTS "profiles_select_peers" ON profiles;
CREATE POLICY "profiles_select_peers"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);  -- MVP: 読み取りは全員許可（書き込みは自分だけ）

-- ──────────────────────────────────────────────
-- 3. posts に足りないカラムを追加（v3.2 以降）
-- ──────────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS morning_goal           text,
  ADD COLUMN IF NOT EXISTS goal_achieved          text,
  ADD COLUMN IF NOT EXISTS sleep_hours            numeric,
  ADD COLUMN IF NOT EXISTS gratitudes             jsonb,
  ADD COLUMN IF NOT EXISTS linked_morning_post_id uuid,
  ADD COLUMN IF NOT EXISTS compound_score_today   integer,
  ADD COLUMN IF NOT EXISTS ai_feedback            text;

-- ──────────────────────────────────────────────
-- 4. 確認クエリ（任意。実行ログで見られる）
-- ──────────────────────────────────────────────
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'profiles' ORDER BY ordinal_position;
