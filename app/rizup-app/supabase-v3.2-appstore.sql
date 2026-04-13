-- ========================================================================
-- Rizup v3.2 — App Store申請品質向上マイグレーション
-- v3-rebuild.sql の実行後に続けて実行してください。冪等。
-- ========================================================================

-- ── 1. follows（フォロー機能）──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON follows (followee_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='follows_public_read' AND tablename='follows') THEN
    CREATE POLICY "follows_public_read" ON follows FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='follows_self_insert' AND tablename='follows') THEN
    CREATE POLICY "follows_self_insert" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='follows_self_delete' AND tablename='follows') THEN
    CREATE POLICY "follows_self_delete" ON follows FOR DELETE USING (auth.uid() = follower_id);
  END IF;
END $$;

-- ── 2. push_subscriptions（Web Push通知） ──────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions (user_id);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='push_subs_own' AND tablename='push_subscriptions') THEN
    CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 3. 既存テーブルの RLS 完全化 ───────────────────────────────────────
-- posts の SELECT/INSERT/UPDATE/DELETE ポリシー（未設定があれば補完）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Posts are viewable by everyone' AND tablename='posts') THEN
    CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can insert own posts' AND tablename='posts') THEN
    CREATE POLICY "Users can insert own posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can update own posts' AND tablename='posts') THEN
    CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own posts' AND tablename='posts') THEN
    CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- comments の DELETE ポリシー（own comment削除）
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='Users can delete own comments' AND tablename='comments') THEN
    CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 4. バリデーション強化 ─────────────────────────────────────────────
-- content 長さ制限
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_content_length;
ALTER TABLE posts ADD CONSTRAINT posts_content_length
  CHECK (char_length(content) <= 2000);

ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_content_length;
ALTER TABLE comments ADD CONSTRAINT comments_content_length
  CHECK (char_length(content) BETWEEN 1 AND 500);

-- ── 5. admin_broadcasts 型 CHECK ──────────────────────────────────────
ALTER TABLE admin_broadcasts DROP CONSTRAINT IF EXISTS admin_broadcasts_type_check;
ALTER TABLE admin_broadcasts ADD CONSTRAINT admin_broadcasts_type_check
  CHECK (type IN ('announce','event','sho_weekly'));

-- ── 完了 ───────────────────────────────────────────────────────────────
SELECT 'Rizup v3.2 appstore migration completed' AS status;
