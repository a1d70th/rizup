# Threads API セットアップ完全ガイド

> 作成：2026-04-13 / Sora（CTO）
> 目的：Meta Developer 登録完了後の「トークン取得 → `.env.local` 配置」までを迷わず進める

---

## 📋 このガイドでやること

```
[ すでに完了 ]
✅ Facebook アカウント
✅ Meta Developer 登録

[ これからやること ]
⬜ Threads アカウント（Instagram 経由）
⬜ Meta Developer App 作成
⬜ Threads API を追加
⬜ アクセストークン発行
⬜ User ID 取得
⬜ 長期トークン化（60日）
⬜ `.env.local` に保存
⬜ 試し投稿で動作確認
```

---

## Step 1. Threads アカウント確認（前提）

Threads は Instagram アカウントと紐付きます。
- https://www.threads.net にアクセスしてログイン可能か確認
- プロフィール設定で **「Threads へようこそ」** が完了している

完了していれば次へ。

---

## Step 2. Meta Developer App 作成

1. https://developers.facebook.com/apps/ にアクセス
2. 右上の **「Create App」** をクリック
3. ユースケース：**「その他」**（Other）を選ぶ
4. アプリタイプ：**「Business」** を選ぶ
5. 情報入力：
   - アプリ名：`Rizup Social`
   - アプリの連絡先メール：`a1d.70th@gmail.com`
   - ビジネスポートフォリオ：**「None」** でOK（後で紐付け可能）
6. **「Create app」** をクリック
7. 2段階認証のパスワードを入力して承認

---

## Step 3. Threads API プロダクトを追加

1. 作成した App のダッシュボード左メニュー **「Add Product」** をクリック
2. **「Threads API」** の **「Set up」** ボタンを押す
3. 確認画面で **「Continue」**

---

## Step 4. App Review → Threads アカウント連携

1. 左メニュー → **「App Review」** → **「Permissions and Features」**
2. 以下3つの権限に **「Request」** をクリック（開発モードでは即時使用可）：
   - `threads_basic`（基本情報読み取り）
   - `threads_content_publish`（投稿権限）
   - `threads_manage_insights`（分析データ・任意）

※開発モード（Development mode）では審査不要。本番モードにする時に審査申請が必要（その時に本ガイドを参照）。

---

## Step 5. アクセストークン発行（Graph API Explorer）

### 方法A：Graph API Explorer（最速・推奨）

1. https://developers.facebook.com/tools/explorer にアクセス
2. 右上の **Meta App** ドロップダウン → **`Rizup Social`** を選択
3. **User or Page** ドロップダウン → **`Get User Access Token`** → **あなたの Threads アカウント** を選択
4. **Permissions** に以下をチェック：
   - `threads_basic`
   - `threads_content_publish`
   - `threads_manage_insights`
5. **「Generate Access Token」** をクリック
6. 認可画面で **「許可する」** をクリック
7. 発行されたトークン（`THAAxxxxxxxxxxx...` で始まる長い文字列）をコピー

### 方法B：App Dashboard のツール
Dashboard → Threads API → 「User Token Generator」（画面が用意されている場合）

---

## Step 6. Threads User ID を取得

Graph API Explorer で：

```
GET https://graph.threads.net/v1.0/me?fields=id,username,name
```
※右側の「?」を URL に置き換え → **「Submit」**

レスポンス例：
```json
{
  "id": "17841400000000000",
  "username": "shohei_rizup",
  "name": "児玉翔平"
}
```

この `id`（数字）が **`THREADS_USER_ID`** です。

---

## Step 7. 長期トークン化（60日）

短期トークンは **約1〜2時間で失効** します。長期トークン（60日）に交換：

### 事前準備：App Secret を取得
1. Meta Developer Dashboard → **Settings** → **Basic**
2. **App Secret** の **「Show」** をクリック → パスワード入力 → コピー

### ブラウザで以下の URL にアクセス（1行で）

```
https://graph.threads.net/v1.0/access_token?grant_type=th_exchange_token&client_secret=APP_SECRETの値&access_token=短期トークンの値
```

レスポンス：
```json
{
  "access_token": "THAAxxxxxxxxxxx...（新しい60日トークン）",
  "token_type": "bearer",
  "expires_in": 5183944
}
```

この **新しい `access_token`** が **`THREADS_ACCESS_TOKEN`** です。

### 60日後の更新について
もう一度同じAPIを叩くと、さらに60日延長可能。`social-automation/refresh-token.mjs` を後日作ります（やる気が出たら）。

---

## Step 8. `.env.local` に保存

`C:\Users\81806\Desktop\rizup\.env.local`（なければ新規作成）に追記：

```dotenv
# ── Threads ──
THREADS_ACCESS_TOKEN=THAAxxxxxxxxxxxxxxxxxxxxxxxxxxx...
THREADS_USER_ID=17841400000000000
```

※このファイルは `.gitignore` で除外されているため Git にはコミットされません。

---

## Step 9. セットアップ確認

```bash
cd C:\Users\81806\Desktop\rizup
node social-automation/check-env.mjs
```

期待される出力：
```
── 必須 ──
  ✅ Threads: OK
  ❌ X: 未設定 ...
```

---

## Step 10. 試し投稿

**⚠️ 本番投稿になります。初回は自分のアカウントをフォローしている身近な人だけに見える状態で試すのがおすすめ。**

```bash
# 特定の文を投稿
node social-automation/threads-post.mjs --text "Rizupスケジューラの動作テスト🌿"

# 自動候補（marketing/x-profile.md の未投稿を選ぶ）
node social-automation/threads-post.mjs
```

成功時：
```
📝 Threads 投稿本文 (XX字):
---
（本文）
---
🧱 container created: XXXXXXXXX
✅ published: XXXXXXXXX
```

Threads を開いて、実際に投稿が表示されれば完了🎉

---

## 🐛 よくあるエラー

### `(#200) Permissions error`
→ アクセストークンの権限不足。Step 5 で3つの権限全てにチェックを入れて再発行。

### `(#10) Application does not have permission for this action`
→ App Review のステータスが未申請。開発モードで自分のアカウントは使えるが、他人への投稿は審査必須。

### `Invalid OAuth access token`
→ トークン失効 or typo。Step 5 からやり直し、長期トークンに交換（Step 7）。

### `Cannot parse media_type`
→ `threads-post.mjs` のリクエスト内容が壊れている可能性。バージョン確認。

---

## 🔗 次のステップ

- **毎日の自動投稿開始**：`node social-automation/threads-scheduler.mjs` で常駐起動
- **Dispatch経由**：`start-dispatch.bat` + ngrok で、携帯から "スレッズ投稿" と叩くだけで動く
- **GASで24/365稼働**：`social-automation/gas/setup-guide.md` 参照

---

## 📚 公式ドキュメント

- Threads API 概要：https://developers.facebook.com/docs/threads
- Getting Started：https://developers.facebook.com/docs/threads/get-started
- Post Publishing：https://developers.facebook.com/docs/threads/posts
- Rate Limits：https://developers.facebook.com/docs/threads/overview#rate-limits

---

*Sora（CTO）/ 2026-04-13 / Rizup*
