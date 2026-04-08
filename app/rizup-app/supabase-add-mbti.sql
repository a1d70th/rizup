-- Add MBTI column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbti TEXT;
