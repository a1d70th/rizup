-- ──────────────────────────────────────────────────────────
-- 20260418 Journal v7.4: 朝活データ + 3行日記
-- ──────────────────────────────────────────────────────────
-- 投入先: Supabase Dashboard → SQL Editor → Run
-- 冪等: IF NOT EXISTS で何度実行しても安全
-- ──────────────────────────────────────────────────────────

-- 朝活: 起床時刻（"HH:MM"）、就寝時刻（"HH:MM"）、睡眠時間は既存 sleep_hours を使用
ALTER TABLE posts ADD COLUMN IF NOT EXISTS wake_time text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS bedtime   text;

-- 3行日記（夜のふりかえり）
ALTER TABLE posts ADD COLUMN IF NOT EXISTS did_well       text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS grateful       text;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tomorrow_word  text;

-- 検索・集計用のインデックス（朝活の時刻で絞り込み）
CREATE INDEX IF NOT EXISTS posts_type_created_idx
  ON posts (type, created_at DESC);

-- 確認
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'posts'
--   AND column_name IN ('wake_time','bedtime','did_well','grateful','tomorrow_word');
