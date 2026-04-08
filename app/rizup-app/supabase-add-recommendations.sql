-- Update recommendations table for user posting & Google Maps
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS posted_by TEXT DEFAULT 'sho';
ALTER TABLE recommendations ADD COLUMN IF NOT EXISTS map_url TEXT;
ALTER TABLE recommendations DROP CONSTRAINT IF EXISTS recommendations_type_check;
ALTER TABLE recommendations ADD CONSTRAINT recommendations_type_check CHECK (type IN (
  'food','cafe','travel','scenery',
  'movie','music','book','youtube',
  'quote','habit','app','study',
  'happiness','experience','motivation'
));

-- Allow users to insert recommendations (Pro+ only enforced at app level)
CREATE POLICY "Users can insert recommendations" ON recommendations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR posted_by = 'sho');

-- Allow update for likes
CREATE POLICY "Anyone can update recommendation likes" ON recommendations
  FOR UPDATE USING (true);
