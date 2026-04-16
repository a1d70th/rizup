-- ============================================================
-- Rizup v5.0 — 今すぐ実行するSQL（全部入り）
-- Supabase SQL Editor にコピペして一括実行してください
-- 全て IF NOT EXISTS / DROP IF EXISTS で何度実行しても安全
-- 実行日: 2026-04-16
-- ============================================================

-- ============================================================
-- PART 1: supabase-v5.sql（村コンセプト用）
-- ============================================================

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

-- 3. ジャーナル変身
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

-- ============================================================
-- PART 2: supabase-final-fix.sql（全テーブル整合）
-- ============================================================

-- profiles に不足カラムがあれば追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freeze_count integer DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_freeze_used_at date;

-- posts に不足カラムがあれば追加
ALTER TABLE posts ADD COLUMN IF NOT EXISTS morning_goal text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sleep_hours real;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS gratitudes jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS linked_morning_post_id uuid;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS goal_achieved text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS compound_score_today real;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ai_feedback text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS positivity_score real;

-- journal_todos
CREATE TABLE IF NOT EXISTS journal_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  todo_id uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- habit_logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  habit_id uuid NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  logged_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(habit_id, logged_date)
);

-- ============================================================
-- PART 3: おすすめ初期データ（recommendations）
-- ============================================================

CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  description text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO recommendations (category, title, description, url)
SELECT * FROM (VALUES
  ('book', '嫌われる勇気', 'アドラー心理学入門。自分を変える第一歩に。', 'https://amzn.to/example1'),
  ('book', '7つの習慣', '人生を前に進めるための原則。', 'https://amzn.to/example2'),
  ('book', 'アウトプット大全', '書く・話す・行動で人生が変わる。', 'https://amzn.to/example3'),
  ('app', 'Notion', 'タスク管理・ノート・データベースが1つに。', 'https://notion.so'),
  ('app', 'Todoist', 'シンプルで強力なタスク管理。', 'https://todoist.com'),
  ('app', 'Forest', 'スマホを触らないと木が育つ集中アプリ。', 'https://forestapp.cc'),
  ('habit', '朝散歩10分', '朝日を浴びるだけでセロトニン増加。最も簡単な習慣。', NULL),
  ('habit', '寝る前3行日記', '1日の感謝を3つ書くだけ。幸福度が上がる研究あり。', NULL),
  ('habit', '1日1ページ読書', '1日1ページでも年365ページ。複利で効く。', NULL),
  ('podcast', 'Voicy 朝のルーティン', 'ながら聴きで朝のモチベUP。', 'https://voicy.jp'),
  ('podcast', 'COTEN RADIO', '歴史から学ぶ思考法。視野が広がる。', 'https://cotenradio.fm')
) AS t(category, title, description, url)
WHERE NOT EXISTS (SELECT 1 FROM recommendations LIMIT 1);

-- ============================================================
-- 完了！テーブル一覧で以下を確認：
-- profiles (character_animal, character_name, strengths 等)
-- friends, journal_transformations, strength_gifts
-- journal_todos, habit_logs, recommendations
-- ============================================================
