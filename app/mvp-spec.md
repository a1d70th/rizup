# Rizup アプリ MVP 仕様書

> 「毎日成長が見える、前向きな人だけが集まるSNS」

---

## 1. プロダクト概要

| 項目 | 内容 |
|---|---|
| アプリ名 | Rizup |
| コンセプト | 毎日の日記 × AI成長分析 × 仲間からの応援 |
| ターゲット | 20〜30代。夢はあるが自信がない。前向きになりたい人 |
| プラットフォーム | Web アプリ（PWA対応、モバイルファースト） |
| URL（予定） | app.rizup.vercel.app |

---

## 2. MVP 機能一覧

### 2-1. 毎日の日記投稿

| 項目 | 仕様 |
|---|---|
| 投稿制限 | 1日1投稿（MVP。v2で無制限化） |
| 入力内容 | テキスト（最大500文字）+ 気分スタンプ（5段階） |
| 気分スタンプ | 😔 → 😐 → 🙂 → 😊 → 🤩（1〜5） |
| 投稿時間 | 24時間いつでも。日付変更は午前4時 |
| 編集 | 投稿後1時間以内のみ編集可 |
| 削除 | 本人のみ可能 |

**UI フロー：**
```
ホーム画面
  → 「今日の一言を書く」ボタン
  → テキスト入力画面
     ├ テキストエリア（プレースホルダー「今日はどんな1日でしたか？」）
     ├ 気分スタンプ選択（5つ横並び）
     └ 「投稿する」ボタン
  → 投稿完了 → AIフィードバック表示
```

### 2-2. AIフィードバック

| 項目 | 仕様 |
|---|---|
| トリガー | 日記投稿完了時に自動生成 |
| 表示場所 | 投稿の直下にカード形式で表示 |
| 内容 | 投稿内容に対するポジティブなフィードバック（100〜200字） |
| AI | Claude API（claude-haiku-4-5 で高速応答） |
| トーン | 共感的・励まし・前向き。説教しない |

**プロンプト設計：**
```
あなたはRizupのAIコーチです。
ユーザーの日記投稿に対して、以下のルールで返信してください。

ルール：
1. まず共感する（「〇〇だったんですね」）
2. 小さな進歩を見つけて指摘する（「〇〇に気づけたのはすごい」）
3. 明日への前向きな一言で締める
4. 100〜200字以内
5. 絶対に否定しない。絶対にアドバイスを押しつけない
6. 敬語は使わない。友達のような親しみやすいトーン

ユーザーの投稿：
{post_content}

気分：{mood}/5
```

### 2-3. タイムライン

| 項目 | 仕様 |
|---|---|
| 表示内容 | 全ユーザーの投稿（新しい順） |
| 表示形式 | カード型リスト。名前・アイコン・テキスト・気分・リアクション数 |
| ページネーション | 無限スクロール（20件ずつ読み込み） |
| AIフィードバック | タイムライン上では非表示（自分の投稿詳細でのみ表示） |

### 2-4. ポジティブリアクション

| 項目 | 仕様 |
|---|---|
| リアクション種類 | 3つのみ |
| | 💪「応援してる」 |
| | 🤝「わかるよ」 |
| | ✨「すごい！」 |
| 操作 | タップで付与。もう一度タップで取り消し |
| 表示 | リアクション数を投稿カードの下部に表示 |
| ネガティブ | 存在しない。低評価・通報のみ（非表示で運営に送信） |

**設計意図：**
- 「いいね」ではなく3種類に分けることで、より具体的な応援を伝えられる
- ネガティブなリアクションを排除し、安全な空間を保つ

### 2-5. ユーザープロフィール

| 項目 | 仕様 |
|---|---|
| 表示名 | 必須（ニックネーム可） |
| アイコン | 任意（デフォルトはイニシャルアバター） |
| 一言自己紹介 | 最大100文字 |
| 今の目標 | 最大100文字 |
| 連続投稿日数 | 自動計算・表示 |
| 総投稿数 | 自動計算・表示 |

### 2-6. 成長グラフ

| 項目 | 仕様 |
|---|---|
| 表示場所 | プロフィール画面内 |
| グラフ① | 気分の推移（折れ線グラフ・過去30日） |
| グラフ② | 投稿カレンダー（GitHub風の草グラフ） |
| 計算 | フロントエンドで動的に生成 |

### 2-7. 毎朝の励まし通知

| 項目 | 仕様 |
|---|---|
| 送信時間 | 毎朝 7:00（JST） |
| 内容 | 児玉さんからの日替わり励ましメッセージ |
| 生成方法 | Claude API で事前に30日分生成しDBに保存 |
| 通知方法 | PWA プッシュ通知（Service Worker） |
| 例 | 「おはよう。今日も完璧じゃなくていいから、1個だけやってみよう。」 |

---

## 3. AI人物像の蓄積（v2機能・設計だけ先にやる）

### 概要

ユーザーの投稿を蓄積し、AIが「あなたの人物像」を分析・表示する機能。

### 分析項目

| 項目 | 内容 | 更新頻度 |
|---|---|---|
| 強み | 投稿から見える強み3つ | 月次 |
| 成長パターン | どんな時に前向きになれるか | 月次 |
| 変化 | 先月と比べた変化 | 月次 |
| 月次レポート | 1ヶ月の投稿サマリー | 月末 |

### プロンプト設計（月次分析用）

```
以下はユーザーの過去1ヶ月間の日記投稿です。
この人の「強み」「成長パターン」「先月からの変化」を分析してください。

ルール：
1. ポジティブな側面に焦点を当てる
2. 具体的な投稿内容を引用して根拠を示す
3. 「〇〇な人」ではなく「〇〇ができる人」と表現する
4. 300〜500字以内

投稿データ：
{posts_json}
```

---

## 4. 技術スタック

```
フロントエンド
  ├ Next.js 15（App Router）
  ├ Tailwind CSS
  ├ shadcn/ui（UIコンポーネント）
  ├ Recharts（グラフ描画）
  └ PWA対応（next-pwa）

バックエンド
  ├ Supabase
  │  ├ Auth（メール / Google ログイン）
  │  ├ PostgreSQL（データベース）
  │  ├ Realtime（タイムラインの即座更新）
  │  └ Storage（プロフィール画像）
  └ Supabase Edge Functions（サーバーレス処理）

AI
  ├ Claude API（claude-haiku-4-5）
  │  ├ 日記へのフィードバック生成
  │  ├ 毎朝の励ましメッセージ生成
  │  └ 月次人物像分析（v2）
  └ API呼び出しは Edge Function 経由

ホスティング
  └ Vercel（既に利用中）

ドメイン
  └ app.rizup.vercel.app（MVP）
  └ app.rizup.jp（将来的に独自ドメイン）
```

---

## 5. データベース設計

```sql
-- ユーザー（Supabase Auth と連携）
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  avatar_url  TEXT,
  bio         TEXT DEFAULT '',
  goal        TEXT DEFAULT '',
  streak      INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 日記投稿
CREATE TABLE posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id),
  content     TEXT NOT NULL CHECK (char_length(content) <= 500),
  mood        INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  ai_feedback TEXT,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, posted_date)  -- 1日1投稿制限
);

-- リアクション
CREATE TABLE reactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  type        TEXT NOT NULL CHECK (type IN ('cheer', 'empathy', 'amazing')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (post_id, user_id, type)  -- 同じリアクションは1回のみ
);

-- 毎朝の励ましメッセージ
CREATE TABLE daily_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL,
  target_date DATE NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- ポリシー（例：投稿は全員が読めるが、作成は本人のみ）
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 6. 画面一覧

| # | 画面名 | パス | 内容 |
|---|---|---|---|
| 1 | ログイン | `/login` | メール or Google ログイン |
| 2 | サインアップ | `/signup` | アカウント作成 + プロフィール初期設定 |
| 3 | ホーム（タイムライン） | `/` | 全ユーザーの投稿一覧 + 投稿ボタン |
| 4 | 投稿画面 | `/post` | テキスト入力 + 気分選択 |
| 5 | 投稿詳細 | `/post/[id]` | 投稿 + AIフィードバック + リアクション |
| 6 | マイページ | `/profile` | 自分のプロフィール + 成長グラフ + 投稿履歴 |
| 7 | 他ユーザーページ | `/user/[id]` | 他ユーザーのプロフィール + 投稿 |
| 8 | 設定 | `/settings` | プロフィール編集・通知設定・ログアウト |

---

## 7. 開発ステップ

```
Week 1：プロジェクト初期化 & 認証
  Day 1-2：Next.js プロジェクト作成・Tailwind・shadcn/ui セットアップ
  Day 3-4：Supabase プロジェクト作成・DB スキーマ・RLS設定
  Day 5-7：認証（ログイン・サインアップ・プロフィール初期設定）

Week 2：コア機能
  Day 8-9：日記投稿機能（作成・表示・編集・削除）
  Day 10-11：タイムライン（一覧表示・無限スクロール）
  Day 12-14：Claude API 連携（AIフィードバック生成）

Week 3：ソーシャル & 可視化
  Day 15-16：ポジティブリアクション（3種）
  Day 17-18：成長グラフ（気分推移・投稿カレンダー）
  Day 19-21：毎朝の励まし通知（PWA Push）

Week 4：仕上げ
  Day 22-23：UI/UX 磨き込み・レスポンシブ対応
  Day 24-25：PWA 設定（オフライン対応・ホーム画面追加）
  Day 26-27：βテスト（Discord メンバー10人に公開）
  Day 28：フィードバック反映 → 正式公開
```

---

## 8. 非機能要件

| 項目 | 仕様 |
|---|---|
| パフォーマンス | タイムライン表示 < 2秒。AI応答 < 5秒 |
| セキュリティ | Supabase RLS による行レベルセキュリティ。APIキーはサーバー側のみ |
| 可用性 | Vercel + Supabase の SLA に準拠 |
| スケーラビリティ | 1,000ユーザーまではSupabase無料プランで対応可能 |
| アクセシビリティ | セマンティックHTML。キーボード操作対応 |

---

*作成：Sora（開発）/ 2026年4月*
