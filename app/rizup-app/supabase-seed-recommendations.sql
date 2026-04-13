-- ========================================================================
-- Rizup 初期レコメンド・シード（Rizup のおすすめ 6カテゴリ × 3件 = 18件）
-- Supabase SQL Editor で実行。冪等（重複INSERTを避ける ON CONFLICT なし → 手動削除）
-- 既にレコードがある場合は重複作成されるため、1回のみ実行
-- ========================================================================

-- 既存 Sho 投稿をクリア（開発時のみ）
-- DELETE FROM recommendations WHERE posted_by = 'sho';

-- ── ☕ cafe（カフェ・場所）─────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('cafe', 'Blue Bottle Coffee', '一杯を丁寧に淹れる文化。朝ジャーナルの前に立ち寄ると、その日の解像度が1段上がる。', 'https://bluebottlecoffee.jp/', 'sho', 0),
('cafe', 'WIRED TOKYO', '東京で一番好きなコワーキングカフェ。本棚があって、ビジョンを書くのに最適。', 'https://tysons.jp/wired_tokyo/', 'sho', 0),
('cafe', '近所の公園のベンチ', '有料の場所じゃなくてもいい。空が見える場所で10分ぼーっとすると、答えが出ることがある。', null, 'sho', 0);

-- ── 📚 book（本）───────────────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('book', 'The Compound Effect / ダーレン・ハーディ', 'Rizupの設計思想そのもの。毎日1%が1年で37倍になる、という考えの出典。1時間で読めて、10年効く。', 'https://www.amazon.co.jp/dp/1593157142', 'sho', 0),
('book', 'Atomic Habits / ジェームズ・クリア', '習慣化の決定版。「1%良くなる」「4つの法則」「システム>目標」。Rizupの習慣トラッカーを作る時に一番参考にした。', 'https://jamesclear.com/atomic-habits', 'sho', 0),
('book', '嫌われる勇気 / 岸見一郎', 'アドラー心理学の入門。「他人の期待に応えるために生きない」が響く。ビジョンを書く前に読むと、本音が書ける。', 'https://www.amazon.co.jp/dp/4478025819', 'sho', 0);

-- ── 🎬 movie（映画）────────────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('movie', 'The Pursuit of Happyness（幸せのちから）', 'ホームレスから株式ブローカーになった実話。「諦めなきゃ道は続く」を体感できる。', null, 'sho', 0),
('movie', 'Whiplash（セッション）', '狂気の師匠と主人公。『good job』は呪い、という台詞が効く。頑張りすぎた日に観て。', null, 'sho', 0),
('movie', 'ソウルフル・ワールド', '「生きがい」って何？を問うPixar。目標のその先にある「今を楽しむ」に気付ける。', null, 'sho', 0);

-- ── 🗓 weekend（週末の予定）──────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('weekend', '近所の本屋で1時間、気になる本の冒頭だけ読む', '買わなくていい。脳に新しい情報を入れることが目的。月曜の視点が変わる。', null, 'sho', 0),
('weekend', 'スマホを家に置いて30分散歩', 'SNSも通知もなしで歩くと、考えが勝手に整理される。最強のメンテナンス。', null, 'sho', 0),
('weekend', '誰か1人に「元気？」って連絡する', 'ビジネスじゃない連絡。3年会ってない人でもいい。人とのつながりも複利になる。', null, 'sho', 0);

-- ── 💬 quote（言葉・名言）────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('quote', '「過去と他人は変えられない。未来と自分は変えられる。」', 'エリック・バーンの言葉。比較で落ち込んだ時に思い出したい。', null, 'sho', 0),
('quote', '「完璧を目指すよりまず終わらせろ。」', 'マーク・ザッカーバーグ。Rizupの開発中、何度も呟いた。', null, 'sho', 0),
('quote', '「あなたが諦めない限り、あなたは負けない。」', 'ベイブ・ルースの言葉。続けること以上に強いことはない。', null, 'sho', 0);

-- ── 🎵 music（音楽・Pod）─────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('music', 'Ludovico Einaudi - Nuvole Bianche', 'ピアノ。ジャーナルを書く時のBGMはこれ一択。静かで、邪魔しない。', 'https://open.spotify.com/track/2XU0oxnq2qxCpomAAuJY8K', 'sho', 0),
('music', '藤井風 - 何なんw', '疲れた日の朝、これ聞くと笑える。力が抜ける音楽って大事。', null, 'sho', 0),
('music', 'Huberman Lab Podcast', '睡眠・習慣・モチベーションの科学。英語だけど、聞き流すだけで眠気が減る不思議。', 'https://www.hubermanlab.com/', 'sho', 0);

-- ── 確認 ───────────────────────────────────────────────────────────────
SELECT type, COUNT(*) as cnt
FROM recommendations
WHERE posted_by = 'sho'
GROUP BY type
ORDER BY type;
