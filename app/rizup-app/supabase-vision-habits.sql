-- Vision Boards
CREATE TABLE IF NOT EXISTS vision_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  image_url TEXT,
  affirmation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vision_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vision boards" ON vision_boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vision boards" ON vision_boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vision boards" ON vision_boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vision boards" ON vision_boards FOR DELETE USING (auth.uid() = user_id);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(habit_id, logged_date)
);
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own habit logs" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habit logs" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own habit logs" ON habit_logs FOR DELETE USING (auth.uid() = user_id);
