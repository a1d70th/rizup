-- ──────────────────────────────────────────────────────────
-- 20260417 profiles の 400 エラー修正 + RLS 正規化
-- ──────────────────────────────────────────────────────────
-- 症状: profiles?select=streak,is_admin,character_animal,character_name
--       で Supabase が 400 を返し、home ページがプロフィールを取得できない。
-- 原因: 該当カラムが DB に存在しない / RLS で SELECT が許可されていない。
-- 対策: カラムを IF NOT EXISTS で追加し、authenticated 向けの RLS を再定義。
-- ──────────────────────────────────────────────────────────

-- 1) 不足しているカラムを追加（冪等）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS character_animal text DEFAULT 'rabbit';
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS character_name text DEFAULT '';
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';

-- 2) RLS 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3) ポリシー再作成（CREATE POLICY IF NOT EXISTS は一部バージョン非対応のため DROP→CREATE）
DROP POLICY IF EXISTS "users can read own profile" ON profiles;
CREATE POLICY "users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4) 村メンバーの読み取り（name/avatar/character 等）を peer 用に許可
-- 必要に応じて friends 経由の制限に絞ること。MVP は全員可。
DROP POLICY IF EXISTS "authenticated can read peers" ON profiles;
CREATE POLICY "authenticated can read peers"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- 5) 確認クエリ（手動で実行して結果を確認できる）
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles' AND table_schema = 'public'
-- ORDER BY ordinal_position;
