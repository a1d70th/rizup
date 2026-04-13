# GAS Threads Publisher セットアップガイド

> 作成：2026-04-13 / Sora（CTO）
> 目的：Google Apps Script で24/365 Threads自動投稿する（無料・PC起動不要）

---

## なぜGASを使うのか

- **PC起動不要**：Google のサーバーで動くため、PCを閉じてもOK
- **完全無料**：個人利用の範囲（1日20,000回実行）で十分
- **スプレッドシートが管理画面**：投稿キュー・投稿済み・Insights を全部Spreadsheetで見える
- **Webhook化可能**：外部からPOSTで投稿依頼を受け取れる

---

## Step 1. スプレッドシート作成

1. https://sheets.new にアクセス（新規スプレッドシート）
2. 名前を `Rizup Threads Queue` に変更
3. Sheet1 をそのまま使う（ヘッダーは Code.gs が自動で作る）

---

## Step 2. GAS プロジェクトを開く

1. スプレッドシート → **拡張機能** → **Apps Script**
2. 新しいタブで GAS エディタが開く
3. プロジェクト名を `Rizup Threads Publisher` に変更

---

## Step 3. コードを貼り付け

1. 左ペインの `コード.gs` を開く
2. 既存コードを全選択して削除
3. `social-automation/gas/Code.gs` の内容を全コピーして貼り付け
4. 💾 保存（Ctrl+S）

---

## Step 4. Script Properties に秘密情報を設定

GAS エディタの：
1. 左メニュー ⚙️ **プロジェクト設定** をクリック
2. 下にスクロール → **「スクリプト プロパティ」** → **「スクリプト プロパティを追加」**
3. 以下を1つずつ追加：

| プロパティ | 値 | 必須 |
|---|---|---|
| `THREADS_ACCESS_TOKEN` | `THAAxxx...`（60日トークン） | ✅ |
| `THREADS_USER_ID` | `17841xxxxxxxxx` | ✅ |
| `THREADS_APP_SECRET` | App Secret（トークン更新用） | △ |
| `DISPATCH_SECRET` | 任意の合言葉（外部POST認証用） | △ |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | △ |
| `NOTIFY_EMAIL` | 通知先メール | △ |

保存。

---

## Step 5. 手動テスト（publishOne が動くか）

1. GAS エディタ上部のドロップダウンから `testPostNow` を選択
2. **▶ 実行** ボタン
3. 初回：承認リクエストが出る → アカウント選択 → 詳細 → 安全でないページ → 許可
4. 成功すると Threads に `GASセットアップテスト🌿` が投稿される
5. スプレッドシートの1行目（ヘッダー下）に `published` と media_id が入る

---

## Step 6. WebApp として公開（外部から叩けるように）

1. GAS エディタ 右上の **「デプロイ」** → **「新しいデプロイ」**
2. ⚙️ アイコン → **「ウェブアプリ」** を選ぶ
3. 設定：
   - 説明：`Rizup Threads Publisher v1`
   - 次のユーザーとして実行：**「自分」**
   - アクセスできるユーザー：**「全員」**（認証はScript Properties の DISPATCH_SECRET で行う）
4. **「デプロイ」** をクリック
5. **ウェブアプリ URL** をコピー（`https://script.google.com/macros/s/AKfycbxxx.../exec`）

---

## Step 7. トリガー設定（自動投稿＋Insights取得）

GAS エディタ 左メニュー ⏰ **「トリガー」** をクリック：

### トリガー1：定期投稿（5分おき）
- **「トリガーを追加」**
- 実行する関数：`publishScheduled`
- デプロイ：`Head`
- イベントのソース：`時間主導型`
- 時間ベースのトリガーのタイプ：`分ベースのタイマー`
- 時間間隔：`5分おき`
- 保存

### トリガー2：トークン自動更新（1日1回）
- 関数：`refreshTokenIfNeeded`
- 時間主導型 → 日付ベースのタイマー → 午前3時〜4時
- 保存

### トリガー3：Insights取得（1時間おき）
- 関数：`fetchInsights`
- 時間主導型 → 分ベース → 1時間おき
- 保存

---

## Step 8. Claude Code / 外部から投稿

### curl で投稿
```bash
curl -L -X POST "https://script.google.com/macros/s/AKfycbxxx.../exec" \
  -H "Content-Type: application/json" \
  -d '{"text": "今日も複利を1%積もう🌿", "scheduled_at": "now", "secret": "あなたのDISPATCH_SECRET"}'
```

### キュー確認
```bash
curl "https://script.google.com/macros/s/AKfycbxxx.../exec?action=list"
```

### スケジュール投稿
```bash
curl -L -X POST "https://script.google.com/macros/s/AKfycbxxx.../exec" \
  -H "Content-Type: application/json" \
  -d '{"text": "朝のメッセージ", "scheduled_at": "2026-04-14T08:00:00+09:00"}'
```
→ 5分おきのトリガーが、指定時刻を過ぎたら自動投稿

---

## Step 9. Rizup（Node 側）との連携

`.env.local` に追加：
```dotenv
THREADS_GAS_URL=https://script.google.com/macros/s/AKfycbxxx.../exec
THREADS_GAS_SECRET=あなたの合言葉
```

`dispatch-server.mjs` から叩く or、Claude Code のレスポンスに混ぜて、AIが自動で投稿を予約できる。

---

## 🐛 トラブルシュート

### 「承認が必要です」画面が出る
→ これは正常。**「詳細」→「安全ではないページに移動」→「許可」** で進む（自分のスクリプトのみ）

### 実行時に「Exception: Script function not found」
→ ドロップダウンから関数を選び直して実行

### Threadsに投稿が行かない
→ Script Properties のトークンが古い可能性。Graph API Explorer で再発行

### 403 Forbidden
→ デプロイ設定で「アクセスできるユーザー」が「自分のみ」になっている。「全員」に変更して再デプロイ

---

## 📊 Spreadsheet の使い方

### 新規投稿を手入力で予約
1行追加して：
- B列 (status): `queued`
- C列 (scheduled_at): `2026-04-14T12:00:00+09:00` または `now`
- D列 (text): 投稿本文

あとは5分おきのトリガーが拾う。

### 投稿済みを確認
B列の `published` 行を見る。F列に media_id、H/I/J列に Insights が入る（1時間後くらいから反映）。

### 失敗を確認
B列 `failed` 行の G列に理由。

---

## 🔗 関連ファイル
- `Code.gs` — 本体
- `../threads-setup-guide.md` — Threads API トークン取得
- `../README.md` — 全体概要

---

*Sora（CTO）/ 2026-04-13 / Rizup*
