# Rizup HQ — AI引継ぎファイル（v5.0 / 村コンセプト大刷新）

> 新しいチャットを開いたらまずこのファイルを読んで即作業開始。確認不要。
> **最終更新：2026-04-16（v5.0 リリース）**

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
