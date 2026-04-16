# 朝礼ブリーフィング（2026-04-17）

> 作成：Haru（秘書）/ 2026-04-16 夜更新
> 翔平さんが朝このファイルを開いて順番に実行すれば、今日のタスクが全て進みます。

---

## 最優先アクション（翔平さんが今日やること）

### 1. Supabase v5 SQL実行
- Supabase管理画面 → SQL Editor を開く
- `app/rizup-app/supabase-v5.sql` の内容をコピペして実行
- 次に `app/rizup-app/supabase-final-fix.sql` を実行
- 最後に `social-automation/supabase-seed-recommendations.sql` を実行
- 実行後、テーブル一覧で friends / journal_transformations / strength_gifts が存在することを確認

### 2. スレッズに投稿
- `marketing/threads-today.md` のパターン1をコピペして投稿
- 投稿後、いいね・リプライを確認（夕方にチェック）

### 3. Stripe設定開始
- Stripe管理画面 → 商品作成（Pro: ¥980/月、Premium: ¥1,980/月）
- Webhook URL: https://rizup-app.vercel.app/api/stripe-webhook
- Vercel環境変数に STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET を設定

### 4. クラウドワークス提案文送信
- `consulting/crowdworks-send-ready.md` の件名Aと本文をコピペ
- 対象案件に送信（最低3件）

---

## 今日の目標
- SQL実行完了 → v5.0の村機能が本番で動く状態にする
- スレッズ初投稿 → 共感フェーズ開始
- Stripe設定 → 課金可能状態にする
- CW送信 → 今月の受注1件に向けて動く

---

## 📝 補足

- このファイルは Haru が日次更新します。
- 翌日分は前夜（翔平さんの就寝前）に Haru がこのファイルを次の日付で上書き。
- 緊急ブロッカーがあれば `company/daily-report.md` の末尾に追記。

---

*Haru：おはようございます翔平さん。朝の1%、始めましょう*
