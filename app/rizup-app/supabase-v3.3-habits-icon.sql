-- ========================================================================
-- Rizup v3.3 — habits.icon カラム追加（バグ修正）
-- Supabase SQL Editor で実行（冪等）
-- ========================================================================

-- habits に icon カラムを追加
ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🔄';

-- 既存の null を '🔄' に統一
UPDATE habits SET icon = '🔄' WHERE icon IS NULL;

SELECT 'Rizup v3.3 habits.icon added' AS status;
