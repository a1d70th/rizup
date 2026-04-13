# Social Automation — 必要な環境変数

> 作成：2026-04-13 / Rei（CCO）
> 使用：`social-automation/*.mjs` 実行時に `.env.local` から自動読み込み

---

## 📋 `.env.local` に記載すべき変数

`C:\Users\81806\Desktop\rizup\.env.local`（**git管理外・`.gitignore`で除外済**）に以下を書く：

```dotenv
# ── Threads（Meta）─────────────────────────────────
# Meta Developer: https://developers.facebook.com/apps/
THREADS_ACCESS_TOKEN=THAAx...
THREADS_USER_ID=17841xxxxxxxxxxx

# ── X（Twitter API v2）──────────────────────────────
# X Developer Portal: https://developer.x.com/en/portal/dashboard
X_API_KEY=xxx
X_API_SECRET=xxx
X_ACCESS_TOKEN=xxx
X_ACCESS_TOKEN_SECRET=xxx

# ── 通知（オプション）─────────────────────────────
# いずれか1つ以上を設定すると投稿完了時に通知が届く
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
RESEND_API_KEY=re_xxx
NOTIFY_EMAIL=a1d.70th@gmail.com
FROM_EMAIL=noreply@rizup.app
```

---

## 🔑 Threads API 取得手順（Meta Graph API）

### 1. Meta Developer アカウント登録
https://developers.facebook.com/ にログイン（Facebookアカウントで）

### 2. アプリ作成
- **Create App** → 「その他」→ 「ビジネス」
- 表示名：`Rizup Social`
- 追加製品：**Threads API**

### 3. Threads 権限スコープ
- `threads_basic`
- `threads_content_publish`
- `threads_manage_insights`（任意）

### 4. アクセストークン発行
- App Dashboard → Threads API → **Generate access token**
- 長期トークン（60日）を取得 → `THREADS_ACCESS_TOKEN` にセット
- User ID は Graph API Explorer で `me` をクエリ → `id` フィールドを `THREADS_USER_ID` にセット

---

## 🔑 X API 取得手順（X Developer Portal）

### 1. Developer Portal 登録
https://developer.x.com/en/portal/dashboard
無料プラン（Free）でも **月1,500ツイートまで自動投稿可能**（v2基準）

### 2. プロジェクト＋アプリ作成
- **Create Project** → 目的「Making a bot」を選ぶ
- **Create App** → 名前：`Rizup Auto Poster`

### 3. Permissions 設定
- User authentication settings → **Read and write**（必須）
- Type: **Web App**
- Callback URL: `http://localhost/callback`（使わないがダミーで必須）
- Website URL: `https://rizup-app.vercel.app`

### 4. Keys & Tokens
- **API Key and Secret** → 生成 → `X_API_KEY` / `X_API_SECRET`
- **Access Token and Secret** → **Generate** → `X_ACCESS_TOKEN` / `X_ACCESS_TOKEN_SECRET`
  - **Read and Write 権限のトークンが必要**（権限変更後に再生成）

### ⚠️ X API の注意点
- 無料プランは **月1,500ツイートまで / 1日約50ツイート**
- OAuth 1.0a User Context が推奨（投稿権限あり）
- v2 POST `/2/tweets` を使用

---

## 🔔 通知の設定（オプション）

### Discord Webhook（推奨・簡単）
1. Discord サーバーの「サーバー設定」→「連携サービス」→「ウェブフック」→ 新規
2. URLをコピー → `DISPATCH_SECRET` 不要

### Resend（メール通知）
1. https://resend.com でアカウント作成
2. API Keys → 生成 → `RESEND_API_KEY`
3. Domain を認証（または `onboarding@resend.dev` を From として使用可）

---

## ✅ セットアップ確認コマンド

```bash
cd C:\Users\81806\Desktop\rizup
node social-automation/check-env.mjs
```

すべての必須キーが揃っているかチェックします。

---

*Rei（CCO）/ 2026-04-13 / Rizup*
