-- Rizup Schema Update: 7-day free trial
-- Run this in Supabase SQL Editor AFTER the initial schema

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_trial_ended BOOLEAN DEFAULT FALSE;
