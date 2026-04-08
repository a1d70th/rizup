-- Core features: challenges table, positivity_score, mbti
ALTER TABLE posts ADD COLUMN IF NOT EXISTS positivity_score INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbti TEXT;

-- Weekly challenges
CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  result TEXT,
  week_start DATE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own challenges" ON challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenges" ON challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenges" ON challenges FOR UPDATE USING (auth.uid() = user_id);
