-- ──────────────────────────────────────────────────────────
-- 20260418 他ユーザーの投稿失敗 撲滅
-- ──────────────────────────────────────────────────────────
-- 症状:
--   - 新規ユーザーが投稿しようとすると posts insert が失敗する
-- 根本原因:
--   - posts.user_id は profiles(id) への FK
--   - handle_new_user() トリガが trial_started_at 等の存在しないカラムを
--     参照していた古い実装で EXCEPTION 握りつぶし → profile 行ゼロのまま signup
--   - 結果、投稿時に 23503 (FK violation) で必ず失敗
-- 対策:
--   1. handle_new_user() を「コアカラムのみ」で定義し直す（DEFAULT に任せる）
--   2. 既存の auth.users 全員に対して profiles upsert で取りこぼしを補完
--   3. profiles に INSERT ポリシー（auth.uid() = id）を確実に作成
--      → クライアント側でも upsert 可能にして二重防御
-- ──────────────────────────────────────────────────────────
-- 冪等: 何度実行しても安全
-- ──────────────────────────────────────────────────────────

-- 1) 必要カラムが揃っていることを保証（過去マイグレ未適用環境のため）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email      text,
  ADD COLUMN IF NOT EXISTS name       text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plan       text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS streak     integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 2) handle_new_user() を堅牢化
--    - 必須カラム (id, email) のみ INSERT
--    - その他はテーブル DEFAULT に任せる（カラム不足で失敗しない）
--    - SECURITY DEFINER で RLS をすり抜けて INSERT
--    - 例外時は WARNING ログのみで signup を止めない
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3) 既存の取りこぼし補完
--    auth.users にいるが profiles に行が無いユーザー全員に対して INSERT
INSERT INTO public.profiles (id, email)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 4) profiles INSERT ポリシー（クライアント側 upsert を許可）
--    既に存在する場合は何もしない（DROP→CREATE で再作成）
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 5) 確認クエリ（必要なら手動実行）
-- SELECT count(*) AS missing_profiles
-- FROM auth.users u
-- LEFT JOIN profiles p ON p.id = u.id
-- WHERE p.id IS NULL;
