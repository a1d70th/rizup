# 明日の朝一番にやることリスト

> 作成：Haru（秘書）/ 2026-04-13 夜
> 対象日：2026-04-14（月曜日）
> 翔平さんへ：起きたらこのファイルを開いて上から順にやればOK

---

## ☀️ 起きたらすぐ（5分以内）

### 1. Rizupアプリで朝ジャーナル（2分）
```
https://rizup-app.vercel.app/journal
```
- 気分（5段階）
- 昨夜の睡眠時間
- **今日の目標**：「一番やりきりたいこと」を1行で
- **今日のToDo 3つ**を決める（ToDo は下記の午前/午後から選ぶ）

### 2. 水を飲む（1分）
コップ1杯。脳が起きる。

### 3. 今日のダッシュボードに目を通す（1分）
ホームを開いて、Rizupの挨拶と「今日はこれをやろう」を確認。

### 4. Xアカウント確認（1分）
リプライ・DMがあれば全返信（24時間以内ルール）。
まだアカウント作ってなければ `marketing/x-twitter-ready.md` を開いて今日中に作る。

---

## 🌅 午前中（09:00〜12:00）

### 🔴 優先度1：Supabase SQL 実行（5分）
**まだ未実行の場合、これを一番最初に**

```powershell
Get-Content C:\Users\81806\Desktop\rizup\app\rizup-app\supabase-v3-rebuild.sql | Set-Clipboard
```
→ https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new で Ctrl+V → Run

続けて：
```powershell
Get-Content C:\Users\81806\Desktop\rizup\app\rizup-app\supabase-v3.2-appstore.sql | Set-Clipboard
```
→ 同じく Run

**これやらないと、投稿の一部データが保存されない**。

### 🔴 優先度2：クラウドワークス スカウト① 返信（15分）
**48時間以内ルール。午前中に送信する**

1. `C:\Users\81806\Desktop\rizup\consulting\crowdworks-send-ready.md` を開く
2. 本文をコピー（`○○様` を実名に置換）
3. クラウドワークスでスカウトに返信
4. 送信後、`consulting/pipeline.md` に記録

### 🟠 優先度3：X 初日投稿 Post 1 送信（5分）
09:00 ジャスト投稿が理想。遅れても午前中には。

- `marketing/x-twitter-ready.md` の「Post 1 - 09:00」をコピペ
- X で投稿
- 投稿後 プロフィール固定ツイートに設定（別途の固定ツイ文）

### 🟡 優先度4：Stripe 本番設定 準備（30分）
1. https://dashboard.stripe.com/ ログイン → 本番モードON
2. Products → Pro ¥780/月、Premium ¥1,480/月 を作成
3. 各 Price ID（`price_xxx`）をメモ
4. Developers → Webhooks → Add endpoint
   - URL：`https://rizup-app.vercel.app/api/stripe/webhook`
   - Events：`checkout.session.completed` / `customer.subscription.updated` / `customer.subscription.deleted`
   - Signing secret をメモ
5. Vercel Dashboard → Environment Variables に以下4つを追加：
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRO_PRICE_ID`
   - `STRIPE_PREMIUM_PRICE_ID`
6. Deployments → 最新 → Redeploy

---

## 🍱 ランチ（12:00〜13:00）

- 外出して光を浴びる（脳のリセット）
- コンビニOK、できれば15分散歩を挟む
- 12:00 に X Post 2 を送信（短文のRizup紹介）

---

## 🌇 午後（13:00〜17:00）

### 🟡 優先度5：Threads アクセストークン取得（30分）
1. `social-automation/threads-setup-guide.md` を開く
2. Step 2〜7 を順番に実行
3. `.env.local` に `THREADS_ACCESS_TOKEN` と `THREADS_USER_ID` を保存
4. 動作確認：`node social-automation/threads-post.mjs --text "Rizupテスト投稿🌿"`

### 🟡 優先度6：GAS セットアップ（15分）
1. `social-automation/gas/setup-auto.md` を開く
2. 全9ステップを順番に実行
3. WebApp URL をメモ → `.env.local` に `THREADS_GAS_URL`

### 🟢 優先度7：X Post 3（13:00）・Post 4（17:00）
`marketing/x-twitter-ready.md` 参照

### 🟢 優先度8：クラウドワークス 新規提案10件（90分）
`consulting/profile.md` のテンプレートを使って提案文作成。
- LP制作系：5件
- 広告運用系：3件
- ライティング系：2件

---

## 💪 ジム（17:30〜18:30）
**絶対に行く**。
ジム行ってない日は夜の集中力が落ちる（過去の自分のデータから）。

---

## 🌙 夜（19:00〜21:00）

### 🟢 優先度9：アプリ改善 or バグ修正（60分）
- `app/rizup-app` で気になった点を1つだけ直す
- 大きな機能追加は避ける（疲れてミスが出やすい）

### 🟢 優先度10：X Post 5 送信（21:00）
1日のまとめポスト。明日への宣言を含める。

---

## 🌃 夜ジャーナル（21:30）

1. `https://rizup-app.vercel.app/journal`（夜モード自動切替）
2. 今朝の目標の達成判定（できた / 一部 / できなかった）
3. 感謝3つ：
   - 今日ありがたかったこと
   - 誰かに感謝したいこと
   - 自分を褒めたいこと
4. 就寝予定時刻入力
5. 今日の複利スコアを確認（70点以上が目標）

---

## 📅 今週中にやること（4/14〜4/20）

| 曜日 | 優先タスク |
|---|---|
| 月 4/14 | Supabase SQL / CW返信 / X発信開始 / Stripe本番準備 |
| 火 4/15 | Threads GAS本格運用 / CW新規提案10件 |
| 水 4/16 | アプリ本番Stripeテスト / note記事執筆 |
| 木 4/17 | note記事1本公開 / X毎日2投稿維持 |
| 金 4/18 | 週次レビュー / 来週計画 / Haruに日報集計依頼 |
| 土 4/19 | 休息＋読書（The Compound Effect 再読推奨） |
| 日 4/20 | アプリの改善タスク1つ / 来週のX投稿を予約 |

---

## 🎯 今日の合格ライン（これだけできれば十分）

- [ ] 朝ジャーナル書いた
- [ ] Supabase SQL 実行した
- [ ] CW スカウト① 返信送信した
- [ ] X Post 1 送信した
- [ ] 夜ジャーナル書いた

5つ全部 ✅ なら **今日は100点満点**。

---

## ⚠️ やりすぎ防止ルール

- **23:00 以降はSlack/SNSを閉じる**（明日のために休む）
- **全部完璧を目指さない**（1日5タスク×5日で25積む方が強い）
- **疲れた時は「休む」もタスクに入れる**（休息も1%の行動）

---

*Haru（秘書）/ 2026-04-13 夜 / Rizup HQ*

**翔平さん、明日も昨日より1%前へ。🌿**
