-- ========================================================================
-- Rizup Supabase 緊急修正 SQL（SQL Editor で実行）
-- 冪等・安全に何度でも実行可能
-- ========================================================================

-- 習慣の icon カラム（追加エラー修正）
ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🔄';

-- habits の他の必須カラム（念のため）
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS vision_id UUID,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- visions が無ければ作成（ビジョン画面のフリーズ修正）
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

-- todos 無ければ作成
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
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='todos_own' AND tablename='todos') THEN
    CREATE POLICY "todos_own" ON todos FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- anti_visions 無ければ作成
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

SELECT 'Rizup fix applied: habits.icon / visions / todos / anti_visions' AS status;
