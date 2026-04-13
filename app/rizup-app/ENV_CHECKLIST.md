# 環境変数チェックリスト（Vercel本番）

> 作成：2026-04-13 / Sora（CTO）
> 対象：`rizup-app.vercel.app`

---

## 1. 現状

### `.env.local`（ローカル）
```
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
```
→ **placeholder のみ**。ローカル動作確認はVercel環境のPreviewデプロイ or 本番で行う運用。

### `vercel.json`
- framework: nextjs
- crons: `/api/cron/morning-notification` を毎日 22:00 UTC（JST 07:00）に実行

---

## 2. 必須環境変数（全11件）

| カテゴリ | キー | 取得先 | 状態 |
|---|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings → API | ❓ 要確認 |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings → API | ❓ 要確認 |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings → API | 🔴 **未設定（要対応）** |
| Claude | `ANTHROPIC_API_KEY` | console.anthropic.com | ❓ 要確認 |
| Stripe | `STRIPE_SECRET_KEY` | dashboard.stripe.com | 🔴 **未設定** |
| Stripe | `STRIPE_WEBHOOK_SECRET` | Stripe Webhooks 作成後 | 🔴 **未設定** |
| Stripe | `STRIPE_PRO_PRICE_ID` | Stripe Products | ❓ 要確認 |
| Stripe | `STRIPE_PREMIUM_PRICE_ID` | Stripe Products | ❓ 要確認 |
| Cron | `CRON_SECRET` | 任意文字列（推奨ランダム16byte） | ❓ 要確認 |
| Resend | `RESEND_API_KEY` | resend.com | ❓ 要確認 |
| Resend | `FROM_EMAIL` | Resend認証済みアドレス | ❓ 要確認 |

## 3. 確認方法

### Vercelで確認
```
vercel env pull .env.local
```
このコマンドで Vercel 本番の環境変数を `.env.local` に吸い上げられます（要 vercel CLI login）。

### Dashboardで確認
1. https://vercel.com/dashboard
2. `rizup-app` プロジェクトを選択
3. Settings → Environment Variables
4. 一覧を表示 → 上記チェックリストと照合

---

## 4. 優先的に対応すべき項目（本番ローンチに必須）

### 🔴 Priority 1：Stripe 3点セット
- `STRIPE_SECRET_KEY`（本番モードの `sk_live_...`）
- `STRIPE_WEBHOOK_SECRET`（エンドポイント登録後に発行）
- `STRIPE_PRO_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID`

**手順**：
1. Stripeダッシュボードで「本番モード」に切り替え
2. Products → 2商品作成（Pro ¥780/月、Premium ¥1,480/月）
3. 各Price IDをコピー
4. Developers → Webhooks → エンドポイント追加：
   `https://rizup-app.vercel.app/api/stripe/webhook`
   Events: `checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`
5. Signing secret をコピー

### 🔴 Priority 2：`SUPABASE_SERVICE_ROLE_KEY`
現状 Vercel に設定されているか不明。以下のAPIルートが依存：
- `/api/mvp` → 削除済み
- `/api/warn` → 管理者警告送信
- `/api/cron/morning-notification` → Sho朝通知
- `/api/analyze/score` → ポジティブ度採点
- `/api/stripe/webhook` → plan自動更新（**新規・最重要**）

## 5. Vercel へ一括登録する手順

### 方法A：Dashboard（GUI）
1. Vercel Dashboard → rizup-app → Settings → Environment Variables
2. `.env.production.example` の各項目を1行ずつ Add
3. Environment は **Production** にチェック（Preview/Development は任意）
4. Save → Redeploy でキックオフ

### 方法B：CLI（まとめて投入）
```bash
cd app/rizup-app
echo "sk_live_xxx" | vercel env add STRIPE_SECRET_KEY production
echo "whsec_xxx" | vercel env add STRIPE_WEBHOOK_SECRET production
# ...以下同様
vercel --prod  # 再デプロイ
```

---

## 6. 動作検証（env投入後）

| 検証項目 | 想定結果 |
|---|---|
| `/api/stripe/checkout` POST with `{plan:"pro"}` | `{url: "https://checkout.stripe.com/..."}` |
| Stripe Checkout テストカード `4242 4242 4242 4242` で決済 | `profiles.plan = "pro"` に自動更新 |
| `/api/sho-insight` POST | Claude API で Sho メッセージ生成 |
| `/api/moderate` POST `{content:"..."}` | `{safe: true/false}` |
| `/api/cron/morning-notification` GET with `Authorization: Bearer ${CRON_SECRET}` | `{sent: N}` |

---

*Sora（CTO）/ 2026-04-13 / Rizup v3.1*
