-- Add positivity score to posts for word analysis
ALTER TABLE posts ADD COLUMN IF NOT EXISTS positivity_score INTEGER;
