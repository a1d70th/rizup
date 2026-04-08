# Rizup App — Supabase セットアップ手順

## 1. Supabase プロジェクト作成

1. `https://supabase.com` にアクセスしてログイン
2. 「New project」をクリック
3. 以下を入力：
   - Organization：自分のorg
   - Name：`rizup`
   - Database Password：強力なパスワードを設定（メモしておく）
   - Region：`Northeast Asia (Tokyo)`
4. 「Create new project」をクリック

## 2. DB テーブルを作成

1. Supabase ダッシュボード → 左メニューの **「SQL Editor」** をクリック
2. 「New query」をクリック
3. `supabase-schema.sql` の内容を全てコピーして貼り付け
4. **「Run」** をクリック
5. 全テーブルが作成されたことを確認（Table Editor で確認可能）

## 3. 環境変数を取得

1. Supabase ダッシュボード → **「Settings」** → **「API」**
2. 以下の2つをコピー：
   - **Project URL**（`https://xxxxx.supabase.co`）
   - **anon public key**（`eyJhbGci...` で始まる長い文字列）

## 4. ローカル開発の場合

`app/rizup-app/.env.local` を作成：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 5. Vercel デプロイの場合

1. Vercel ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. 以下を追加：

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |

3. **Redeploy** をクリック

## 6. Google 認証を有効化（任意）

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Google** を有効化
3. Google Cloud Console で OAuth 2.0 クライアント ID を作成
4. Client ID と Secret を Supabase に入力
5. Redirect URL：`https://xxxxx.supabase.co/auth/v1/callback`

## 7. Claude API（Sho Insight）を有効化

1. `https://console.anthropic.com` でAPIキーを取得
2. Vercel → Environment Variables に追加：

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |

3. Redeploy → ホーム画面の「今日の Sho Insight」がパーソナライズされたメッセージに変わる
4. APIキー未設定でもフォールバックメッセージが表示されるので、アプリは動作する

## 8. Apple ログインを有効化（任意）

1. Apple Developer Program に登録（年額 $99）
2. Certificates, Identifiers & Profiles → Sign in with Apple の設定
3. Service ID を作成：
   - Identifier：`com.rizup.app`
   - Return URL：`https://xxxxx.supabase.co/auth/v1/callback`
4. Supabase → Authentication → Providers → **Apple** を有効化
5. Service ID / Team ID / Key ID / Private Key を入力

## 9. Stripe 決済の設定

### 9-1. Stripe アカウント作成

1. `https://stripe.com/jp` でアカウント作成
2. 本人確認・銀行口座を登録

### 9-2. 商品と価格を作成

Stripe ダッシュボード → 商品 → 商品を追加：

| プラン | 月額 | Price ID（作成後にメモ） |
|---|---|---|
| Pro | ¥980 | `price_pro_xxxx` |
| Premium | ¥1,980 | `price_premium_xxxx` |
| VIP | ¥2,980 | `price_vip_xxxx` |

### 9-3. 環境変数を設定

Vercel → Environment Variables に追加：

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` |
| `NEXT_PUBLIC_STRIPE_PRICE_PRO` | `price_pro_xxxx` |
| `NEXT_PUBLIC_STRIPE_PRICE_PREMIUM` | `price_premium_xxxx` |
| `NEXT_PUBLIC_STRIPE_PRICE_VIP` | `price_vip_xxxx` |

### 9-4. Webhook を設定

1. Stripe → Developers → Webhooks → エンドポイントを追加
2. URL：`https://rizup-app.vercel.app/api/stripe-webhook`
3. イベント：
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Signing Secret を `STRIPE_WEBHOOK_SECRET` に設定

## 10. 動作確認

1. アプリにアクセス → 新規登録
2. メール確認 → オンボーディング（名前・夢・星座・タイプ診断）
3. ホーム画面 → Sho Insight が表示される
4. ジャーナリング投稿 → タイムラインに表示される
5. リアクション → カウントが増減する
6. プロフィール → 投稿数・ストリーク・バッジが表示される
