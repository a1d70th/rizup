# Rizup HQ — AI引継ぎファイル（v7.5 / アイコン刷新 + 会社ロゴ）

> 新しいチャットを開いたらまずこのファイルを読んで即作業開始。確認不要。
> **最終更新：2026-04-18（v7.5 リリース）**

---

## 🆕 v7.6（2026-04-18）— ダッシュボード運用化

**`public/dashboard.html` に 2 セクション追加**
- **📊 Rizup アプリ 現状**: バージョン / 本番 URL / 残ローンチタスク数 / Pro 価格の 4 メトリクス + ローンチ前チェックリスト（done/doing/todo の 3 ステータス色分け）+ 直近変更履歴 5 件
- **🗺 ロードマップ**: 今週 / 今月 / 来月 / Phase 2 の 4 段階タイムライン（`いつ / どこで / どのように`）+ 決定事項ledger（揺らがない基準）
- CSS は既存 `section.card` デザインに合わせる（mint アクセント・card-2 背景）、720px 以下でタイムライン縦積み

**運用ルール（自分への約束）**
- CLAUDE.md を更新した時点で `public/dashboard.html` の 2 セクションも必ず同期させる
- バージョンが上がるたびに「直近の変更履歴」と「ローンチ前チェックリスト」を更新
- 決定事項が変わったら「決定事項ledger」も即反映
- これで「どこで・何が・どこまで」がダッシュボードを開くだけでわかる

---

## 💰 収益モデル方針（2026-04-18 確定）

| プラン | 価格 | 主な差分 |
|---|---|---|
| **Free** | ¥0 | 自前ハウス広告あり（翔平さんSNS誘導バナー） |
| **Pro** | **¥480/月** | 広告完全非表示・Pro バッジ・週間AIレポート |
| **Premium**（将来） | 未定 | オフ会無料参加・児玉さんQ&A・限定コミュニティ |

**運用方針**
- 広告：Google AdSense 等は使わず**自前ハウス広告のみ**（翔平さんの SNS・note 誘導で二次収益を狙う）
- オフ会：**ユーザー 50 人到達までは開催せず**、その後オンライン先行で試験運用（Zoom）
- Google Calendar 連携：**今週中に iframe 埋め込み版**で対応（API 版は Phase2 以降）
- アプリ→ダッシュボード同期（Supabase `dashboard_state` テーブル）：**Phase2 以降**に実装

---

## 🆕 v7.5（2026-04-18）— PWAアイコン刷新 + 会社ロゴ + タグライン刷新

**タグライン刷新（旧「書くたびに村が育つ」→ 新「朝と夜、1分で未来が変わる。」）**
- v7.0 で村コンセプト撤去済なのに残っていた旧タグラインを全消し
- `src/app/layout.tsx`: title / description / OG / Twitter カード 5箇所を新タグラインに
- `public/manifest.json`: description + shortcut 「成長グラフ」説明を更新
- 新 description: 「朝のひとこと、夜のふりかえり。1分の記録から、小さな積み重ねで未来を変えていく。」

**PWA ホーム画面アイコン（`public/logo-r.svg` 全面書換）**
- 旧: v7.4 の DAWN(夜明けの太陽) → 新: **"RIZUP" ワードマーク**（Header.tsx と完全一致のミント→シアングラデ `#10b981 → #06b6d4`）
- ジオメトリック block-letter パスで構築（フォント依存ゼロ、小サイズでも崩れない）
- iOS 風 rounded corners (rx=112)、ダーク背景 + 上下アクセントグロー + 右上スパークドット
- `scripts/gen-icons.mjs` 実行済 → `public/icons/` 配下 15 サイズ + maskable 2 + apple-touch + favicon 再生成
- ルート `public/icon-192.png` / `icon-512.png` も同期

**ダッシュボード会社ロゴ（`public/logo-company.svg` 新規）**
- 横長 520×180、上昇アーク + "RIZUP" ワードマーク + アクセントライン + タグライン
- `public/dashboard.html`：`<h1>株式会社Rizup — 経営ダッシュボード</h1>` の上に `<img src="/logo-company.svg">` を追加、h1 を「経営ダッシュボード」のみに簡素化
- drop-shadow でミント系光彩、モバイル 720px 以下で幅 200px に自動縮小

**Service Worker**
- `public/sw.js`：CACHE_VERSION `rizup-v4.3` → **`rizup-v7.5`**（旧キャッシュ破棄 → 新アイコン即反映）

## ✅ v7.4.1（2026-04-18・commit 3b88b8e）
- 感謝バナーを 1日1回のみ表示に制限

## ✅ v7.4（2026-04-18・commit e4c83f9）
- **DAWN アイコン**（夜明けの太陽・v7.5 で "RIZUP" ワードマークに置換予定）
- 3行日記（did_well / grateful / tomorrow_word）+ posts マイグレ
- 起床バッジ + streak 拡張

## ✅ v7.3.1（2026-04-18・commit 2c631bc）
- 朝活 CSS 修正 + PWA アイコン刷新（ダーク基調、後に v7.4 で DAWN 化 → v7.5 で ワードマーク化）

---

## 📱 iPhone ホーム画面アイコンが古いままの対処

iOS はホーム画面アイコンを強くキャッシュするため、以下の手順が必須:

1. **デプロイ確認**: 変更を GitHub へ push → Vercel 自動デプロイ完了を待つ
2. **iPhone 側**:
   - ホーム画面の旧 Rizup アイコンを長押し → 「Appを削除」
   - Safari を開く → Safari の「履歴とWebサイトデータを消去」（設定 > Safari）
   - Safari で `https://rizup-app.vercel.app` を開く
   - 共有ボタン → 「ホーム画面に追加」→ 新しい RIZUP ワードマークが表示される

---

## ✅ v7.4（2026-04-18）— 朝活データ + 3行日記

**DB マイグレ（要実行）**
- `app/rizup-app/supabase/migrations/20260418_journal_v74.sql`（冪等・IF NOT EXISTS）
  - posts に `wake_time` / `bedtime`（HH:MM 文字列）
  - posts に `did_well` / `grateful` / `tomorrow_word`（3行日記）
  - `posts(type, created_at DESC)` インデックス追加
- **状態：翔平さんが Supabase SQL Editor で実行中**

**コード実装（完了済み）**
- `src/app/journal/page.tsx`：朝モードに起床/就寝時刻 input、夜モードに 3行日記（できたこと / 感謝 / 明日の一言）を追加。localStorage で入力保持、送信時 payload に `wake_time` / `bedtime` / `did_well` / `grateful` / `tomorrow_word` を含める
- `src/components/PostCard.tsx`：朝活投稿で「⏰ HH:MM 起床 / 🌙 HH:MM」を表示
- `src/app/home/page.tsx`：Post 型に v7.4 カラム追加

## 🚀 ローンチ前チェックリスト（v7.4 更新）

- [ ] **DB v7.4**: `supabase/migrations/20260418_journal_v74.sql` を Supabase SQL Editor で実行（**実施中**）
- [x] **DB v7.3 以前**: `src/scripts/run-migration.md` の SQL 実行済み
- [x] **テストデータ**: `supabase/README_SEED.md` 手順で seed-posts.sql 投入済
- [ ] **Stripe**: `.env.local.example` 参照して Vercel に 4 変数登録（**準備中**）
- [ ] **Stripe Dashboard**: Webhook `/api/stripe/webhook` 登録 + signing secret 反映（**準備中**）
- [x] **PWA実機**: iPhone Safari「ホーム画面に追加」→ 追加できるようになった ✅
- [ ] **Threads**: @shohei_rizup 初日投稿
- [ ] **note**: 下書き公開
- [ ] **Pro購入テスト**: /pricing → Checkout → Webhook で plan=pro に更新されるか

---

## ✅ v7.3（2026-04-18）— タイムライン大掃除 + ヘッダー刷新

**ロゴ（グラデーションタイポ）**
- `Header.tsx`: SVG Image → CSS グラデの "RIZUP" 文字に変更
  - `linear-gradient(135deg, #10b981 → #06b6d4)` を -webkit-background-clip:text で文字に流す
  - `font-weight:900 / letter-spacing:-0.03em / Inter / 1.4rem`
- PWA スタンドアロンで iOS のステータスバー（時計/バッテリー）と被らないよう
  `paddingTop: env(safe-area-inset-top)` をヘッダーに付与
- sticky top-0 z-30 で常時追従

**PostCard 大幅簡素化**
- 「ユーザー」フォールバックを撤去（名前なしは非表示、アバター alt は「匿名」）
- 気分 `{mood}/5` の表示行を削除
- `compound_score` バッジを削除
- AI feedback の折りたたみブロックを丸ごと削除（不要なノイズだった）
- リアクションボタン: テキスト(応援してる/わかるよ/すごい！) → 絵文字のみ（🌱 ❤️ ✨）
  - 数字は > 0 の時だけ小さく表示
- 本文: `text-base / leading-[1.85] / font-weight:600` に昇格（一番大きく目立つ）

**ホーム**
- 「☀️ 今日のひとこと済み ✅ / 📝 今日のひとことまだ」の状態バッジ行を撤去（Hero の streak 表示と CTA ボタンで代替）

**テストデータ**
- `app/rizup-app/supabase/seed-posts.sql` 新規（8件・朝4/夜4）
- `app/rizup-app/supabase/README_SEED.md`: user_id 差し替え手順と投入手順

---

## ✅ v7.2（2026-04-17）— ロゴリデザイン + Avatar 刷新

- `public/logo-r.svg`: 卵フェイス撤去、ミント3段グラデ + 幾何学カスタム R パス + アクセントドット
- `public/logo.svg` / `logo-white.svg`: "RIZUP" → "rizup" 小文字、r にグラデ、末尾ドット
- PostCard Avatar: 単色 → 斜めグラデ + ハイライト + Inter-900

## ✅ v7.1（2026-04-17）— 朝活3項目 + PWA 導線

- ジャーナル朝モードに 🌙入眠/☀️起床/⏱睡眠 の3カラム。睡眠時間自動計算
- ジャーナル送信ボタンの safe-area 対応
- InstallBanner を全面書換 + home で mount（beforeinstallprompt / iOS モーダル）

## ✅ v7.0（2026-04-17）— キャラ/卵/森を撤去

- tag: `v6.8-village-backup`、branch: `backup/village-concept-v6.8` で復元可能
- ホームを Hero (streak) + CTA + タイムライン の 3 ブロックに
- BottomNav: 🌳 森 タブ削除（4 タブ）

## ✅ v6.2〜v6.8（2026-04-17）— 継続の仕掛け・Stripe・500速度

---

## 🚀 ローンチ前チェックリスト（v6.8）

- [x] **DB**: `app/rizup-app/src/scripts/run-migration.md` の SQL を Supabase SQL Editor で実行（400 エラー解消）
- [x] **Stripe**: `.env.local.example` 参照して Vercel に `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRO_PRICE_ID` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` を登録
- [x] **Stripe Dashboard**: Webhook エンドポイント `/api/stripe/webhook` を追加し、signing secret を環境変数に反映
- [ ] **Threads**: @shohei_rizup 初日投稿
- [ ] **note**: 下書き公開
- [ ] **PWA実機**: iPhone Safari で「ホーム画面に追加」→ ミントアイコン確認
- [ ] **Pro購入テスト**: /pricing → Checkout → Webhook で plan=pro に更新されるか確認

---

## 🆕 v6.8（2026-04-17 夜）— ローンチ仕上げ

- 初回ユーザー誘導を「自動遷移」から「キャラ未設定バナー」に切替（前版は /character-setup への強制 replace で体感が悪かった）
- `src/scripts/run-migration.md` を新規：Supabase SQL Editor でのマイグレ実行手順書
- `/mypage` → `/profile` redirect ページ追加（旧 URL 救済）
- ログイン成功時 `router.replace("/home")` 動作確認
- ダッシュボード：カレンダーセクションの Google リンク + 月〜日のメモ欄（週次リセット）動作確認

## ✅ v6.7 / v6.7.1（2026-04-17）— 400 対策 + 速度改善

- `profiles?select=...character_animal,character_name` 400 エラー対策：select を多段フォールバック化（full → streak+is_admin → id）
- `supabase-v6-safe.sql` と `supabase/migrations/20260417_fix_profiles.sql` 新規：カラム追加 + RLS 3 ポリシー再作成
- 「🔥 {streak}日連続！」を 24px ミントで大きく表示
- 「🔥 今日 N人 が記録したよ」 peer effect バッジ（posts.count の HEAD クエリ 1 本）
- タイムライン初期取得 500→20 件
- `/api/check-progress` を 2秒 setTimeout で遅延実行（初期レンダリング非ブロック）
- 初期ロードクエリを約 5 本削減

## ✅ v6.6（2026-04-17）— Stripe 課金フロー完成

- `/api/stripe/checkout` の success_url を `/home?subscribed=true` に
- `/pricing` 新規：Free vs Pro 比較カード + 「Proにアップグレード」ボタン
- `/home` で ?subscribed=true を検知してトースト
- `.env.local.example` を Stripe/VAPID/Anthropic の全変数で拡充
- 「アシスタントマネージャー」対策：BAD_NAMES で不正 character_name を自動クリア

## ✅ v6.5（2026-04-17）— PWA 刷新 + ダッシュボード公開

- `manifest.json`: start_url `/home` / background `#0a0a0a` / theme `#10b981`
- `public/icon-192.png` / `icon-512.png` をルートに配置
- layout.tsx: theme-color を `#10b981` に統一、status-bar を black-translucent
- `public/dashboard.html` 配置 + `next.config.mjs` rewrite `/dashboard → /dashboard.html`
- ダッシュボード v2.0: メディア集客 / 週間スケジュール / ルーティン / カレンダー / 事業⑨ を追加、モバイル overflow 修正、固定ヘッダー折りたたみ

## ✅ v6.4（2026-04-17）— 引き算リデザイン + Quick-Post

- ホーム: おやつ・FAB・🔄更新・朝活チャレンジカードを削除
- Quick-Post モーダル: ホーム内で気分2択 + 一言 + 送る✨ で完結投稿
- 認証 maxAge を 30日 に延長

## ✅ v6.3（2026-04-17）— 朝活チャレンジ + 明示入力

- 朝ジャーナルに「今日起きた時刻」<input type="time">
- 朝モード:「🎯 今日の目標を一言」/ 夜モード:「🌙 今日できたこと一言」

## ✅ v6.2（2026-04-17）— streak バグ根絶 + 継続の仕掛け

- 投稿後 `/api/check-progress` を await → 即 currentStreak 反映 + profiles.streak を直接 UPDATE
- マイルストーン（3/7/14/30）紙吹雪 + 「ありがとう🌸」
- 危機バナー 22:00〜23:59（streak 依存撤廃）+「今すぐ書く」
- PostCard: h-44px / 14px / border-2 / localStorage 永続化

---

## 🆕 v6.3（2026-04-17）— 朝活チャレンジ + ジャーナル明示入力

**朝活チャレンジ（みんなで変わる30日）**
- `src/app/home/page.tsx`：オレンジ系の専用カードを MyCharacter 下・ステータス行上に配置
- 「⏰ 今日起きた時刻を記録する」ボタン → クリックで `HH:MM` を `localStorage.rizup_wake_log` に追記（過去60件保持）。今日既に記録済なら時刻表示に差し替え
- 連続記録日数バッジ「🔥 N日連続」を右上に表示。今日未記録の場合は昨日起点で遡って計算
- 直近7件の起床時刻をカード列として横スクロール可能に表示（MVP・DB依存なし）
- 将来 DB 化する場合は `wake_records(user_id, date, time)` テーブル追加で Supabase 同期できる設計

**ジャーナルに明示入力欄**
- 朝モード：「🎯 今日の目標を一言」オレンジ枠入力（80字・posts.morning_goal に保存）。朝5〜9時推奨を案内
- 夜モード：「🌙 今日できたこと一言」ミント枠入力（80字）。送信時に `✅ 今日できたこと：xxx` を content の先頭に自動前置き

---

## ✅ v6.2（2026-04-17）— streak バグ修正 + 継続の仕掛け仕上げ

**streak バグ修正（最重要）**
- `src/app/journal/page.tsx`：投稿後の `/api/check-progress` を fire-and-forget → `await` に変更。レスポンスの streak を `setCurrentStreak` に反映。通信失敗時は `s + 1` でフォールバック。→ 「投稿直後に streak が 0 のまま」事象を根絶
- `/api/check-progress`（既存）は posts テーブルから JST 基準で streak を再計算し profiles.streak を更新するロジックを保持（信頼源）

**マイルストーン演出（3/7/14/30）**
- `src/app/home/page.tsx`：streak==3/7/14/30 の初回到達時に `localStorage.rizup_milestone_{n}` で1回だけモーダル発火
- メッセージを「3日続いた！ももが喜んでるよ🌱 / 1週間！すごい、本当にすごいよ✨ / 2週間続けた。これは本物だ🔥 / 1ヶ月！あなたは変わった🌟」に刷新（相棒名があればそちらを優先）
- `src/app/globals.css` に `@keyframes confettiFall` + `.confetti-piece` を追加。モーダル背景に 32 枚の紙吹雪を降らせる。閉じるは「ありがとう🌸」

**ストリーク危機バナー**
- 22:00〜23:59 かつ 朝/夜どちらも未投稿の日に固定表示。`streak > 0` 条件を撤廃（初日の離脱も阻止）
- 文言「⏰ あと◯時間で連続が途切れちゃう...{相棒名}が待ってるよ」＋「今すぐ書く」ボタン（/journal）

**プログレスバー**
- ホーム：`🥚 あと◯日で{次のステージ名}に変身！` テキスト + ミントグラデの h-2 バー。0〜3〜7〜21〜45〜75〜100 の閾値で赤ちゃん→子供→大人→村人→村長→伝説

**ジャーナルUI**
- 気分ボタンを `min-h-[80px]` で最低80px保証
- 「このまま送る」を画面下 `fixed bottom-16` に固定（wantWrite でも朝/夜どちらでも常時視認）
- 「今日は書かなくていい」を `text-emerald-400` / 16px のスキップ導線として追加（/home に遷移）

**PostCard リアクション**
- 高さ `h-[44px]` 固定・文字 `text-[14px]`・`border-2` で押下時の差が明確
- `localStorage.rizup_reactions_{postId}` に自分の押下集合を保存 → 通信失敗しても UI が巻き戻らない

---

## ✅ v6.0（2026-04-17）— 継続の仕掛け完成 + streak バグ撲滅

**streak バグ修正（最重要）**
- `src/app/journal/page.tsx`：投稿後の `/api/check-progress` を fire-and-forget → `await` に変更。レスポンスの streak を `setCurrentStreak` に反映。通信失敗時は `s + 1` でフォールバック。→ 「投稿直後に streak が 0 のまま」事象を根絶
- `/api/check-progress`（既存）は posts テーブルから JST 基準で streak を再計算し profiles.streak を更新するロジックを保持（信頼源）

**マイルストーン演出（3/7/14/30）**
- `src/app/home/page.tsx`：streak==3/7/14/30 の初回到達時に `localStorage.rizup_milestone_{n}` で1回だけモーダル発火
- メッセージを「3日続いた！ももが喜んでるよ🌱 / 1週間！すごい、本当にすごいよ✨ / 2週間続けた。これは本物だ🔥 / 1ヶ月！あなたは変わった🌟」に刷新（相棒名があればそちらを優先）
- `src/app/globals.css` に `@keyframes confettiFall` + `.confetti-piece` を追加。モーダル背景に 32 枚の紙吹雪を降らせる。閉じるは「ありがとう🌸」

**ストリーク危機バナー**
- 22:00〜23:59 かつ 朝/夜どちらも未投稿の日に固定表示。`streak > 0` 条件を撤廃（初日の離脱も阻止）
- 文言「⏰ あと◯時間で連続が途切れちゃう...{相棒名}が待ってるよ」＋「今すぐ書く」ボタン（/journal）

**プログレスバー**
- ホーム：`🥚 あと◯日で{次のステージ名}に変身！` テキスト + ミントグラデの h-2 バー。0〜3〜7〜21〜45〜75〜100 の閾値で赤ちゃん→子供→大人→村人→村長→伝説

**ジャーナルUI**
- 気分ボタンを `min-h-[80px]` で最低80px保証
- 「このまま送る」を画面下 `fixed bottom-16` に固定（wantWrite でも朝/夜どちらでも常時視認）
- 「今日は書かなくていい」を `text-emerald-400` / 16px のスキップ導線として追加（/home に遷移）

**PostCard リアクション**
- 高さ `h-[44px]` 固定・文字 `text-[14px]`・`border-2` で押下時の差が明確
- `localStorage.rizup_reactions_{postId}` に自分の押下集合を保存 → 通信失敗しても UI が巻き戻らない

**備考**
- character-setup は v5.7 で既に「名前をつけてね」「あかちゃん」文言除去済（再確認OK）
- DB スキーマは v5 のまま（supabase-v5.sql 実行済であれば追加マイグレ不要）

---

## 本人
児玉翔平・28歳・大阪・資金200万・株式会社Rizup代表
今月目標：20万円 / 来月目標：30万円

---

## 🎯 現在のステータス

### ✅ 完了（2026-04-16・v5.0 "村コンセプト大刷新"）

**v5.0（最新）— 村で育つ自己理解アプリへ**
- **PHASE 1 UI バグ**：home/PostCard 背景色統一は既に v4.8 で適用済み、習慣チェックも正常動作を確認
- **PHASE 2 言葉の刷新**：複利→小さな積み重ね、ビジョン→なりたい自分、習慣→毎日のこと、朝/夜ジャーナル→朝のひとこと/夜のふりかえり、アンチビジョン→避けたい未来、複利スコア→今日の積み上げ
  - layout.tsx の title/OG を「Rizup — 書くたびに村が育つ。」に
  - home / journal / habits / vision / profile / growth / settings / sho-messages / cron / PlanGate 全て UI テキスト置換
- **PHASE 3 動物キャラ育成（Finch TTP）**：`src/components/MyCharacter.tsx` 新規
  - 5動物（うさぎ/たぬき/ねこ/りす/ふくろう）× 7段階（卵→赤ちゃん→子供→大人→村人→村長→伝説）
  - SVG で描画・ミント系カラーパレット・時間帯別メッセージ（朝/昼/夜/深夜）
  - `/character-setup` 新規：動物選択→名前入力の2ステップ
  - プロフィール DB と localStorage 両方に保存（未マイグレ環境でも動作）
  - ホームに大きく表示（130px）、タップで時間帯メッセージ
- **PHASE 4 自己理解システム**：
  - `/api/weekly-report` 新規（Claude Haiku 4.5）：過去7日を分析し「気分傾向/よく使った言葉/強み/来週のあなたへ」を JSON 返却、24h キャッシュ
  - `/api/strength-detect` 新規：投稿本文から強み（6〜12字の動詞＋力）を抽出
  - growth ページに「今週のあなた」セクション追加
  - journal 投稿後に強み抽出 → トースト表示 ＆ profile.strengths に保存
- **PHASE 5 森の村**：
  - `supabase-v5.sql` 新規（IF NOT EXISTS 安全）：profiles に character_animal/name/strengths/weekly_report 追加、friends/journal_transformations/strength_gifts テーブル新規（RLS 付き）
  - `/village` 新規：自分の家（中央・大）＋仲間の家（上限5人、Pro/Premium 7人）・季節背景（桜/ひまわり/紅葉/雪/星空）・アクション3種（わかる🌱/強みを贈る✨/変身🎭）
  - BottomNav を 🏠📝🎯📈👤 → 🏠📝🏘️📈👤（ビジョン→村）。ビジョン導線は profile 経由
  - middleware に /village /character-setup を protectedPaths に追加
- **PHASE 6 強みを見つけ合う**：
  - PostCard に「✨ 強みを発見」ボタン。フォームから strength_gifts に保存
  - profile に「💪 みんなが見つけてくれた私の強み」セクション追加
- ビルド成功（/village 4.99kB, /character-setup 2.33kB, 新 API route 4本）
- 型チェック・ESLint パス（warnings のみ）

### ✅ 完了（2026-04-15 深夜・v4.8 "最終品質仕上げ"）

**v4.8（最新）**
- ホーム最外タグを `<div>` → `<main>` に昇格し `bg-[#fafafa] dark:bg-[#111111]` 明示
- PostCard `<article>` を `bg-white dark:bg-[#1c1c1e] border-b border-gray-100 dark:border-[#2a2a2a]` に統一（spec 準拠）
- globals.css に `html.dark` / `html.dark body` の明示ルール追加（iOS Safari のバウンススクロール対策）
- `research/buzz-posts-week2.md`（Kai）：バズパターン5分類 + Rizup 版 5投稿
- Week2 用 threads-week2.md は v4.7 で Rei が作成済

### ✅ 完了（2026-04-15 深夜・v4.7 "スクロール撲滅+UX最終"）

**v4.7（最新）**
- globals.css に `html, body, main` 背景色を固定（`#fafafa` / dark `#111111`）→ スクロール暗転の**最後の経路**も封鎖
- ホーム 3リングを `r=28 / w-16 h-16` に拡大、ラベル `text-xs→text-sm`、padding `py-3→py-5`
- FAB を `right-4 bottom-20` / 🔄 を `bottom-40` に移動（spec 準拠）
- `/api/cron/morning-notification`：文言を「☀️ おはよう。今日の1%を1分で書こう」系7種に置換（所要時間明示＋感情訴求）
- `marketing/threads-week2.md`：Rei が Week2 用のバズ参考5投稿＋21本振り分け案を作成

### ✅ 完了（2026-04-15 深夜・v4.6 "品質最終仕上げ"）

**v4.6（最新）— スクロール暗転根絶 + 朝ジャーナル簡素化 + アバター改善**
- PostCard アバターを **イニシャル表示**（#6ecbb0 背景・白太字・16px）に刷新。旧シード "Sho" は "R" に正規化
- ホーム：「みんなの今日」テキスト廃止、＋投稿を **右下 FAB**（w-14 mint）、🔄更新も FAB 化
- 投稿リストを `flex gap-0 bg-[#fafafa] dark:bg-[#111111]` + 各 PostCard wrapper に同色背景 + border-b で区切り → **スクロール暗転完全解消**
- globals.css の `.bg-bg` を `#fafafa` / `.dark .bg-bg` を `#111111 !important` に明示化
- ジャーナル：朝「問いかけ + 気分 + 目標」の3要素で**2-3タップ投稿**。その他は `もっと書く▼` 展開
- 「🌿 今日の問いかけ」カードをグラデ + 大文字にリデザイン
- 「⟳ 昨日と同じ」をオレンジFILLボタンに昇格
- research/ui-inspiration.md：Streaks/Finch/Daylio/Bearable 分析 + 改善案

### ✅ 完了（2026-04-15 夜・v4.5 "毎日使いたくなる仕掛け"）

**v4.5（最新）— 引き付け要素の本実装**
- ホーム3リング可視化（朝/夜/習慣 + 連続）：SVG `<circle>` の `strokeDasharray` で達成率を円弧化。Apple Fitness 方式
- ホーム「🎯 今日のひとこと」：ビジョンの description/title から1文を日替わりで表示
- ホーム dark 背景を `bg-bg dark:bg-[#111111]` に統一し、カード間の暗転を解消
- 朝ジャーナル「🌿 今日の問いかけ」：曜日ごと7種ローテ（月〜日で固定文言）
- Streak Freeze：`/habits` 上部に🧊保護ボタン。今日の使用＆月内残数を `profiles.streak_freeze_used_at/count` で管理
- DB マイグレ：`app/rizup-app/supabase-v4.5.sql`（IF NOT EXISTS で安全・既存ユーザに残数1付与）
- 通知改善案 3件：朝/夜/ストリーク危機の文言を `improvement-proposals-v2.md` に追記

### ✅ 完了（2026-04-15・v4.4 "引き算" リリース）

**v4.4（今日）— 引き算の法則で再設計**
- `research/simplicity-research.md`（Kai）：2025年ウェルネスアプリ TOP10 の引き算原則
- `company/spec-audit.md`（Sora）：現状19ページ/13コンポ/14API 棚卸し
- `company/spec-v2.md`：コア4動作（朝→習慣→夜→グラフ）の最小仕様
- `research/improvement-proposals.md` / `improvement-proposals-v2.md`（Kai）：引き付け要素の追加リサーチ＋改善提案
- コード削除：`/recommend`・`/anti-vision`・`/api/sho-insight`・`Confetti.tsx`
- middleware から `/recommend` `/anti-vision` の保護を除去
- プロフィールの「🚫 アンチ」ボタン→「🔄 習慣」に差し替え
- `home/page.tsx` を 162 行に圧縮（spec-v2 要求の 200 行以内をクリア）
- ジャーナル：「⟳ 昨日と同じ」ボタン・文字数カウンター・「⏱ 1分」タイマー（Fabulous方式）を追加

### ✅ 完了（2026-04-15 AM・v4.3 リリース）

**v4.3（今日）— 散歩メモ7項目＋ブラウザ確認バグ一括修正＋仕上げ**
- アイコン刷新：`public/logo-r.svg`（#6ecbb0 下地・白抜きR）→ sharp で 16/32/72/96/128/144/152/167/180/192/384/512/maskable/apple-touch 全サイズ再生成
- /today ページ撤去：middleware・朝ジャーナル遷移・BottomNav・vision導線を整理（5タブ固定：ホーム/ジャーナル/ビジョン/成長/マイページ）
- ホーム：Confetti削除、pull-to-refresh（touch）、タイムラインタブ撤去、IntersectionObserver廃止し500件一括表示、トライアル/ToDo表示撤去
- アンチビジョン：手動追加を撤去し `/api/anti-vision/generate`（Claude Haiku 4.5）で自動生成。ビジョン空なら「先にビジョンを設定してください」導線
- 夜ジャーナル：「今夜の予定就寝時刻」撤去→「昨夜は何時間寝ましたか？」単独
- PostCard：旧シード "Sho" 名を非表示化
- ジャーナル：useEffect 依存を `[]` に、`today` を effect 内に移動してフリーズ根絶。朝「今日の目標」をオレンジ強調カードに。投稿ボタンを `fixed bottom-16` で常時押下可能に
- ビジョン：タブ内アンチビジョンも自動生成に統一
- 成長グラフ：カード・チャートに `dark:` クラス追加、SVG線を3pxに強化、ドットに白リング
- 全画面：Header／各フォームに `dark:bg-[#1a1a1a]` / `dark:border-[#2a2a2a]` 追加
- A11y：主要ボタンに aria-label／chart に role="img" aria-label 追加
- Service Worker：v4.3 にバンプ、PRECACHE に /home /journal /vision /growth /profile 追加、push icon を /icons/icon-192.png に
- offline.html：`/sho.png` → `/icons/icon-192.png` 参照に統一
- Recommend / journal のモデレーション警告文言："Sho" → "Rizup"

### ✅ 過去の完了（2026-04-13・v3.2 → v4.0 まで一気通貫）

**v3.2 → v3.5 → v3.5.1 → v4.0 のアプリ進化**
- v3.2: 朝夜ジャーナル / ビジョン4階層 / アンチビジョン / 今日のToDo / 習慣 / 複利スコア / Stripe / 3stepオンボーディング
- v3.3-3.4: BottomNav 5項目統一・LP複利軸・PWA基盤・Apple Splash全解像度
- v3.5: PWAホーム画面追加バグ完全修正（sho.png 1408x768横長 → 正方形15サイズ生成）
- v3.5.1: 全画面 sho.png 参照を /icons/icon-192.png に統一（歪み解消）
- **v4.0（最新）**:
  - **ホーム完全刷新**：「Rizupから」大カード・ダッシュボード・通知バナー・クイックアクセス全削除 → 1行ステータスバー + Threads風タイムライン
  - **PostCard 全面書換**：48pxアバター・15px本文・44pxタップリアクション・ストリーク/複利スコアバッジ・5行省略+続きを読む
  - **タイムライン機能**：無限スクロール（IntersectionObserver+ref化でループ防止）/ 60秒新着ポーリング / タブフィルター（全員/フォロー中/朝/夜）/ 朝目標・夜達成状況コンテキスト
  - **真っ白バグ修正**：profiles(streak)未マイグレーション環境でフォールバック
  - **ダークモード本格対応**：globals.css に .dark セレクタで個別オーバーライド15項目 + settings画面に自動/ライト/ダーク3択トグル + localStorage永続化 + FOUC回避スクリプト
  - **PWA最終調整**：manifest start_url="/"・vercel.json で manifest+json Content-Type / Service-Worker-Allowed / icons immutable cache

**社内基盤（不変）**
- `dispatch-server.mjs` v2：携帯から POST で intent routing
- `social-automation/`：Threads/X 自動投稿 + GAS連携
- `.claude/agents/`：Sora/Haru/Kai/Rei/Leo/QA の6人（qa-reviewer に「実ブラウザ動作確認」必須項目追加済）
- `research/timeline-ux-research.md`：Kai が書き上げた Threads/X/Fabulous 等のフィードUX研究
- 投稿ストック：56本（Rei が threads-week1.md にフック追記済）

### 🔴 未完了（翔平さん操作必要）
1. **Supabase SQL 実行（最優先）**：`app/rizup-app/supabase-v5.sql`（v5 村コンセプト用・profiles カラム追加＋friends/journal_transformations/strength_gifts テーブル新規）
   - 次に `app/rizup-app/supabase-final-fix.sql`（全テーブル整合）+ `social-automation/supabase-seed-recommendations.sql`
2. **PWA実機テスト**：iPhone Safari → ホーム画面追加 → 正方形ミントアイコンで起動確認
3. **ダーク切替テスト**：設定 → テーマ → ダーク → 背景 #111111 確認
4. **Stripe本番設定**：商品作成・Webhook登録・Vercel環境変数
5. **X アカウント開設**：`@shohei_rizup`
6. **Threads トークン取得**：Meta Developer でApp作成
7. **CW スカウト① 送信**：`consulting/crowdworks-send-ready.md` 完成版コピペ送信

---

## 🔗 URL
- **App**: https://rizup-app.vercel.app
- **LP**: https://rizup.vercel.app
- **GitHub**: https://github.com/a1d70th/rizup
- **Supabase**: プロジェクトID `pcysqlvvqqfborgymabl`

---

## 💰 収益源

| 事業 | 状況 | 今月目標 |
|---|---|---|
| Rizup Pro/Premium | デプロイ済・Stripe未完了 | 有料10名 |
| クラウドワークス | 応募7件・スカウト①返信準備完了 | 受注1件 ¥150,000 |
| note | 準備中 | 来月稼働 |
| X (@shohei_rizup) | アカウント未開設・初日投稿準備完了 | フォロワー+300 |
| Threads | トークン未取得・自動投稿基盤完成 | 毎日3投稿 |

---

## 👥 AI社員（`.claude/agents/`）

| 社員 | 役割 | 主要KPI |
|---|---|---|
| **Sora** (CTO) | アプリ開発・実装 | バグ0・週次デプロイ |
| **Haru** (秘書) | 進捗管理・日報 | タスク完了率90% |
| **Kai** (CMO) | 市場リサーチ | 月2レポート・4提案 |
| **Rei** (CCO) | X/Threads/note発信 | 月30本・フォロワー+300 |
| **Leo** (CSO) | CW営業 | 提案10件・受注3件 |
| **QA** | 品質レビュー | コミット前レビュー |

---

## 🗂 重要ファイル一覧

| ファイル | 用途 |
|---|---|
| `company/spec.md` | Rizup v3 仕様書 |
| `company/tomorrow-priorities.md` | **🔥 明日朝イチで開く（v4.0以降の最優先5タスク）** |
| `company/morning-briefing-tomorrow.md` | 朝礼コマンド一発コピペ |
| `app/rizup-app/supabase-final-fix.sql` | **DB全テーブル整合・1本で同期完了** |
| `app/rizup-app/supabase-v3-rebuild.sql` | （旧）DB統合マイグレーション |
| `social-automation/supabase-seed-recommendations.sql` | おすすめ初期11件 |
| `app/rizup-app/scripts/gen-icons.mjs` | sharp製 PWAアイコン15サイズ生成スクリプト |
| `app/rizup-app/public/icons/` | 16/32/72/96/128/144/152/167/180/192/384/512+maskable |
| `app/rizup-app/ENV_CHECKLIST.md` | Vercel環境変数11項目 |
| `app/rizup-app/APP_STORE_GUIDE.md` | Capacitorラップ手順 |
| `app-store/` | App Store申請4点セット |
| `consulting/crowdworks-send-ready.md` | **CW送信完成版（件名A/B/C・本文・10改善）** |
| `marketing/threads-week1.md` | **Reiが磨いたWeek1×21本（フック行付き）** |
| `marketing/x-profile.md` | X投稿ストック56本 |
| `marketing/x-twitter-ready.md` | X開設&初日投稿準備 |
| `social-automation/sns-dashboard.html` | SNS運用ダッシュボード（Week1可視化済） |
| `social-automation/gas/setup-auto.md` | GAS 15分セットアップ |
| `research/timeline-ux-research.md` | **Kai：Threads/X/Fabulous 等のフィードUX研究** |
| `notion-workspace/NOTION_IMPORT.md` | Notion構築3方式 |

---

## ⏰ 日次ルーティン
06:30 朝ジャーナル（Rizupアプリ）・X Post 1
09:00 CW提案 / Stripe設定（翔平さん個人タスク）
12:00 X Post 2
13:00 note・メディア
17:00 ジム
19:00 アプリ改善
21:00 X Post 5 / 夜ジャーナル

---

## 🚨 緊急連絡
- メール：a1d.70th@gmail.com
- GitHub：a1d70th
- Supabase管理者：翔平（1人のみ）

---

*最終更新：2026-04-15 夜 / Rizup v4.3 / 児玉翔平*
