-- ========================================================================
-- habits テーブル緊急修正（SQL Editor で実行・冪等）
-- ========================================================================

-- icon カラム追加（未作成時のみ）
ALTER TABLE habits ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '🔄';

-- name → title リネーム（name が存在する場合のみ）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='habits' AND column_name='name') THEN
    ALTER TABLE habits RENAME COLUMN name TO title;
  END IF;
END $$;

-- title カラムがそもそも無い場合は追加
ALTER TABLE habits ADD COLUMN IF NOT EXISTS title TEXT;

-- 既存 null を title で埋める（マイグレーション途中の混在を吸収）
UPDATE habits SET title = COALESCE(title, '無題の習慣') WHERE title IS NULL;

-- vision_id / archived_at（参照側で使用）
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS vision_id UUID,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

SELECT 'habits fix applied' AS status;
