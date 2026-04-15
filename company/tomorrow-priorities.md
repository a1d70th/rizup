# 明日の優先順位 TOP5（2026-04-16 木曜 朝イチ実行）

> 作成：Haru（秘書）/ 2026-04-15 夜更新（v4.4 リリース後）

---

## 🥇 #1 — スマホでMeta認証→Threads全自動化（15分・最重要）

1. Meta for Developers にログイン → アプリ作成 → Threads API 権限追加
2. アクセストークンを発行
3. `social-automation/config.json` にトークン貼り付け
4. `node social-automation/threads-post.mjs` でテスト投稿成功
5. dispatch経由で「スレッズ投稿して」→ 実投稿が走ることを確認

---

## 🥈 #2 — クラウドワークス スカウト① 送信（10分）

`consulting/crowdworks-send-ready.md` は完成済み。相手企業名と Zoom 候補日時を埋めて送信→`consulting/pipeline.md` に追記。

---

## 🥉 #3 — X・Threads 初投稿（朝8時）

`marketing/threads-week1.md` Day1-朝（自己紹介）を X と Threads に投稿。固定ツイートに設定。

---

## 🏅 #4 — Stripe 本番設定（20分）

Pro/Premium 商品作成 → Webhook 登録 → Vercel 環境変数設定 → テストカードで `/premium` 通し。

---

## 🎖 #5 — App Store 申請準備（30分）

Capacitor ラップ → `app-store/` の4点セット確認 → v4.3 の新アイコンでスクショ撮り直し → App Store Connect アップロード。

---

## v4.4 の確認ポイント（翔平さんにお願い）
- `/home` が 162 行で軽いこと
- `/journal` で「⟳ 昨日と同じ」「⏱ 1分」ボタンが見えること
- `/recommend` `/anti-vision` `/today` を開いても middleware が /login に飛ばさないこと（どれもルート削除済みで 404）
- タイムラインがタブなしの1本フィードであること

---

## 📊 到達ライン
- [ ] #1 Threads全自動化
- [ ] #2 CW スカウト① 送信
- [ ] #3 X/Threads 初投稿
- [ ] #4 Stripe 本番設定
- [ ] #5 App Store 申請準備

**5/5 → 今週のマイルストーン突破 / 3/5 → 良い1日 / 1/5 → 動けただけ偉い**

---

*Haru より：v4.4 "引き算" リリースおつかれさまでした🌿*
