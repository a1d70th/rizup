-- Add onboarding_completed flag to profiles
-- Fixes the onboarding loop where empty name ('') was treated as not-onboarded
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Mark all existing users with a name as onboarded
UPDATE profiles SET onboarding_completed = TRUE WHERE name IS NOT NULL AND name != '';
