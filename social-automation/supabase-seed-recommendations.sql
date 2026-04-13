-- ========================================================================
-- Rizup おすすめ初期データ（Supabase SQL Editor で実行 / 冪等版）
-- カフェ3 / 本3 / 映画2 / 言葉3 = 合計11件
-- 既に同一 title が存在する場合はスキップ
-- ========================================================================

-- 重複防止: title + type のユニーク制約が無い場合は ON CONFLICT DO NOTHING を使うため
-- 一時的にユニーク制約を作成（既にあれば無視）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recommendations_title_type_unique'
  ) THEN
    BEGIN
      ALTER TABLE recommendations ADD CONSTRAINT recommendations_title_type_unique UNIQUE (title, type);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;

-- ── ☕ カフェ・場所（3件）────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('cafe', 'Blue Bottle Coffee', '一杯を丁寧に淹れる文化。朝ジャーナルの前に立ち寄ると、その日の解像度が1段上がる。', 'https://bluebottlecoffee.jp/', 'sho', 0),
('cafe', 'WIRED TOKYO', '本棚のあるコワーキングカフェ。ビジョンを書くのに最適な場所。', 'https://tysons.jp/wired_tokyo/', 'sho', 0),
('cafe', '近所の公園のベンチ', '有料の場所じゃなくてもいい。空が見える場所で10分ぼーっとすると、答えが出ることがある。', NULL, 'sho', 0)
ON CONFLICT (title, type) DO NOTHING;

-- ── 📚 本（3件）──────────────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('book', 'The Compound Effect / ダーレン・ハーディ', 'Rizupの設計思想そのもの。毎日1%が1年で37倍になる考えの出典。1時間で読めて10年効く。', 'https://www.amazon.co.jp/dp/1593157142', 'sho', 0),
('book', 'Atomic Habits / ジェームズ・クリア', '習慣化の決定版。「1%良くなる」「4つの法則」「システム>目標」。習慣トラッカー設計の基礎。', 'https://jamesclear.com/atomic-habits', 'sho', 0),
('book', '嫌われる勇気 / 岸見一郎', 'アドラー心理学の入門。「他人の期待に応えるために生きない」が響く。ビジョンを書く前に読むと本音が書ける。', 'https://www.amazon.co.jp/dp/4478025819', 'sho', 0)
ON CONFLICT (title, type) DO NOTHING;

-- ── 🎬 映画（2件）────────────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('movie', 'The Pursuit of Happyness（幸せのちから）', 'ホームレスから株式ブローカーになった実話。「諦めなきゃ道は続く」を体感できる。', NULL, 'sho', 0),
('movie', 'Whiplash（セッション）', '狂気の師匠と主人公。「good job は呪い」という台詞が効く。頑張りすぎた日に観て。', NULL, 'sho', 0)
ON CONFLICT (title, type) DO NOTHING;

-- ── 💬 言葉・名言（3件）──────────────────────────────────────────────
INSERT INTO recommendations (type, title, description, url, posted_by, likes) VALUES
('quote', '過去と他人は変えられない。未来と自分は変えられる。', 'エリック・バーンの言葉。比較で落ち込んだ時に思い出したい。', NULL, 'sho', 0),
('quote', '完璧を目指すよりまず終わらせろ。', 'マーク・ザッカーバーグ。Rizupの開発中、何度も呟いた。', NULL, 'sho', 0),
('quote', 'あなたが諦めない限り、あなたは負けない。', 'ベイブ・ルースの言葉。続けること以上に強いことはない。', NULL, 'sho', 0)
ON CONFLICT (title, type) DO NOTHING;

SELECT 'Rizup 初期おすすめ11件 投入完了' AS status;
