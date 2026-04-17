-- ──────────────────────────────────────────────────────────
-- Rizup タイムライン用のテスト投稿シード（8件）
-- ──────────────────────────────────────────────────────────
-- 使い方:
-- 1. 下の :seed_user_id を、投稿を紐付けたい profiles の UUID に書き換える
--    例: select id from profiles limit 1;
--        ここで出た id をそのまま '...' 内に貼る
-- 2. Supabase Dashboard → SQL Editor に全部貼って Run
-- 3. timeline （/home）をリロードして 8 件並ぶか確認
-- ──────────────────────────────────────────────────────────

-- 👇 ここに実在する profiles.id を設定
\set seed_user_id '00000000-0000-0000-0000-000000000000'

INSERT INTO posts (user_id, type, content, mood, created_at) VALUES
  (:'seed_user_id', 'morning', '朝6時に起きて散歩30分。小さいけど続けてる自分を褒めたい。',                4, now() - interval '30 minutes'),
  (:'seed_user_id', 'evening', '今日は気が乗らない日だった。でも記録だけはした。これが積み重ね。',      2, now() - interval '2 hours'),
  (:'seed_user_id', 'morning', '苦手な電話を1本かけた。声が震えたけど、やった事実が残る。',              4, now() - interval '5 hours'),
  (:'seed_user_id', 'evening', '久しぶりに家族と話せた。「ありがとう」って言えた自分がちょっと好き。',  4, now() - interval '8 hours'),
  (:'seed_user_id', 'morning', '朝のコーヒーが美味しかった。それだけで1日が始まる感じ、わるくない。',  4, now() - interval '1 day'),
  (:'seed_user_id', 'evening', '仕事で失敗したけど、誰かのせいにしなかった。成長したかも。',            4, now() - interval '1 day 3 hours'),
  (:'seed_user_id', 'morning', 'また早起きできた。3日連続は記録かも。明日も続けよう。',                  4, now() - interval '2 days'),
  (:'seed_user_id', 'evening', '今日もお疲れさま。寝る前に深呼吸3回して、明日の自分にバトンを。',      4, now() - interval '2 days 4 hours')
;

-- 確認
SELECT id, type, substring(content, 1, 30) AS preview, mood, created_at
FROM posts
WHERE user_id = :'seed_user_id'
ORDER BY created_at DESC
LIMIT 10;
