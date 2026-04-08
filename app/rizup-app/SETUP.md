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

## 5.5. メール送信の設定（Resend SMTP）

Supabaseの無料プランはメール送信が **1時間4通まで** です。
Resend の SMTP を使うことで制限を解除できます。

1. Supabase ダッシュボード → **Project Settings** → **Authentication** → **SMTP Settings**
2. **Enable Custom SMTP** を ON にする
3. 以下を入力：

| 設定 | 値 |
|---|---|
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **User** | `resend` |
| **Password** | Resend の API Key（`re_` で始まる文字列） |
| **Sender email** | `onboarding@resend.dev`（または自分のドメイン） |

4. 「Save」をクリック

> Resend の API Key は `https://resend.com/api-keys` で取得できます。

## 5.6. Supabase 認証 URL 設定（必須）

1. Supabase ダッシュボード → **Authentication** → **URL Configuration**
2. 以下を設定：

| 設定 | 値 |
|---|---|
| **Site URL** | `https://rizup-app.vercel.app` |
| **Redirect URLs** | `https://rizup-app.vercel.app/auth/callback` |

3. 「Save」をクリック

> **重要**: この設定がないと Google / Apple ログイン後のコールバックが失敗します。
> Redirect URLs には `https://rizup-app.vercel.app/auth/callback` を **必ず** 追加してください。

## 6. Google 認証を有効化

### 6-1. Google Cloud Console 設定

1. `https://console.cloud.google.com` にアクセス
2. プロジェクトを選択（または新規作成）
3. **APIs & Services** → **OAuth consent screen**
   - User Type：External
   - App name：`Rizup`
   - Support email：自分のメールアドレス
   - Authorized domains：`rizup-app.vercel.app` と `xxxxx.supabase.co`
   - 「Save and Continue」→ Scopes はデフォルトで OK → Test users は追加不要
4. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
   - Application type：**Web application**
   - Name：`Rizup Web`
   - Authorized JavaScript origins：
     - `https://rizup-app.vercel.app`
   - Authorized redirect URIs：
     - `https://xxxxx.supabase.co/auth/v1/callback`
   - 「Create」をクリック
5. **Client ID** と **Client Secret** をコピー

### 6-2. Supabase に設定

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Google** を有効化（トグル ON）
3. 以下を入力：
   - **Client ID**：Google Cloud Console でコピーした Client ID
   - **Client Secret**：Google Cloud Console でコピーした Client Secret
4. **Redirect URL** が表示される（`https://xxxxx.supabase.co/auth/v1/callback`）
   - これが Google Cloud Console の Authorized redirect URIs と一致していることを確認
5. 「Save」をクリック

### 6-3. 動作確認

1. アプリの `/login` にアクセス
2. 「Google でログイン」をクリック
3. Google アカウントを選択
4. `/auth/callback` → `/home`（初回は `/onboarding`）にリダイレクトされる

## 7. Claude API（Sho Insight）を有効化

1. `https://console.anthropic.com` でAPIキーを取得
2. Vercel → Environment Variables に追加：

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |

3. Redeploy → ホーム画面の「今日の Sho Insight」がパーソナライズされたメッセージに変わる
4. APIキー未設定でもフォールバックメッセージが表示されるので、アプリは動作する

## 8. Apple ログインを有効化

### 8-1. Apple Developer Console 設定

1. Apple Developer Program に登録（年額 $99）: `https://developer.apple.com/programs/`
2. `https://developer.apple.com/account` → **Certificates, Identifiers & Profiles**

#### App ID の作成
3. **Identifiers** → **+** ボタン → **App IDs** → **App**
   - Description：`Rizup`
   - Bundle ID：`com.rizup.app`（Explicit）
   - Capabilities → **Sign In with Apple** にチェック
   - 「Continue」→「Register」

#### Service ID の作成
4. **Identifiers** → **+** ボタン → **Services IDs**
   - Description：`Rizup Web Login`
   - Identifier：`com.rizup.app.web`
   - 「Continue」→「Register」
5. 作成した Service ID をクリック → **Sign In with Apple** にチェック → **Configure**
   - Primary App ID：`com.rizup.app`（さきほど作成した App ID）
   - Domains：`xxxxx.supabase.co`（Supabase プロジェクトのドメイン）
   - Return URLs：`https://xxxxx.supabase.co/auth/v1/callback`
   - 「Done」→「Continue」→「Save」

#### Key の作成
6. **Keys** → **+** ボタン
   - Key Name：`Rizup Sign In`
   - **Sign In with Apple** にチェック → **Configure** → Primary App ID：`com.rizup.app`
   - 「Continue」→「Register」
7. **Key ID** をメモ → **Download** で `.p8` ファイルをダウンロード（**1回しかDLできない！**）
8. **Team ID** は Apple Developer アカウントの右上、またはメンバーシップ詳細に表示される

### 8-2. Supabase に設定

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Apple** を有効化（トグル ON）
3. 以下を入力：
   - **Service ID (Client ID)**：`com.rizup.app.web`
   - **Team ID**：Apple Developer アカウントの Team ID
   - **Key ID**：ステップ 7 でメモした Key ID
   - **Private Key**：`.p8` ファイルの内容を貼り付け（`-----BEGIN PRIVATE KEY-----` 〜 `-----END PRIVATE KEY-----`）
4. **Redirect URL** が `https://xxxxx.supabase.co/auth/v1/callback` と一致することを確認
5. 「Save」をクリック

### 8-3. 動作確認

1. アプリの `/login` にアクセス
2. 「Apple でログイン」をクリック
3. Apple ID でサインイン（メール非公開オプションあり）
4. `/auth/callback` → `/home`（初回は `/onboarding`）にリダイレクトされる

### 注意事項
- Apple Sign In はローカル開発（localhost）では動作しない — Vercel 上でテストすること
- Apple はメールアドレスを非公開にするオプションがある — `profiles.email` が `@privaterelay.appleid.com` になる場合がある
- `.p8` キーファイルは安全に保管し、Git にコミットしないこと

## 9. Stripe 決済の設定

### 9-1. Stripe アカウント作成

1. `https://stripe.com/jp` でアカウント作成
2. 本人確認・銀行口座を登録

### 9-2. 商品と価格を作成

Stripe ダッシュボード → 商品 → 商品を追加：

| プラン | 月額 | Price ID |
|---|---|---|
| Pro | ¥980 | `price_1TJrqX2L4WVM0isfmmryC15w` |
| Premium | ¥1,980 | `price_1TJrr92L4WVM0isfGz0qxfpn` |
| VIP | ¥2,980 | `price_1TJrrh2L4WVM0isfG62PrANr` |

### 9-3. 環境変数を設定

Vercel → Environment Variables に追加：

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` |
| `STRIPE_PRO_PRICE_ID` | `price_1TJrqX2L4WVM0isfmmryC15w` |
| `STRIPE_PREMIUM_PRICE_ID` | `price_1TJrr92L4WVM0isfGz0qxfpn` |
| `STRIPE_VIP_PRICE_ID` | `price_1TJrrh2L4WVM0isfG62PrANr` |

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
