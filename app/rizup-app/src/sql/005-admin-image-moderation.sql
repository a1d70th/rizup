-- 005: Admin, image_url, moderation columns

-- Admin flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
-- Warning count for moderation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;
-- Suspended flag
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Image URL on posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id),
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Set admin
UPDATE profiles SET is_admin = true WHERE email = 'a1d.70th@gmail.com';

-- Storage bucket for post images (run via Supabase Dashboard if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT DO NOTHING;
