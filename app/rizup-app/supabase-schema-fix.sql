-- ========================================================================
-- Rizup 全テーブル・全カラム整合性修正（最終版・冪等）
-- v3-rebuild / v3.2-appstore / v3.3-habits-icon / habits-fix を統合
-- Supabase SQL Editor で一発実行すれば、コードが期待する全カラムが揃う
-- ========================================================================

-- ── profiles ──────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS dream TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS zodiac TEXT,
  ADD COLUMN IF NOT EXISTS birthday TEXT,
  ADD COLUMN IF NOT EXISTS rizup_type TEXT,
  ADD COLUMN IF NOT EXISTS mbti TEXT,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  ADD COLUMN IF NOT EXISTS compound_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS last_sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS last_bedtime TIME;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
UPDATE profiles SET plan = 'premium' WHERE plan = 'vip';
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free','pro','premium'));

-- ── posts ─────────────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS morning_goal TEXT,
  ADD COLUMN IF NOT EXISTS goal_achieved TEXT,
  ADD COLUMN IF NOT EXISTS linked_morning_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS bedtime TIME,
  ADD COLUMN IF NOT EXISTS gratitudes TEXT[],
  ADD COLUMN IF NOT EXISTS compound_score_today INTEGER,
  ADD COLUMN IF NOT EXISTS positivity_score INTEGER,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='posts' AND column_name='posted_date') THEN
    ALTER TABLE posts ADD COLUMN posted_date DATE
      GENERATED ALWAYS AS ((created_at AT TIME ZONE 'Asia/Tokyo')::date) STORED;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS posts_user_date_type_unique
  ON posts (user_id, posted_date, type);

-- ── visions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'growth',
  time_horizon TEXT NOT NULL DEFAULT 'monthly'
    CHECK (time_horizon IN ('final','3year','1year','monthly')),
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  ai_feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE visions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='visions_own' AND tablename='visions') THEN
    CREATE POLICY "visions_own" ON visions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── habits ────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='habits' AND column_name='name') THEN
    ALTER TABLE habits RENAME COLUMN name TO title;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🔄',
  ADD COLUMN IF NOT EXISTS vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS predicted_30days NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS predicted_90days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS predicted_1year NUMERIC(10,2);

UPDATE habits SET title = COALESCE(title, '無題の習慣') WHERE title IS NULL;
UPDATE habits SET icon = '🔄' WHERE icon IS NULL;

-- ── habit_logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, logged_date)
);
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='habit_logs_own' AND tablename='habit_logs') THEN
    CREATE POLICY "habit_logs_own" ON habit_logs FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── todos + journal_todos ────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_done BOOLEAN DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos (user_id, due_date);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='todos_own' AND tablename='todos') THEN
    CREATE POLICY "todos_own" ON todos FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS journal_todos (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, todo_id)
);
ALTER TABLE journal_todos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='journal_todos_all' AND tablename='journal_todos') THEN
    CREATE POLICY "journal_todos_all" ON journal_todos FOR ALL USING (
      EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.user_id = auth.uid())
    );
  END IF;
END $$;

-- ── anti_visions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anti_visions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anti_visions_own' AND tablename='anti_visions') THEN
    CREATE POLICY "anti_visions_own" ON anti_visions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── follows（他ユーザーページのフォロー） ───────────────
CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
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

-- ── push_subscriptions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT,
  auth TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='push_subs_own' AND tablename='push_subscriptions') THEN
    CREATE POLICY "push_subs_own" ON push_subscriptions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── reports / admin_broadcasts ──────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

-- ── 削除対象（競争系・VIP・デッドコード）────────────────
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS vip_contents CASCADE;
DROP TABLE IF EXISTS vip_consultations CASCADE;
DROP TABLE IF EXISTS vision_boards CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;

-- ── 完了 ─────────────────────────────────────────────────
SELECT 'Rizup schema fully synced' AS status;
