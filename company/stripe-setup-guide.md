# Stripe設定ガイド（翔平さん用・15分で完了）

> 作成：Haru / 2026-04-16

---

## Step 1: Stripeダッシュボードにログイン（2分）

1. https://dashboard.stripe.com にアクセス
2. アカウントがなければ新規作成（メール：a1d.70th@gmail.com）
3. 本番モードに切り替え（テストモードのトグルをOFF）

---

## Step 2: 商品を作成（3分）

1. 左メニュー → 「商品」→「商品を追加」

### Rizup Pro
- 商品名：`Rizup Pro`
- 説明：`毎日の気分記録・キャラ育成・週次レポート`
- 価格：`¥480` / 月（recurring・定期）
- 作成後、価格ID（`price_xxx...`）をメモ → **STRIPE_PRO_PRICE_ID**

### （将来用）Rizup Premium
- 商品名：`Rizup Premium`
- 価格：`¥980` / 月
- 作成後、価格IDをメモ → **STRIPE_PREMIUM_PRICE_ID**

---

## Step 3: Webhook設定（3分）

1. 左メニュー → 「開発者」→「Webhook」→「エンドポイントを追加」
2. エンドポイントURL：
   ```
   https://rizup-app.vercel.app/api/stripe/webhook
   ```
3. リッスンするイベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. 「エンドポイントを追加」をクリック
5. 署名シークレット（`whsec_xxx...`）をメモ → **STRIPE_WEBHOOK_SECRET**

---

## Step 4: APIキーを取得（1分）

1. 左メニュー → 「開発者」→「APIキー」
2. **シークレットキー**（`sk_live_xxx...`）をコピー → **STRIPE_SECRET_KEY**
3. **公開可能キー**（`pk_live_xxx...`）をコピー → **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**

---

## Step 5: Vercel環境変数に設定（3分）

1. https://vercel.com → rizup-app プロジェクト → Settings → Environment Variables
2. 以下を追加（Production環境）：

| キー | 値 |
|------|-----|
| `STRIPE_SECRET_KEY` | `sk_live_xxx...` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx...` |
| `STRIPE_PRO_PRICE_ID` | `price_xxx...` |

3. 「Save」→ Deployments → 最新を「Redeploy」

---

## Step 6: テスト確認（3分）

1. https://rizup-app.vercel.app/premium にアクセス
2. Proプランの「始める」をタップ
3. Stripeチェックアウト画面が開くことを確認
4. テストカード（`4242 4242 4242 4242`）で決済テスト
   ※本番モードでは実際のカードが必要

---

## 完了チェックリスト
- [ ] Stripe商品作成（Pro ¥480/月）
- [ ] Webhook URL登録
- [ ] APIキー3つ + 価格ID → Vercel環境変数
- [ ] Redeploy
- [ ] /premium でチェックアウト画面が開く

**所要時間：約15分**
