-- ──────────────────────────────────────────────────────────
-- 20260418 feedbacks テーブル新規作成
-- ──────────────────────────────────────────────────────────
-- 用途:
--   - アプリ内 /feedback ページからユーザーが送る改善要望/バグ報告/機能要望
-- RLS:
--   - 自分の feedback は insert / select 可能
--   - 管理者（profiles.is_admin = true）は全件 select 可能
-- ──────────────────────────────────────────────────────────
-- 冪等: IF NOT EXISTS + DROP POLICY IF EXISTS で何度実行しても安全
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedbacks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content    text NOT NULL,
  category   text DEFAULT 'other' CHECK (category IN ('usability', 'feature', 'bug', 'other')),
  created_at timestamptz DEFAULT now()
);

-- カテゴリ + 作成日時の検索インデックス（管理画面用）
CREATE INDEX IF NOT EXISTS feedbacks_category_created_idx
  ON feedbacks (category, created_at DESC);

-- RLS 有効化
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- 自分の feedback を送信可能
DROP POLICY IF EXISTS "users can insert own feedback" ON feedbacks;
CREATE POLICY "users can insert own feedback"
  ON feedbacks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 自分の feedback を閲覧可能 OR 管理者は全件閲覧可能
DROP POLICY IF EXISTS "users can read own feedback or admin all" ON feedbacks;
CREATE POLICY "users can read own feedback or admin all"
  ON feedbacks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 確認クエリ（任意）
-- SELECT * FROM feedbacks ORDER BY created_at DESC;
