# 今日必ずやること（2026-04-17）

> 上から順番に。全部で45分。

---

## 【5分・今すぐ】スレッズに投稿

1. `marketing/threads-today.md` を開く
2. パターン1をコピー
3. Threadsアプリで貼り付けて投稿
4. 完了

---

## 【5分・今すぐ】Supabase SQL実行

1. ブラウザで開く：
   https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new
2. `app/rizup-app/supabase-execute-now.sql` を全選択してコピー
3. SQL Editorに貼り付け
4. 「Run」を押す
5. エラーが出なければ完了
6. 確認：Table Editor で `friends` `strength_gifts` テーブルが存在するか

**これをやらないとv5の村・キャラ・強み機能が全て動かない**

---

## 【10分・今日中】note記事公開

1. `marketing/note-draft-1.md` を開く
2. noteにログイン（なければ新規登録）
3. 「記事を書く」→タイトルと本文をコピペ
4. 「---」の位置で「有料エリア」を設定
5. 価格：¥500
6. 公開

---

## 【15分・今日中】Stripe設定

`company/stripe-setup-guide.md` の手順通り：
1. Stripe → 商品作成（Pro ¥480/月）
2. Webhook → `https://rizup-app.vercel.app/api/stripe/webhook`
3. APIキー3つ + 価格ID → Vercel環境変数に追加
4. Redeploy

---

## 【10分・今日中】CW提案送信

`consulting/crowdworks-send-ready.md` をコピペ
→ `○○株式会社` を実際の企業名に置換
→ 最低3件送信

---

## チェックリスト
- [ ] スレッズ投稿（5分）
- [ ] SQL実行（5分）
- [ ] note公開（10分）
- [ ] Stripe設定（15分）
- [ ] CW送信（10分）

**合計45分で収益化の基盤が完成する**
