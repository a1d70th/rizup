-- 006: VIP contents, consultations, admin broadcasts

-- VIP exclusive content
CREATE TABLE IF NOT EXISTS vip_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vip_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vip_contents" ON vip_contents FOR SELECT USING (true);
CREATE POLICY "Admins can manage vip_contents" ON vip_contents FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- VIP consultations (monthly limit)
CREATE TABLE IF NOT EXISTS vip_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vip_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create own consultations" ON vip_consultations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own consultations" ON vip_consultations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage consultations" ON vip_consultations FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Admin broadcast history
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  target TEXT DEFAULT '全ユーザー',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage broadcasts" ON admin_broadcasts FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE)
);
