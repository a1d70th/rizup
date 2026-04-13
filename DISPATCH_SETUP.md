# Rizup Dispatch セットアップ手順

> 作成：2026-04-13 / Sora（CTO）
> 目的：外部からメッセージをPOSTして、Claude Code経由でタスク実行させる仕組み

---

## ⚠️ 重要：Claude Codeからngrok公開URLは直接発行できません

ngrok は無料でも **事前にアカウント登録＋authtoken設定が必要** です。この認証は翔平さん自身がブラウザで行う必要があります（私にはできません）。以下の3ステップを翔平さんが一度だけ実行すれば、以降は `start-dispatch.bat` ダブルクリックでOK。

---

## ⚡ 初回セットアップ（所要 3分）

### 1. ngrok アカウント作成（無料）
https://dashboard.ngrok.com/signup でメールアドレスだけで登録。

### 2. Authtoken をコピー
https://dashboard.ngrok.com/get-started/your-authtoken
→ `Your Authtoken` の値（`2abcd...`）をコピー。

### 3. 1回だけ設定コマンドを実行
PowerShell または cmd で：
```cmd
"%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe" config add-authtoken YOUR_TOKEN_HERE
```

または、PATHを通した新しいターミナルで：
```cmd
ngrok config add-authtoken YOUR_TOKEN_HERE
```

---

## 🚀 起動方法（毎回）

```
C:\Users\81806\Desktop\rizup\start-dispatch.bat
```
をダブルクリック。

- Node サーバーが port 3456 で起動
- ngrok が起動して `https://xxxx.ngrok-free.app` の公開URLを発行
- 公開URLが **自動でクリップボードにコピー** される
- 2つのウインドウが開く（サーバー／ngrok）。閉じると停止

---

## 📡 使い方

### POST でタスクを投げる

```bash
curl -X POST https://xxxx.ngrok-free.app/task \
  -H "Content-Type: application/json" \
  -d '{"message": "Rizupアプリの /home にPush通知ボタンの初期表示バグがあるか確認して"}'
```

レスポンス：
```json
{
  "ok": true,
  "task_id": "t_1712xxx_abc123",
  "auto_run": false,
  "message": "Task queued"
}
```

### キューの確認
`GET https://xxxx.ngrok-free.app/queue` → 直近50件のタスクを返す

### ログ確認
`GET https://xxxx.ngrok-free.app/log` → 直近50行のサーバーログ

---

## 🤖 AUTO_RUN モード（Claude Code 自動実行）

デフォルトは **受信→キューファイルに保存** のみ。

以下の環境変数をセットして起動すると、**受信と同時に `claude --print` が起動**してタスクを自動実行します：

```cmd
set AUTO_RUN_CLAUDE=1
start-dispatch.bat
```

結果は `dispatch-queue-results.jsonl` に追記されます（5分でタイムアウト）。

---

## 🔐 認証（推奨）

公開URLは誰でも叩けるため、秘密の合言葉を設定することを推奨：

```cmd
set DISPATCH_SECRET=my-secret-phrase-12345
start-dispatch.bat
```

以降、POST には `Authorization: Bearer my-secret-phrase-12345` が必須になります：
```bash
curl -X POST https://xxxx.ngrok-free.app/task \
  -H "Authorization: Bearer my-secret-phrase-12345" \
  -H "Content-Type: application/json" \
  -d '{"message": "..."}'
```

---

## 📋 ファイル一覧

| ファイル | 用途 |
|---|---|
| `dispatch-server.mjs` | Node HTTP サーバー本体 |
| `start-dispatch.bat` | 起動スクリプト（サーバー + ngrok） |
| `dispatch-queue.jsonl` | 受信タスクのキュー（自動生成） |
| `dispatch-queue-results.jsonl` | AUTO_RUN 時の実行結果（自動生成） |
| `dispatch.log` | サーバーログ（自動生成） |

---

## ⚠️ 制約と注意点

1. **ngrok 無料プランは毎回URLが変わる**：PCを再起動すると URL が変わります。固定URLは有料プラン（月$8〜）または自前のドメインが必要。
2. **AUTO_RUN は `claude` CLI 必須**：`claude` コマンドがPATHに通っている必要があります（✅ 確認済み：`/c/Users/81806/AppData/Roaming/npm/claude`）
3. **Claude Code のセッション分離**：AUTO_RUN で起動される `claude` は別セッションです。今このターミナルのコンテキストは引き継がれません。
4. **Windows ファイアウォール**：初回起動時に許可を求められる場合あり

---

*Sora（CTO）/ 2026-04-13 / Rizup*
