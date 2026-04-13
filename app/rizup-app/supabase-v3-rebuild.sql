-- ========================================================================
-- Rizup v3 — 統合マイグレーション（完全版）
-- 実行：Supabase → SQL Editor → New query → 全文貼り付け → Run
-- 冪等（何度でも実行可能）
-- ========================================================================

-- ── 1. 削除（競争系・VIP・デッドコード）──────────────────────────────────
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS vip_contents CASCADE;
DROP TABLE IF EXISTS vip_consultations CASCADE;
DROP TABLE IF EXISTS vision_boards CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;

DELETE FROM notifications
  WHERE type IN ('mvp_announcement','vip_message','badge','sho_weekly','unreplied');

-- profiles.plan から 'vip' を除外
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
UPDATE profiles SET plan = 'premium' WHERE plan = 'vip';
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free','pro','premium'));

-- ── 2. profiles 拡張（複利スコア） ───────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS compound_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- ── 3. posts 拡張 ───────────────────────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS morning_goal TEXT,
  ADD COLUMN IF NOT EXISTS goal_achieved TEXT
    CHECK (goal_achieved IN ('yes','partial','no')),
  ADD COLUMN IF NOT EXISTS linked_morning_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS bedtime TIME,
  ADD COLUMN IF NOT EXISTS gratitudes TEXT[],
  ADD COLUMN IF NOT EXISTS compound_score_today INTEGER;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_date DATE
  GENERATED ALWAYS AS ((created_at AT TIME ZONE 'Asia/Tokyo')::date) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS posts_user_date_type_unique
  ON posts (user_id, posted_date, type);

-- ── 4. visions ──────────────────────────────────────────────────────────
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

-- ── 5. habits（name→title + vision_id + 複利予測） ────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='habits' AND column_name='name') THEN
    ALTER TABLE habits RENAME COLUMN name TO title;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS predicted_30days NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS predicted_90days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS predicted_1year NUMERIC(10,2);

-- ── 6. habit_logs（存在保証） ────────────────────────────────────────
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

-- ── 7. todos ────────────────────────────────────────────────────────────
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

-- ── 8. アンチビジョン ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anti_visions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='anti_visions_own' AND tablename='anti_visions') THEN
    CREATE POLICY "anti_visions_own" ON anti_visions FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── 9. reports（通報） ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','resolved','rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='reports_insert' AND tablename='reports') THEN
    CREATE POLICY "reports_insert" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='reports_admin_read' AND tablename='reports') THEN
    CREATE POLICY "reports_admin_read" ON reports FOR SELECT USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );
  END IF;
END $$;

-- ── 10. admin_broadcasts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='admin_broadcasts_admin' AND tablename='admin_broadcasts') THEN
    CREATE POLICY "admin_broadcasts_admin" ON admin_broadcasts FOR ALL USING (
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
    );
  END IF;
END $$;

-- ── 11. profiles 追加保証 ──────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');

-- ── 12. posts.content → 独立カラムへの一度限りの移行 ──────────────────
UPDATE posts SET sleep_hours = (
  CASE WHEN content ~ '昨夜の睡眠：[0-9.]+時間'
       THEN (regexp_matches(content, '昨夜の睡眠：([0-9.]+)時間'))[1]::numeric
       ELSE NULL END
) WHERE sleep_hours IS NULL AND type = 'morning';

UPDATE posts SET bedtime = (
  CASE WHEN content ~ '今夜の就寝予定：[0-9]{1,2}:[0-9]{2}'
       THEN ((regexp_matches(content, '今夜の就寝予定：([0-9]{1,2}:[0-9]{2})'))[1] || ':00')::time
       ELSE NULL END
) WHERE bedtime IS NULL AND type = 'evening';

-- ── 完了 ────────────────────────────────────────────────────────────────
SELECT 'Rizup v3 migration completed' AS status;
