# Rizup HQ — AI引継ぎファイル（v3.1）

> 新しいチャットを開いたらまずこのファイルを読んで即作業開始。確認不要。
> **最終更新：2026-04-13（Rizup v3.1 リリース）**

---

## 本人
児玉翔平・28歳・大阪・資金200万・株式会社Rizup代表
今月目標：20万円 / 来月目標：30万円

---

## Rizup アプリ（v3.1 完成 — 2026-04-13）

### URL
- **App**: https://rizup-app.vercel.app
- **LP**: https://rizup.vercel.app
- **GitHub**: https://github.com/a1d70th/rizup
- **Supabase**: プロジェクトID `pcysqlvvqqfborgymabl`

### 技術スタック
Next.js 14 (App Router) / TypeScript / TailwindCSS / Supabase (Auth + Postgres + Storage + RLS) / Claude API (`claude-haiku-4-5-20251001`) / Stripe (Checkout + Webhook) / Vercel / PWA

### 実装済み機能（v3.1）

#### コア機能（引き算の結果残したもの）
| 機能 | パス | 内容 |
|---|---|---|
| 朝夜ジャーナル | `/journal` | 朝→夜ループ接続・独立カラム・モデレーション・crisis対応 |
| ビジョンボード | `/vision` | 4階層（最終/3年/1年/今月）×6カテゴリ・進捗自動計算・達成予測 |
| アンチビジョン | `/anti-vision` | 避けたい未来 最大5件 |
| 習慣トラッカー | `/habits` | 最大10個・ビジョン紐付け・30/90/365日複利予測 |
| 今日のToDo | `/today` | 朝ジャーナルから3つ選択・1タップ完了・翌日持ち越し |
| 成長グラフ | `/growth` | 理想vs実績の複利曲線・気分/睡眠/ポジティブ度時系列 |
| タイムライン | `/home` | 仲間の投稿・応援3種（cheer/relate/amazing） |
| おすすめ | `/recommend` | 6カテゴリ（cafe/book/movie/weekend/quote/music） |

#### 複利エフェクト（ダーレン・ハーディ The Compound Effect）
- `lib/compound.ts`：毎日1%が1年で+3678%の計算エンジン
- ホーム：Sho挨拶に「連続n日・今日の複利 +X%」を🔥アニメ付きで表示
- 夜ジャーナル：複利スコア(0-100) = ToDo × 習慣 × 気分
- 各ビジョンに「あと◯日で達成」予測

#### UI/UX（2025年最高峰トレンド適用）
- グラスモーフィズム（`.glass-mint` / `.glass`）
- ダークモード（`prefers-color-scheme` 自動追従）
- マイクロインタラクション：Shoジャンプ / 紙吹雪 / 炎パルス / カウントアップ
- 全ボタン 44px以上タップターゲット

#### 削除したもの（コンセプト違反）
- ランキング・MVP・バッジ全廃止
- VIP tier 廃止
- 週間チャレンジ（ビジョン月次とToDoで代替）
- デッドコード（vision_boards / demo-data.ts / mockup.html）

---

## ⚠️ 現在の残タスク（ローンチ前に必須）

### 🔴 Priority 1：Supabaseマイグレーション実行
`app/rizup-app/supabase-v3-rebuild.sql` を Supabase SQL Editor で **Run**
→ https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new

### 🔴 Priority 2：Stripe 本番設定
1. Stripe本番モードで Pro ¥780 / Premium ¥1,480 の商品作成
2. Webhook エンドポイント `https://rizup-app.vercel.app/api/stripe/webhook` を登録
3. Events: `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`
4. Vercel環境変数に `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID` を投入
5. 詳細：`app/rizup-app/ENV_CHECKLIST.md`

### 🟠 Priority 3：ユーザー獲得
- X発信開始（`marketing/x-profile.md` 参照）
- note月1本執筆
- Discord β（10名目標）

---

## 収益源（全部同時並行）

### Rizup アプリ
プラン：Free / Pro ¥780 / Premium ¥1,480（VIP廃止）
状況：v3.1 デプロイ済み・Stripe未完了
今月目標：有料ユーザー10名

### クラウドワークス
LP制作・広告運用・店長経験系・英語系で応募中
提案文：`consulting/crowdworks-proposal-final.md`（v2）
応募済み7件・スカウト① 条件提示文準備完了
今月目標：受注1件 ¥150,000

### note
有料記事＋アフィリ・今月準備・来月本格稼働

### SNS（X）
児玉翔平 / @shohei_rizup 準備中
プロフィール・初回3投稿：`marketing/x-profile.md`
毎朝投稿 + コミュニティ告知 + アフィリ

---

## AI社員（skillsファイル）

### 配置
```
C:\Users\81806\Desktop\rizup\.claude\agents\
  ├── sora-cto.md         # Sora（CTO）— 開発・実装・デプロイ
  ├── haru-secretary.md   # Haru（秘書）— 進捗管理・Notion記録
  ├── kai-cmo.md          # Kai（CMO）— 市場リサーチ・競合分析
  ├── rei-cco.md          # Rei（CCO）— X・note・コンテンツ制作
  ├── leo-cso.md          # Leo（CSO）— クラウドワークス営業
  └── qa-reviewer.md      # QA — 品質レビュー
```

### 呼び出し方
`/sora-cto` や `Agent` ツールで `subagent_type: general-purpose` + プロンプトにペルソナ指定。

### 役割分担
| 社員 | 担当事業 | 主要KPI |
|---|---|---|
| Sora | アプリ開発 | LP CVR / バグ修正 / 週次デプロイ |
| Haru | 経営管理 | タスク完了率 / 日報作成 |
| Kai | リサーチ | 月2本レポート / 4案/月提案 |
| Rei | マーケ | X月30本 / note月8本 / フォロワー+300/月 |
| Leo | 営業 | CW提案月10件 / 受注3件 / 月15万円 |
| QA | 品質 | コミット前レビュー |

---

## 毎日のルーティン
06:30 起床・朝ジャーナル（Rizupアプリ）・SNS投稿
09:00 CW提案10件 / 朝礼（`company/morning-briefing-tomorrow.md`）
13:00 note・コミュニティ管理
17:00 ジム
19:00 アプリ改善
21:00 夜ジャーナル・日報

---

## 重要ファイル一覧

| ファイル | 用途 |
|---|---|
| `company/spec.md` | Rizup v3 仕様書（確定版） |
| `app/rizup-app/supabase-v3-rebuild.sql` | DB統合マイグレーション |
| `app/rizup-app/ENV_CHECKLIST.md` | Vercel環境変数チェックリスト |
| `app/rizup-app/.env.production.example` | Vercel本番env雛形 |
| `consulting/crowdworks-proposal-final.md` | CW提案文（v2） |
| `marketing/x-profile.md` | X初回プロフィール・投稿3本 |
| `company/notion-workspace.md` | Notion構築手順 |
| `company/morning-briefing-tomorrow.md` | 翌朝の朝礼コマンド |
| `company/kpi.md` | 30万円達成までのKPI |
| `company/workflow.md` | 部門間連携ワークフロー |

---

*最終更新：2026-04-13 / Rizup v3.1 / 児玉翔平・株式会社Rizup*
