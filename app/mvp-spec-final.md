# Rizup アプリ 最終仕様書（確定版）

> 「毎日成長が見える、前向きな人だけが集まるSNS」
> キャラクター：Sho（丸くてかわいい・不完全で親しみやすい）

---

## 1. 確定機能一覧

### 投稿系

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 1 | 朝ジャーナリング | 今日の目標（1つ）+ 気分5段階 + 一言。毎朝1回 | 無料 |
| 2 | 夜ジャーナリング | 振り返りテキスト + 感謝3つ + 気分5段階。毎晩1回 | 無料 |
| 3 | 連続投稿ストリーク | 連続投稿日数を自動計算・表示。途切れたら0から | 無料 |

### SNS系

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 4 | タイムライン | 全ユーザーの投稿を新しい順に表示。無限スクロール | 無料 |
| 5 | ポジティブリアクション | 💪応援してる / 🤝わかるよ / ✨すごい の3種のみ | 無料 |
| 6 | 強制ポジティブコメント | 1日1回、誰かの投稿にコメントする（ポジティブ内容のみ許可） | 無料 |
| 7 | 未反応通知 | 6時間以上リアクション0の投稿をShoが通知で促す | 無料 |
| 8 | 週間チャレンジ | 月曜に宣言→金曜に報告。達成者にバッジ付与 | Pro |

### ランキング・報奨系（全て AI 自動・数値判断）

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 9 | 励まし TOP3 | コメント数+リアクション数の合計で週次ランキング | 無料（閲覧） |
| 10 | 連続投稿ランキング | 連続日数で週次ランキング | 無料（閲覧） |
| 11 | 感謝されランキング | 感謝リアクション受け取り数で週次ランキング | 無料（閲覧） |
| 12 | バッジ制度 | 初投稿/7日連続/14日連続/コメント50回/100回/週間MVP等 | 無料 |
| 13 | 月間MVP | 全スコア総合点でShoが自動選出。プロフィールに表示 | 無料 |

### AI・成長可視化系

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 14 | Sho の即時AIフィードバック | 投稿直後にClaude APIで生成。共感→成長指摘→前向き締め | Pro |
| 15 | 使った言葉ランキング | 投稿テキストを形態素解析、頻出ワードTOP10を表示 | Pro |
| 16 | ネガティブ→ポジティブ変化グラフ | ネガ/ポジ比率の月次推移グラフ | Pro |
| 17 | モチベーショングラフ | 気分5段階の推移を折れ線グラフで30日/90日表示 | Pro |
| 18 | 成長の手紙 | 3ヶ月前の自分の投稿が通知で届く。「あの頃と比べてこう変わった」 | Premium |
| 19 | 月次PDF成長レポート | AIが1ヶ月の投稿を分析し、強み・変化・次の一歩をPDF化 | Premium |

### Sho 発信系

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 20 | 毎朝の励まし通知 | 毎朝7:00にShoからプッシュ通知。日替わりメッセージ | 無料 |
| 21 | 週1コンテンツ | 幸福論・思考法の記事。日曜18:00に配信 | 無料 |
| 22 | メンバー限定メッセージ | Shoからの特別メッセージ。月1〜2回 | Premium |
| 23 | お知らせ・イベント告知 | 新機能リリース・イベント情報 | 無料 |

### レコメンド系（ポジティブ限定）

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 24 | Sho のおすすめ | 本・映画・場所・言葉。Shoが厳選して投稿 | 無料 |
| 25 | みんなのおすすめ | ユーザーが投稿するおすすめ。カテゴリ別表示 | 無料 |

### プロフィール系

| # | 機能 | 仕様 | プラン |
|---|---|---|---|
| 26 | 夢・目標の宣言 | プロフィールに目標を表示。いつでも更新可 | 無料 |
| 27 | 成長タイムライン | 過去の投稿を時系列で振り返れる | 無料 |
| 28 | 獲得バッジ一覧 | プロフィールにバッジを表示 | 無料 |

---

## 2. マネタイズ

| プラン | 月額 | 機能 |
|---|---|---|
| **無料** | ¥0 | 投稿・タイムライン・リアクション・ランキング閲覧・Shoの朝通知・おすすめ閲覧 |
| **Pro** | ¥980 | AIフィードバック・言葉ランキング・ネガポジグラフ・モチベグラフ・週間チャレンジ |
| **Premium** | ¥2,980 | 月次PDF・成長の手紙・Sho限定メッセージ・Pro全機能 |

---

## 3. データベース設計（Supabase）

```sql
-- プロフィール
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  bio         TEXT DEFAULT '',
  goal        TEXT DEFAULT '',
  dream       TEXT DEFAULT '',
  streak      INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','premium')),
  stripe_customer_id TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 投稿（朝・夜ジャーナル統合）
CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id),
  type          TEXT NOT NULL CHECK (type IN ('morning','evening')),
  content       TEXT NOT NULL CHECK (char_length(content) <= 500),
  mood          INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  goal          TEXT,                    -- 朝：今日の目標
  gratitudes    TEXT[],                  -- 夜：感謝3つ
  ai_feedback   TEXT,                    -- Pro: AIフィードバック
  posted_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, posted_date, type)
);

-- リアクション
CREATE TABLE reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('cheer','empathy','amazing')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id, type)
);

-- コメント（ポジティブ限定）
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL CHECK (char_length(content) <= 200),
  is_flagged  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- バッジ
CREATE TABLE badge_definitions (
  id          TEXT PRIMARY KEY,          -- 'first_post','streak_7' etc.
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  description TEXT NOT NULL,
  condition   JSONB NOT NULL             -- {"type":"streak","value":7}
);

CREATE TABLE user_badges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  badge_id    TEXT NOT NULL REFERENCES badge_definitions(id),
  earned_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

-- Sho のメッセージ
CREATE TABLE sho_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('morning','weekly','member','announce')),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  target_plan TEXT DEFAULT 'free',       -- 'free','pro','premium'
  publish_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- レコメンド
CREATE TABLE recommendations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id), -- NULL = Sho投稿
  category    TEXT NOT NULL CHECK (category IN ('book','movie','place','word','habit')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 週間チャレンジ
CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  declaration TEXT NOT NULL,
  report      TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  week_start  DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

-- コンテンツモデレーションログ
CREATE TABLE moderation_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL,
  reason      TEXT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('warn','block_24h','ban')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 通報
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment')),
  target_id   UUID NOT NULL,
  reason      TEXT NOT NULL,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API 設計（Supabase Edge Functions）

| エンドポイント | メソッド | 機能 |
|---|---|---|
| `/functions/v1/ai-feedback` | POST | 投稿内容をClaude APIに送信し、フィードバックを生成 |
| `/functions/v1/moderate` | POST | 投稿内容をClaude APIでスキャン。禁止コンテンツを検出 |
| `/functions/v1/generate-morning` | POST | Shoの朝メッセージを30日分一括生成 |
| `/functions/v1/word-analysis` | GET | ユーザーの投稿テキストを形態素解析、頻出語TOP10 |
| `/functions/v1/sentiment-graph` | GET | ネガポジ比率の月次推移データを返す |
| `/functions/v1/monthly-report` | POST | 月次成長レポートをPDF生成 |
| `/functions/v1/growth-letter` | POST | 3ヶ月前の投稿を取得し、成長の手紙を生成 |
| `/functions/v1/check-badges` | POST | 投稿後にバッジ条件を判定し、未取得バッジを付与 |
| `/functions/v1/weekly-ranking` | GET | 週次ランキング3種を集計して返す |
| `/functions/v1/monthly-mvp` | POST | 月間MVPを総合スコアで自動選出 |
| `/functions/v1/stripe-webhook` | POST | Stripe決済イベントを受信し、プラン変更を反映 |

### AI フィードバック プロンプト（確定版）

```
あなたは「Sho」というキャラクターです。
Rizupアプリの中で、ユーザーの日記にフィードバックを返します。

■ Shoの人格
- 丸くてかわいい、不完全で親しみやすい
- 友達のように話す（敬語なし）
- 絶対に否定しない
- 小さな変化を見逃さない

■ フィードバックのルール
1. まず共感する（「〇〇だったんだね」）
2. 小さな進歩や強みを具体的に指摘する
3. 明日への前向きな一言で締める
4. 100〜150字以内
5. アドバイスは押しつけない
6. 説教しない

■ 入力
ユーザー名: {name}
投稿タイプ: {type} (morning/evening)
内容: {content}
気分: {mood}/5
今日の目標: {goal}
感謝: {gratitudes}
```

---

## 5. 画面一覧

| # | 画面 | パス | 内容 |
|---|---|---|---|
| 1 | ログイン | `/login` | メール / Google ログイン |
| 2 | サインアップ | `/signup` | アカウント作成 + 名前・目標・夢の初期設定 |
| 3 | ホーム | `/` | タイムライン + Shoの朝メッセージ |
| 4 | 朝ジャーナリング | `/post/morning` | 気分 + 今日の目標 + 一言 |
| 5 | 夜ジャーナリング | `/post/evening` | 振り返り + 感謝3つ + 気分 |
| 6 | 投稿詳細 | `/post/[id]` | 投稿 + AIフィードバック + コメント + リアクション |
| 7 | ランキング | `/ranking` | 3種ランキング + 月間MVP |
| 8 | おすすめ | `/recommend` | Sho + みんなのおすすめ |
| 9 | Shoメッセージ | `/sho` | 朝通知・週1コンテンツ・お知らせ |
| 10 | マイページ | `/profile` | プロフィール・バッジ・成長グラフ・投稿履歴 |
| 11 | 他ユーザー | `/user/[id]` | 他ユーザーのプロフィール・投稿 |
| 12 | 設定 | `/settings` | プロフィール編集・通知・プラン変更・ログアウト |
| 13 | 週間チャレンジ | `/challenge` | 宣言・報告・参加者一覧 |
| 14 | プラン選択 | `/pricing` | 無料/Pro/Premium比較 + Stripe Checkout |

---

## 6. 技術スタック（確定）

```
Next.js 14（App Router）
TailwindCSS
shadcn/ui
Supabase（Auth / PostgreSQL / Realtime / Storage / Edge Functions）
Claude API（claude-haiku-4-5）
Stripe（Checkout + Customer Portal + Webhook）
Vercel（デプロイ）
PWA（next-pwa）
Recharts（グラフ）
kuromoji.js（形態素解析）
jsPDF（月次レポートPDF生成）
```

---

## 7. 4週間開発ステップ

```
Week 1：基盤 & 認証
  Day 1  : Next.js + Tailwind + shadcn/ui セットアップ
  Day 2  : Supabase プロジェクト作成・全テーブル作成・RLS
  Day 3  : 認証（メール + Google）+ サインアップフロー
  Day 4  : プロフィール初期設定画面（名前・目標・夢）
  Day 5  : ボトムナビ・レイアウト・ルーティング
  Day 6-7: Shoキャラクター実装・朝通知の仕組み

Week 2：コア投稿 & タイムライン
  Day 8  : 朝ジャーナリング投稿画面
  Day 9  : 夜ジャーナリング投稿画面
  Day 10 : タイムライン（Realtime対応）
  Day 11 : ポジティブリアクション3種
  Day 12 : コメント機能（ポジティブ限定 + モデレーション）
  Day 13 : 連続投稿ストリーク計算
  Day 14 : Claude API連携（AIフィードバック生成）

Week 3：ランキング & 成長可視化
  Day 15 : ランキング3種（励まし/連続/感謝）
  Day 16 : バッジ制度（条件判定 + 付与 + 表示）
  Day 17 : 月間MVP自動選出
  Day 18 : モチベーショングラフ（Recharts）
  Day 19 : 投稿カレンダー（GitHub草風）
  Day 20 : 使った言葉ランキング（kuromoji.js）
  Day 21 : ネガポジ変化グラフ

Week 4：Sho発信 & 仕上げ
  Day 22 : Shoメッセージ画面・週1コンテンツ配信
  Day 23 : レコメンド画面（Sho + みんなの投稿）
  Day 24 : 週間チャレンジ機能
  Day 25 : Stripe連携（Checkout + Webhook + プラン管理）
  Day 26 : PWA設定・プッシュ通知
  Day 27 : コンテンツモデレーション実装
  Day 28 : βテスト公開・フィードバック収集
```

---

*作成：Sora（開発）/ 2026年4月*
