-- Rizup v5.0 "村コンセプト" マイグレーション
-- 2026-04-16
-- 全て IF NOT EXISTS で安全に適用可能

-- 1. profiles に動物キャラ・名前・強みを追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_animal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS strengths jsonb DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_report_cache jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_report_at timestamptz;

-- 2. 仲間（friends）
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, friend_id)
);
CREATE INDEX IF NOT EXISTS friends_owner_idx ON friends(owner_id);
CREATE INDEX IF NOT EXISTS friends_friend_idx ON friends(friend_id);

-- 3. ジャーナル変身（相手の投稿を自分の視点で書き換える）
CREATE TABLE IF NOT EXISTS journal_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  source_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS journal_trans_to_idx ON journal_transformations(to_id);
CREATE INDEX IF NOT EXISTS journal_trans_from_idx ON journal_transformations(from_id);

-- 4. 強みを贈る
CREATE TABLE IF NOT EXISTS strength_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  source_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS strength_gifts_to_idx ON strength_gifts(to_id);
CREATE INDEX IF NOT EXISTS strength_gifts_from_idx ON strength_gifts(from_id);

-- RLS
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_transformations ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friends read own" ON friends;
CREATE POLICY "friends read own" ON friends
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends write own" ON friends;
CREATE POLICY "friends write own" ON friends
  FOR ALL USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "transforms read" ON journal_transformations;
CREATE POLICY "transforms read" ON journal_transformations
  FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);

DROP POLICY IF EXISTS "transforms write own" ON journal_transformations;
CREATE POLICY "transforms write own" ON journal_transformations
  FOR INSERT WITH CHECK (auth.uid() = from_id);

DROP POLICY IF EXISTS "gifts read" ON strength_gifts;
CREATE POLICY "gifts read" ON strength_gifts
  FOR SELECT USING (auth.uid() = from_id OR auth.uid() = to_id);

DROP POLICY IF EXISTS "gifts write own" ON strength_gifts;
CREATE POLICY "gifts write own" ON strength_gifts
  FOR INSERT WITH CHECK (auth.uid() = from_id);
