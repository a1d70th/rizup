# Notion ワークスペース構築（Claude Code からの自動化について）

> 作成：2026-04-13 / Haru（秘書）

---

## ⚠️ 現時点の制約

Claude Code から **Notion MCP 経由で直接 Notion にページを作成することは、現在このセッションでは行えません**：

- 有効化されているMCP に `notion-mcp` は含まれていない
- Notion Integration Token （`secret_...`）を翔平さんから受け取っていない

**代わりに以下3つの方式を用意しました。どれでも10分以内でNotionに全ページ構築できます。**

---

## 方式A：Notion Template を手動コピー（3分・最速）

下の**マークダウン**を順番にNotionに貼り付けるだけでほぼ完成します。

---

## 方式B：Notion Import（Markdown/CSV 5分）

Notion では **Markdown/CSV インポート** がネイティブ対応。
`import-markdown/` フォルダの下記5ファイルをドラッグ&ドロップ：

```
notion-workspace/import-markdown/
  00-home.md                ルートページ
  01-kpi-dashboard.md       KPIダッシュボード
  02-tasks.csv              タスク管理（初期10件入り）
  03-daily-report.md        日報テンプレート
  04-revenue.csv            収益管理（サンプル行入り）
```

手順：
1. Notion で新しいページ作成
2. 右上 `...` → **Import** → **Markdown & CSV**
3. 上記5ファイルを一括選択 → Import
4. 5分後にワークスペース完成

---

## 方式C：Integration Token + 自動化スクリプト（10分）

翔平さんが Notion Internal Integration を作成してトークンを渡せば、
私が `create-notion-workspace.mjs` で全ページを自動生成します。

### 翔平さんがやること
1. https://www.notion.so/profile/integrations → **+ New integration**
2. 名前：`Rizup HQ Sync`、Workspace 選択
3. Capabilities：Read/Update/Insert content 全チェック
4. **Internal Integration Token**（`secret_xxx...`）をコピー
5. Notion で `Rizup HQ` というページを新規作成
6. そのページを開いて右上「...」→ **Connections** → `Rizup HQ Sync` を追加
7. ページURLをコピー（`https://www.notion.so/RizUp-HQ-abc123...`）
8. 以下の2つを私に送る：
   - Token：`secret_xxx...`
   - 親ページID：URL末尾の `abc123...` 部分

### 私がやること
`create-notion-workspace.mjs` を走らせて、4データベース＋テンプレを全て自動で作成。

---

# 📋 Notion Markdown テンプレート（方式A・B用）

## 🏢 Rizup HQ（ルートページ）

```markdown
# 🏢 Rizup HQ

> Lueur Inc.の経営管理センター
> 最終更新：2026-04-13

## 事業部リンク
- 📊 [KPIダッシュボード](./kpi-dashboard)
- 📝 [タスク管理](./tasks)
- 📈 [日報](./daily-reports)
- 💰 [収益管理](./revenue)

## 主要URL
- Rizup アプリ：https://rizup-app.vercel.app
- GitHub：https://github.com/a1d70th/rizup
- Supabase：https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl
- Vercel：https://vercel.com/dashboard

## 今月の数字目標
- 月商：¥200,000
- アプリ登録：30名
- 有料ユーザー：10名
- X フォロワー：+300
```

---

## 📊 KPIダッシュボード

```markdown
# 📊 KPIダッシュボード

## 🌅 今日のゴール（2026-04-14）
- [ ] Supabase SQL実行
- [ ] CWスカウト①返信送信
- [ ] Xプロフィール設定 + Post 1送信
- [ ] Stripe本番設定開始
- [ ] 夜ジャーナル作成

## 📅 今週のゴール（4/14〜4/20）
- [ ] Stripe本番決済 動作確認
- [ ] Threads自動投稿 稼働開始
- [ ] X発信 毎日2投稿維持
- [ ] note 記事1本公開
- [ ] CW 新規提案20件送信
- [ ] Rizup登録ユーザー 10名突破

## 🎯 今月のゴール（2026年4月）
- [ ] 有料ユーザー 10名（Pro/Premium合計）
- [ ] CW受注 1件獲得
- [ ] 月収 ¥200,000 達成
- [ ] note 有料記事 販売開始
- [ ] コミュニティ DL 20名

## 📉 主要指標（毎朝9時更新）
| 指標 | 昨日 | 今日 | 今月 | 目標 | 達成率 |
|---|---|---|---|---|---|
| アプリ登録 | - | - | 0 | 30 | 0% |
| 有料ユーザー | - | - | 0 | 10 | 0% |
| X フォロワー | 0 | 0 | 0 | +300 | 0% |
| CW 提案送信 | - | - | 7 | 30 | 23% |
| CW 受注 | - | - | 0 | 1 | 0% |
| 月商 | - | - | 0 | 200000 | 0% |
```

---

## 📝 タスク管理（データベース）

### プロパティ
- タイトル（Title）
- ステータス（Status）：`📋 TODO` / `🔥 進行中` / `✅ 完了` / `⏸ 保留`
- 担当（Select）：翔平 / Sora / Kai / Rei / Leo / Haru
- 事業部（Select）：アプリ / メディア / 営業 / コミュニティ / 会社全体
- 優先度（Select）：🔴 最優先 / 🟠 高 / 🟡 中 / 🟢 低
- 期限（Date）
- 売上貢献（Number・円）

### 初期タスク10件（02-tasks.csv として別ファイル）

```csv
タイトル,ステータス,担当,事業部,優先度,期限,売上貢献
Supabase v3-rebuild.sql 実行,📋 TODO,翔平,アプリ,🔴 最優先,2026-04-14,0
Supabase v3.2-appstore.sql 実行,📋 TODO,翔平,アプリ,🔴 最優先,2026-04-14,0
CW スカウト① 条件提示送信,📋 TODO,翔平,営業,🔴 最優先,2026-04-14,68000
Stripe本番 商品作成+Webhook登録,📋 TODO,翔平,アプリ,🔴 最優先,2026-04-14,10000
Xアカウント開設 Post 1-5送信,📋 TODO,翔平,メディア,🟠 高,2026-04-14,0
Threads アクセストークン取得,📋 TODO,翔平,メディア,🟠 高,2026-04-14,0
GAS Webアプリ セットアップ,📋 TODO,翔平,メディア,🟠 高,2026-04-15,0
CW 新規提案10件リストアップ,📋 TODO,Leo → 翔平,営業,🟠 高,2026-04-15,150000
note 初回記事 執筆開始,📋 TODO,Rei,メディア,🟡 中,2026-04-17,10000
Rizupアプリ 実機ゴールデンパステスト,📋 TODO,Sora → 翔平,アプリ,🟠 高,2026-04-14,0
```

---

## 📈 日報テンプレート

```markdown
# 日報 - {{YYYY-MM-DD（曜日）}}

## 🌅 朝（06:30〜09:00）
- 起床時刻：
- 気分（5段階）：
- 睡眠時間：
- 朝の目標：

## 🎯 今日のToDo 3つ
1. [ ] 
2. [ ] 
3. [ ] 

## 💻 午前中にやったこと
- 

## 💪 午後にやったこと
- 

## 🏋️ ジム
- 

## 🛠 夜の作業
- 

## 📊 今日の数字
- 投稿数（X）：
- 投稿数（Threads）：
- CW 提案送信数：
- アプリ登録数：
- 売上：¥

## 🌙 夜振り返り
### 良かったこと
- 

### 改善したいこと
- 

### 明日やること TOP3
1. 
2. 
3. 

## ✨ 今日の複利スコア：__/100
- ToDo達成率：__ /3
- 習慣チェック：__ /5
- 気分：__ /5
```

---

## 💰 収益管理（データベース）

### プロパティ
- 発生日（Date）
- 項目（Title）
- 収益源（Select）：CW案件 / Rizup Pro / Rizup Premium / note / アフィリ / その他
- 金額（Number・円）
- 手数料（Number・円）
- 純収益（Formula）：`prop("金額") - prop("手数料")`
- ステータス（Select）：💭 見込み / 📝 契約済 / ⏳ 納品中 / 💰 入金済
- クライアント（Text）

### ビュー構成
1. **今月の収益**：フィルタ `発生日 is This month`、サマリー行 純収益合計
2. **収益源別**：Board view グループ = 収益源
3. **ファネル**：Board view グループ = ステータス

### 初期データ（04-revenue.csv）

```csv
発生日,項目,収益源,金額,手数料,ステータス,クライアント
2026-04-13,Rizup Free トライアル開始(n=0),Rizup Pro,0,0,💭 見込み,ユーザー
```

### 目標トラッキング

ページ上部に callout：
```
💰 今月の収益（2026年4月）
目標：¥200,000
確定売上：¥0
見込み：¥0
達成率：0%
残り必要額：¥200,000
残り日数：17日
1日あたり必要額：¥11,765
```

---

# 🔗 ファイル一覧

`notion-workspace/` フォルダ内：

```
notion-workspace/
├── NOTION_IMPORT.md            この手順書
└── import-markdown/            方式B用のインポートファイル（要作成）
    ├── 00-home.md
    ├── 01-kpi-dashboard.md
    ├── 02-tasks.csv
    ├── 03-daily-report.md
    └── 04-revenue.csv
```

方式Bを取る場合、上記マークダウン各セクションを個別ファイルとして保存してください。
または方式A（手動コピペ）が一番速いです。

---

*Haru（秘書）/ 2026-04-13 / Rizup HQ*
