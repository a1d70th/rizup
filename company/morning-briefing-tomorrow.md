# 明日の朝礼コマンド（2026-04-14・月曜）

> 作成：Haru（秘書）/ 2026-04-13 夜
> 翔平さんが朝Claude Codeを開いて「一発コピペ」すれば全社員が動き始めます。

---

## 🌅 一発実行コマンド（これをコピペ）

以下を朝9時にClaude Codeに貼り付けて実行してください。

````
@Haru として動いてください。月曜朝礼を開始します。

■ 今日の日付：2026年4月14日（月）
■ 今週の目標：
  - Rizup Supabase v3 マイグレーション実行
  - Stripe本番決済の設定完了
  - X発信開始（@shohei_rizup）
  - クラウドワークス スカウト① 条件提示送信
  - アプリ実機テスト（朝夜ジャーナル・複利・ToDo）

■ 先週までの進捗：
  - Rizup v3.1 リリース完了（2026-04-13）
  - 複利エフェクト・グラスUI・PWA実装済み
  - Stripe Webhook・環境変数チェックリスト完備
  - DB統合マイグレーションSQLをSupabaseクリップボードに投入済み

■ 今月の残り売上目標：¥200,000
■ ブロッカー：Stripe本番商品ID未設定 / Supabase SQL未実行

以下を実行してください：
1. 週次計画として今週の全社員タスクを洗い出し
2. 今日の最優先アクション TOP3 を提示
3. 各社員（Sora/Kai/Rei/Leo）への初動指示を出す
4. /company/daily-report-2026-04-14.md に今日のタスク表を書き込む
5. 本日終了時の「合格ライン」を明示
````

---

## 🎯 今日の最優先 TOP3（Haruの提案）

### 優先①：Supabase SQL 実行（所要5分）
**理由**：これが終わらないとアプリが v3 仕様で動かない。ユーザーが触れる状態にならない。

**手順**：
1. https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new を開く
2. PowerShellで `Get-Content app\rizup-app\supabase-v3-rebuild.sql | Set-Clipboard`
3. ブラウザに Ctrl+V → Run
4. `Rizup v3 migration completed` が返れば成功
5. Haruに「完了」と報告

---

### 優先②：Stripe 本番商品を作成 & Webhook登録（所要30分）
**理由**：決済が通らないと「無料→Pro」の転換ができない。月額売上¥0のまま。

**Leo（または翔平）が実施する手順**：

1. **Stripe本番モード ON**
   - https://dashboard.stripe.com/ 右上のトグルで「本番」へ

2. **商品2つ作成**
   ```
   商品A：Rizup Pro
     月額 ¥780（税込）／月次請求
     → 発行されたPrice ID（price_xxx）をメモ

   商品B：Rizup Premium
     月額 ¥1,480（税込）／月次請求
     → 発行されたPrice ID（price_yyy）をメモ
   ```

3. **Webhook エンドポイント登録**
   ```
   Developers → Webhooks → Add endpoint
   URL: https://rizup-app.vercel.app/api/stripe/webhook

   Events:
   ✅ checkout.session.completed
   ✅ customer.subscription.updated
   ✅ customer.subscription.deleted

   → Signing secret（whsec_xxx）をメモ
   ```

4. **Vercel 環境変数に投入**
   https://vercel.com/dashboard → rizup-app → Settings → Environment Variables

   | Key | Value |
   |---|---|
   | `STRIPE_SECRET_KEY` | `sk_live_...` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
   | `STRIPE_PRO_PRICE_ID` | `price_xxx` |
   | `STRIPE_PREMIUM_PRICE_ID` | `price_yyy` |

5. **Redeploy**：Deployments → 最新 → ⋯ → Redeploy

6. **テスト**：`/settings` でアップグレードボタン → テストカード `4242 4242 4242 4242` で決済通過を確認

---

### 優先③：クラウドワークス スカウト① 返信（所要15分）
**理由**：48時間以内返信が鉄則。放置すると案件消失 = ¥68,000（月17,000円 × 4ヶ月）の機会損失。

**手順**：
1. `C:\Users\81806\Desktop\rizup\consulting\crowdworks-proposal-final.md` の v2 本命版を開く
2. 先方の会社名・担当者名を実名に置換
3. Zoom候補日時を今週に調整（4/14・4/15・4/16）
4. 翔平さんの最終読み直し（誤字・トーン確認）
5. クラウドワークスのメッセージ欄に貼り付け → 送信
6. `/consulting/pipeline.md` に記録
7. Haruに「送信完了」と報告

---

## 👥 各AI社員への初動指示（朝礼で投げる）

### @Sora（CTO）

```
@Sora として動いてください。

■ 今日のタスク
1. 翔平さんがSupabase SQLを実行した直後、全APIが動作するか検証
   - /api/sho-insight が 200 返すか
   - /api/moderate が 200 返すか
   - /api/check-progress が 200 返すか
2. rizup-app.vercel.app で新規登録 → オンボーディング →
   朝ジャーナル → ビジョン作成 → ToDo紐付け → 夜ジャーナル
   までのゴールデンパスを実機テスト
3. バグがあれば /app/rizup-app/src/app/ 配下を即修正・push
4. Stripe本番切り替え後に /api/stripe/checkout のテスト決済通過を確認
5. qa-reviewer に依頼して合格したら完了

■ 完了条件：上記5項目すべて合格
■ 報告：Haruに21:00までに結果レポート
```

### @Rei（CCO）

```
@Rei として動いてください。

■ 今日のタスク
1. X アカウント @shohei_rizup のプロフィール更新
   → /marketing/x-profile.md の案A（推奨）を貼り付け
2. ヘッダー画像をCanvaで作成（/marketing/x-profile.md セクション2参照）
3. 初回ポスト Post 1（朝9時枠）を翔平さんに送信用テキストで確認依頼
4. Post 2（13時）・Post 3（21時）を予約投稿設定
5. Post 1 を固定ツイートに設定

■ 完了条件：プロフィール更新済・3本予約完了・固定ツイート設定済
■ 報告：翔平さん確認済みのスクショをHaruに送る
```

### @Leo（CSO）

```
@Leo として動いてください。

■ 今日のタスク
1. クラウドワークス スカウト① への条件提示送信
   → /consulting/crowdworks-proposal-final.md の v2 本命版
2. 先方の会社名・担当者名・Zoom候補日時を差し替え
3. 翔平さんの最終レビュー通過後、クラウドワークスで送信
4. /consulting/pipeline.md に「2026-04-14 スカウト①条件提示送信」と記録
5. 午後：新規クラウドワークス案件を10件リサーチ（LP制作・広告運用中心）
6. 各案件に対して短文の提案文（300字）を作成、Haruに提出

■ 完了条件：スカウト①送信済・新規10件リストアップ・提案文5本完成
■ 報告：案件リストと提案文をHaruに提出（17:00まで）
```

### @Kai（CMO）

```
@Kai として動いてください。

■ 今日のタスク
1. メンタルヘルステック・自己成長アプリ市場の
   直近1ヶ月の海外動向を調査
   - Product Hunt でトレンド3件
   - Hacker News で話題のアプリ2件
   - a16z / ycombinator の最新ブログから1本
2. Rizup との差別化ポイント・学べる点を各3行で整理
3. /research/market-scan-2026-04-14.md に保存
4. 午後：Stripe決済通過後のファネル設計提案
   （無料→トライアル→Pro 転換率を高めるUX施策を3案）

■ 完了条件：海外調査レポート完成・ファネル提案3案
■ 報告：17:00までにHaruに提出
```

---

## 📋 18:00 中間レビュー

夕方以下をHaruに報告：

```
@Haru、中間レビューお願いします。

■ 今日の進捗
- Sora：{実施状況}
- Rei：{実施状況}
- Leo：{実施状況}
- Kai：{実施状況}

■ 完了：
{リスト}

■ 未完了・遅延：
{リスト}

■ ブロッカー：
{リスト}

残り3時間で優先すべきこと TOP3 を教えてください。
```

---

## 🌙 21:00 夜ジャーナル（翔平さん個人）

Rizupアプリ `/journal` の夜モードで以下を記録：

- 気分（5段階）
- 今夜の就寝予定時刻
- 今朝の目標「Supabase SQL実行」達成度：yes / partial / no
- 朝選んだToDo3つのチェック
- 感謝3つ
  - ありがたかったこと
  - 感謝したい人
  - 自分を褒めたいこと
- 今日の振り返り（140字）

**今日の複利スコアが自動算出される。70点以上を目標に。**

---

## 📊 今日の合格ライン

以下がすべて ✅ なら「合格」：

- [ ] Supabase SQL 実行完了（Rizup v3 migration completed 確認）
- [ ] Stripe Pro / Premium 商品作成 + Webhook登録
- [ ] Vercel環境変数 5項目投入 + Redeploy
- [ ] アプリ実機テストのゴールデンパス通過
- [ ] X プロフィール更新 + 初回3投稿予約完了
- [ ] クラウドワークス スカウト① 条件提示 送信済
- [ ] 新規CW案件 10件リストアップ
- [ ] Kai 海外調査レポート完成
- [ ] 夜ジャーナル投稿（複利スコア 70点以上）

---

## ⚠️ 注意事項（Haruから翔平さんへ）

1. **「完璧」より「着手」**：全部終わらせようとせず、TOP3を確実に
2. **SQL実行とStripe設定は最優先**：これが終わらないと他のタスクの効果が出ない
3. **Xの初投稿は夜の前に確認**：21時の投稿がその日最大のインパクト
4. **CW返信は遅くとも昼まで**：午後着だと先方の確認が翌日になる
5. **ジムと散歩は必ず行く**：複利は「続けること」がすべて

---

## 🔁 緊急時の対応

### 想定外のバグが出たら

```
@Sora、緊急。以下のバグを調査してください。

■ 症状：
■ 再現手順：
■ エラーメッセージ：
■ 影響範囲：
```

### Stripe決済が通らない時

```
@Sora、緊急。Stripe決済が通りません。

■ エラー内容：
■ 試したこと：

/api/stripe/checkout と /api/stripe/webhook のログを確認し、
Vercel環境変数の5項目が全て設定されているか検証してください。
```

---

*Haru（秘書）/ 2026-04-13 夜 / Rizup HQ*

**翔平さん、おつかれさまです。明日も昨日より1%前へ。🌿**
