# 明日の優先順位 TOP5（2026-04-16 木曜 朝イチ実行）

> 作成：Haru（秘書）/ 2026-04-15 夜
> v4.3デプロイ完了後の翔平さん個人タスクのみ。AI社員側の作業はここに含めない。

---

## 🥇 #1 — スマホでMeta認証→Threads全自動化完成（15分・最重要）

**何をする**
1. スマホで Meta for Developers にログイン
2. アプリ作成 → Threads API 権限を追加
3. アクセストークンを発行
4. `social-automation/config.json` にトークン貼り付け
5. `node social-automation/threads-post.mjs` をローカル実行 → テスト投稿成功

**なぜ最優先**
- 投稿ストック21本は `marketing/threads-week1.md` で完成済み
- dispatch経由の自動投稿基盤も完成済み（`dispatch-server.mjs` v2）
- 残るはトークンだけ。これで「スマホから"スレッズ投稿して"と送るだけ」で投稿が走る

**完了確認**
- スマホから dispatch POST → Threadsにテスト投稿が出る
- 失敗時は `dispatch-queue-results.jsonl` に404/401等のエラーが出る

---

## 🥈 #2 — クラウドワークス スカウト① 送信（10分）

**何をする**
1. `consulting/crowdworks-send-ready.md` を開く（件名A/B/C＋本文＋署名 完成済み）
2. 相手企業の情報に合わせて件名を選択（C案優先）
3. `○○様` を相手企業名に置換、Zoom候補3つを確定
4. 送信 → `consulting/pipeline.md` に「2026-04-16 送信」追記

**返信率を上げる10チェック**
- 件名に【】を入れる
- 冒頭で相手企業名を呼ぶ
- 1段落3行以内
- 数字3つ以上
- 質問で締める
- 等身大の言葉「正直」「悩んで」を1箇所
- Zoom候補3つ・全て翌週内
- 実績PDF添付
- 末尾に署名
- 送信前に音読

---

## 🥉 #3 — X・スレッズ 初投稿（朝8時）

**何をする**
1. X (`@shohei_rizup`) ログイン → `marketing/threads-week1.md` Day1-朝（M1-朝 自己紹介）をコピペ投稿
2. Threads にも同じ内容を投稿（または `social-automation/threads-post.mjs` 自動実行）
3. 固定投稿に設定
4. 昼12:00 / 夜21:00 の投稿を予約 or 手動

**目的**
- 初日固定ツイート → フォロワーが「この人何者？」を3秒で理解
- 自己紹介は最高峰に磨き済み（全国1位・離職率-95%・AI駆動）

---

## 🏅 #4 — Stripe 本番設定（20分）

**何をする**
1. Stripe ダッシュボードで Pro (¥980/月) / Premium (¥1,480/月) の商品作成
2. Webhook URL を `https://rizup-app.vercel.app/api/stripe/webhook` で登録
3. Vercel 環境変数に `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` / `STRIPE_PREMIUM_PRICE_ID` 設定
4. テストカードで `/premium` ページから購入フロー通し

**完了確認**
- Stripe 管理画面で Webhook が "Successful" になる
- Supabase profiles の plan が "pro" / "premium" に更新される

---

## 🎖 #5 — App Store 申請準備（30分）

**何をする**
1. `APP_STORE_GUIDE.md` に沿って Capacitor ラップ
2. `app-store/` の4点セット（アイコン・スクショ・説明文・プライバシーポリシー）を確認
3. App Store Connect にアプリ作成
4. スクリーンショットを新アイコン（v4.3のミントR）で撮り直し→アップロード

---

## ⚠️ ブロッカー / 注意

- **Meta/Threadsトークン**：スマホのブラウザ認証が必須（AI側で代行不可）
- **Stripe本番**：テスト環境で通してから本番キーに差し替え

---

## 📊 今日の到達ライン

- [ ] #1 Threads全自動化（トークン発行＋テスト投稿）
- [ ] #2 CW スカウト① 送信完了
- [ ] #3 X/Threads 初投稿完了
- [ ] #4 Stripe 本番設定完了
- [ ] #5 App Store 申請準備完了

**5/5 達成 → 今週のマイルストーン全突破**
**3/5 達成 → 良い1日**
**1/5 達成 → 動けただけ偉い**

---

*Haru より：v4.3 リリースおつかれさまでした。次は収益化フェーズ。1%でOKです🌿*
