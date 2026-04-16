# 明日の優先順位 TOP5（2026-04-17 木曜 朝イチ実行）

> 作成：Haru（秘書）/ 2026-04-16 夜更新（v5.4 リリース後）

---

## 🥇 #1（最重要）— Supabase v5 SQL実行（5分）

Supabase管理画面 → SQL Editor を開く
→ `app/rizup-app/supabase-execute-now.sql` の内容をまるごとコピペして実行
→ 全て IF NOT EXISTS なので何度実行しても安全

**実行後に確認すること：**
- テーブル一覧に `friends` / `journal_transformations` / `strength_gifts` が存在
- `profiles` テーブルに `character_animal` / `character_name` / `strengths` カラムが存在
- `habit_logs` / `journal_todos` / `recommendations` テーブルが存在

---

## 🥈 #2 — スレッズ初投稿（3分）

`marketing/threads-today.md` のパターン1をコピペして投稿
テーマ：「何もできなかった日の話」

> GUで働いてた頃、休みの日に何もできんかった。
> （以下、threads-today.md のパターン1を使用）

投稿後、夕方にいいね・リプライを確認

---

## 🥉 #3 — Stripe 本番設定（20分）

1. Stripe管理画面 → 商品作成
   - Pro: ¥980/月
   - Premium: ¥1,980/月
2. Webhook URL: `https://rizup-app.vercel.app/api/stripe/webhook`
3. Vercel環境変数に設定:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
4. テストカードで `/premium` 通し

---

## 🏅 #4 — クラウドワークス提案文送信（10分）

`consulting/crowdworks-send-ready.md` の件名Aと本文をコピペ
→ 対象案件に最低3件送信
→ `○○株式会社` `○○様` を実際の企業名に置換
→ Zoom候補日: 4/17(木), 4/20(月), 4/21(火)

---

## 🎖 #5 — App Store 申請準備（30分）

1. `app-store/APP_STORE_GUIDE.md` を確認
2. Capacitor ラップ → ビルド
3. `app-store/` の4点セット確認
4. App Store Connect にアップロード

---

## 📊 到達ライン
- [ ] #1 Supabase SQL実行 → v5.0の村機能が本番で動く
- [ ] #2 スレッズ初投稿 → 共感フェーズ開始
- [ ] #3 Stripe設定 → 課金可能状態にする
- [ ] #4 CW送信 → 今月の受注1件に向けて動く
- [ ] #5 App Store → アプリ配信準備

**5/5 → 今週のマイルストーン突破 / 3/5 → 良い1日 / 1/5 → 動けただけ偉い**

---

*Haru より：v5.4 "タップだけで完結" リリースおつかれさまでした🌿*
