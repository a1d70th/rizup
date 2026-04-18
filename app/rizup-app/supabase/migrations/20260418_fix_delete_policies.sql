-- ──────────────────────────────────────────────────────────
-- 20260418 投稿削除バグ撲滅（RLS DELETE ポリシー整備）
-- ──────────────────────────────────────────────────────────
-- 症状:
--   - 自分の投稿の削除ボタンを押しても消えない
-- 根本原因:
--   - 古い supabase-schema.sql バージョンで構築された環境では
--     posts テーブルに DELETE ポリシーが存在しない可能性
--   - Supabase RLS は「ポリシー無い = DELETE 不可」なので silently fail する
-- 対策:
--   - posts / reactions / comments に DELETE ポリシーを冪等に追加
-- ──────────────────────────────────────────────────────────

-- 1) posts: 自分の投稿を削除可能に
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2) reactions: 自分のリアクションを削除可能に
DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3) comments: 自分のコメントを削除可能に
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4) journal_todos: post と一緒に消えるべき補助テーブル
--    （テーブル存在しない環境ではエラーを握り潰すため DO ブロックで）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'journal_todos') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can delete own journal_todos" ON journal_todos';
    EXECUTE 'CREATE POLICY "Users can delete own journal_todos"
             ON journal_todos FOR DELETE
             TO authenticated
             USING (EXISTS (SELECT 1 FROM posts WHERE posts.id = journal_todos.post_id AND posts.user_id = auth.uid()))';
  END IF;
END $$;

-- 5) 確認（任意）
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE tablename IN ('posts','reactions','comments','journal_todos')
-- ORDER BY tablename, cmd;
