# Rizup Social Automation

> Threads と X に自動投稿するスクリプト群。
> 投稿文は `marketing/x-profile.md` のコードブロックから自動抽出、重複投稿を防止。

---

## 📁 構成

```
social-automation/
  _utils.mjs             共通ユーティリティ（.env読み込み・投稿候補抽出・重複チェック・通知）
  threads-post.mjs       Threads Graph API で投稿
  x-post.mjs             X API v2 (OAuth 1.0a) で投稿
  social-scheduler.mjs   朝8/昼12/夜21時に両方へ投稿する常駐スケジューラ
  check-env.mjs          環境変数の設定確認
  ENV_REQUIRED.md        必要な環境変数とAPI鍵取得手順
  posted-log.json        投稿済みログ（自動生成・gitignore済）
```

---

## 🚀 クイックスタート

### 1. API鍵を取得
詳細は `ENV_REQUIRED.md`

### 2. `.env.local` に記載
プロジェクト root もしくは `app/rizup-app/` の `.env.local` に書き込み。

### 3. 環境変数チェック
```bash
node social-automation/check-env.mjs
```

### 4. 試し投稿（1回のみ）
```bash
# Threads だけ試す
node social-automation/threads-post.mjs

# X だけ試す
node social-automation/x-post.mjs

# 両方を即時実行（scheduler の --now モード）
node social-automation/social-scheduler.mjs --now
```

### 5. 常駐スケジューラ起動
```bash
node social-automation/social-scheduler.mjs
```
朝8時・昼12時・夜21時（JST）に自動投稿。Ctrl+C で停止。

Windows で PC 起動時に自動起動したい場合は、タスクスケジューラに登録するか、
Dispatch サーバー（`dispatch-server.mjs`）から呼び出すのが楽。

---

## 🎯 投稿候補の管理

- `marketing/x-profile.md` の 日本語を含む ``` コードブロック ``` を候補として抽出
- ハッシュで重複チェック → 1度投稿した内容は再投稿されない
- 新しい投稿を追加したい時は `marketing/x-profile.md` のコードブロックを増やすだけ

---

## 🔔 通知（オプション）

以下のいずれかを設定すると投稿完了/失敗時に通知：

- `DISCORD_WEBHOOK_URL` — Discord のWebhook URL
- `RESEND_API_KEY` + `NOTIFY_EMAIL` — メール通知

---

## ⚠️ X API 無料プランの制約

- 月1,500ツイート / 1日約50ツイートまで
- Read & Write 権限の Access Token が必要
- スケジューラは1日3投稿 × 2プラットフォーム = 180投稿/月 → **無料枠内で余裕あり**

---

## 🔗 Dispatch サーバーと連携

`dispatch-server.mjs` の `/task` に「X投稿して」や「スレッズ投稿して」を
POST すると自動でこのスクリプトが実行されます（v3.3〜）。

詳細は root の `DISPATCH_SETUP.md` を参照。

---

*Rei（CCO）/ 2026-04-13 / Rizup*
