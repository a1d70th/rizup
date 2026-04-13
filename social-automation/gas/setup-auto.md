# GAS Webアプリ セットアップ自動化ガイド（完全コピペ版）

> 作成：2026-04-13 / Sora（CTO）
> **このガイド通りにコピペするだけで15分で Threads 自動投稿が動きます。**

---

## ⏱ 所要時間の目安

| Step | 内容 | 所要 |
|---|---|---|
| 0 | 事前準備確認 | 1分 |
| 1 | Spreadsheet 作成 | 1分 |
| 2 | GAS コードの貼り付け | 3分 |
| 3 | Script Properties 設定 | 3分 |
| 4 | 手動テスト実行 | 2分 |
| 5 | WebApp として公開 | 2分 |
| 6 | 自動トリガー登録 | 3分 |
| **合計** | | **約15分** |

---

## Step 0. 事前準備チェック

以下が揃っているか確認：

- [ ] Google アカウント（翔平さんの）
- [ ] Threads アクセストークン（`THAAxxx...` 60日トークン）
  - 未取得なら `threads-setup-guide.md` の Step 1〜7 を先に完了
- [ ] Threads User ID（`17841xxxxxxxxx`）
- [ ] （任意）Discord Webhook URL、通知先メール

---

## Step 1. Spreadsheet 作成

### コピペする URL

ブラウザで以下を開く：

```
https://sheets.new
```

新規スプレッドシートが開く。

### コピペする値

左上のファイル名 `無題のスプレッドシート` をクリック → 以下に書き換え：

```
Rizup Threads Queue
```

Enter で保存。**Step 2へ。**

---

## Step 2. GAS コードの貼り付け

### 2-1. Apps Script を開く

スプレッドシートのメニュー：

```
拡張機能 → Apps Script
```

新しいタブで GAS エディタが開く。

### 2-2. プロジェクト名を変更

左上 `無題のプロジェクト` をクリック → 以下に書き換え：

```
Rizup Threads Publisher
```

### 2-3. コードを貼り付け

左側の **`コード.gs`** をクリックして開く。
既存のコード全部（`function myFunction() {}` など）を **Ctrl+A → Delete** で削除。

以下のコードを **そのままコピー** して貼り付け：

> **重要**：このガイドと同じフォルダの `Code.gs` を開いて全文コピーしてください。
> ファイルパス：`C:\Users\81806\Desktop\rizup\social-automation\gas\Code.gs`

PowerShellで一発クリップボードコピー：
```powershell
Get-Content "C:\Users\81806\Desktop\rizup\social-automation\gas\Code.gs" | Set-Clipboard
```

→ GAS エディタで Ctrl+V → 💾保存（Ctrl+S）

---

## Step 3. Script Properties 設定（秘密情報）

### 3-1. プロジェクト設定を開く

GAS エディタ 左メニュー：

```
⚙️ プロジェクトの設定
```

をクリック。

### 3-2. スクリプト プロパティ

下にスクロール → **「スクリプト プロパティ」** セクション → **「スクリプト プロパティを追加」** ボタン

### 3-3. 以下を1つずつ追加（コピペ用）

**必須 2件**：

```
プロパティ名：THREADS_ACCESS_TOKEN
値：THAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx...（あなたの60日トークン）
```

```
プロパティ名：THREADS_USER_ID
値：17841xxxxxxxxxxxxx（あなたの User ID 数字）
```

**推奨 1件**（トークン自動更新用）：

```
プロパティ名：THREADS_APP_SECRET
値：Meta Developer Dashboard → Settings → Basic → App Secret（Show）
```

**任意（外部認証・通知）**：

```
プロパティ名：DISPATCH_SECRET
値：rizup-2026-あなたの好きな合言葉（Claude Code から POST 時に使用）
```

```
プロパティ名：DISCORD_WEBHOOK_URL
値：https://discord.com/api/webhooks/xxx/yyy
```

```
プロパティ名：NOTIFY_EMAIL
値：a1d.70th@gmail.com
```

最後に一番下の **「スクリプト プロパティを保存」** をクリック。

---

## Step 4. 手動テストで動作確認

### 4-1. 関数選択

GAS エディタ 上部のツールバー：

- 関数名のドロップダウン（初期値は `doGet`）をクリック
- **`testPostNow`** を選ぶ

### 4-2. 実行

**▶ 実行** ボタンをクリック。

### 4-3. 初回認証（初回のみ）

「承認が必要です」ダイアログが出る：

1. **「権限を確認」** をクリック
2. Google アカウント選択
3. 「Google で確認されていません」→ **「詳細」** → **「Rizup Threads Publisher（安全ではないページ）に移動」**
4. アクセス要求画面 → **「許可」**

※「安全ではない」と出るのは、**自分で書いた自分専用のスクリプト**だから。世界に公開されたものではありません。

### 4-4. 結果確認

- GAS エディタ下部の「実行ログ」に `{ok: true, media_id: "..."}` が出たら成功
- Threads アプリを開いて、`GASセットアップテスト🌿` が投稿されていれば OK
- Spreadsheet を見て、1行追加されて B列が `published` になっていれば完璧

もし失敗した場合：
- `(#200) Permissions error` → `threads_content_publish` 権限が不足。Graph API Explorer でトークン再発行
- `Invalid OAuth access token` → トークンが古い。60日長期化（`threads-setup-guide.md` Step 7）

---

## Step 5. WebApp として公開

### 5-1. デプロイ画面を開く

GAS エディタ 右上：

```
🚀 デプロイ → 新しいデプロイ
```

### 5-2. 種類を選択

左側の ⚙️ 歯車アイコンをクリック → **「ウェブアプリ」** を選ぶ

### 5-3. 設定

以下の通り入力：

| 項目 | 値 |
|---|---|
| 説明 | `Rizup Threads Publisher v1` |
| 次のユーザーとして実行 | **自分**（`a1d.70th@gmail.com`） |
| アクセスできるユーザー | **全員**（重要：これにしないと外部POSTができない） |

※ **「全員」** にしても `DISPATCH_SECRET` で保護しているので、合言葉なしでは投稿できません。

### 5-4. デプロイ実行

**「デプロイ」** をクリック。

### 5-5. URL をコピー

「ウェブアプリ」の URL が表示される：

```
https://script.google.com/macros/s/AKfycbxxxxxxxxx.../exec
```

このURLを **必ずコピーしてメモ帳に保存**（後で翔平さんの `.env.local` と Dispatch サーバーで使います）。

---

## Step 6. 自動トリガー登録（3つ）

### 6-1. トリガー画面を開く

GAS エディタ 左メニュー：

```
⏰ トリガー
```

をクリック。

### 6-2. トリガー①：投稿スケジューラ（5分おき）

右下の **「トリガーを追加」** をクリック → 以下の値を入力：

| 項目 | 値 |
|---|---|
| 実行する関数 | `publishScheduled` |
| デプロイを選択 | `Head` |
| イベントのソース | `時間主導型` |
| 時間ベースのトリガーのタイプ | `分ベースのタイマー` |
| 時間の間隔 | `5分おき` |
| エラー通知設定 | `毎日通知を受け取る` |

**「保存」** をクリック。

### 6-3. トリガー②：トークン自動更新（1日1回）

もう一度 **「トリガーを追加」**：

| 項目 | 値 |
|---|---|
| 実行する関数 | `refreshTokenIfNeeded` |
| イベントのソース | `時間主導型` |
| 時間ベースのトリガーのタイプ | `日付ベースのタイマー` |
| 時刻 | `午前3時〜4時` |

**「保存」**。

### 6-4. トリガー③：Insights 収集（1時間おき）

もう一度 **「トリガーを追加」**：

| 項目 | 値 |
|---|---|
| 実行する関数 | `fetchInsights` |
| イベントのソース | `時間主導型` |
| 時間ベースのトリガーのタイプ | `分ベースのタイマー` |
| 時間の間隔 | `1時間おき` |

**「保存」**。

---

## Step 7. `.env.local` に WebApp URL を追加

Step 5-5 でコピーした URL を、Rizup プロジェクトの `.env.local` に追記：

```dotenv
THREADS_GAS_URL=https://script.google.com/macros/s/AKfycbxxxxx.../exec
THREADS_GAS_SECRET=rizup-2026-あなたの合言葉
```

---

## Step 8. 初回スケジュール投稿テスト

### 8-1. 手動で1件キュー追加

Spreadsheet を開いて 2行目（ヘッダー下）に手入力：

| A (id) | B (status) | C (scheduled_at) | D (text) |
|---|---|---|---|
| `p_test001` | `queued` | `now` | `Rizupから、はじめまして🌿 毎日1%の複利成長、一緒に積もう。` |

（E, F, G 列は空欄でOK）

### 8-2. 5分以内に自動投稿される

5分おきのトリガーが拾って自動投稿 → B列が `published` に変わり、F列に `media_id` が入る。

Threads を確認して実際に投稿されていれば **完了🎉**

---

## Step 9. 外部 POST での投稿（Claude Code / 携帯から）

### curl で直接投稿

```bash
curl -L -X POST "https://script.google.com/macros/s/AKfycbxxxxx.../exec" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"今日も1%積もう🌿\",\"scheduled_at\":\"now\",\"secret\":\"rizup-2026-あなたの合言葉\"}"
```

### スケジュール投稿（2026-04-14 08:00 JST に投稿）

```bash
curl -L -X POST "https://script.google.com/macros/s/.../exec" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"朝のメッセージ\",\"scheduled_at\":\"2026-04-14T08:00:00+09:00\",\"publish_immediately\":false,\"secret\":\"合言葉\"}"
```

### iPhone ショートカット連携

iOS ショートカット.app で：
1. 「URL」アクション → Step 5-5 のURL
2. 「URL の内容を取得」アクション → 方法: POST、ヘッダー: `Content-Type: application/json`、要求本文: JSON
3. JSON:
   ```json
   {
     "text": "（クリップボードのテキスト）",
     "scheduled_at": "now",
     "secret": "rizup-2026-合言葉"
   }
   ```
4. ホーム画面に追加 → 1タップで投稿できる状態

---

## ✅ セットアップ完了チェックリスト

- [ ] Spreadsheet `Rizup Threads Queue` 作成済
- [ ] GAS プロジェクトに `Code.gs` 貼り付け済
- [ ] Script Properties に `THREADS_ACCESS_TOKEN` と `THREADS_USER_ID` 設定済
- [ ] `testPostNow` で手動投稿成功
- [ ] WebApp として公開し、URLをメモ済
- [ ] トリガー3種登録済（`publishScheduled` / `refreshTokenIfNeeded` / `fetchInsights`）
- [ ] `.env.local` に `THREADS_GAS_URL` 追記済
- [ ] Spreadsheet に手動1件キュー → 5分後に自動投稿を確認

全部チェックがついたら、**もう放っておくだけで毎日自動投稿が動きます🌿**

---

## 🔧 運用 Tips

### 新しい投稿文の追加方法

Spreadsheet の 2行目以降に追加：
- B列（status）: `queued`
- C列（scheduled_at）: 投稿日時 ISO（例: `2026-04-14T08:00:00+09:00`） or `now`
- D列（text）: 本文（500字以内）

5分おきのトリガーが自動で拾います。

### 投稿を止めたい時

該当行の B列を `paused` や `cancelled` に変更するだけ。`queued` 以外は無視されます。

### 週次レポート（GAS関数 追加版 — 後日作成可）

`fetchInsights()` が Spreadsheet にデータを書き込むので、
右の空き列にピボット集計式を入れれば週次レポートが自動生成できます。

---

*Sora（CTO）/ 2026-04-13 / Rizup*
