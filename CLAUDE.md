# Rizup HQ — AI引継ぎファイル（v3.2 / 社内基盤完成版）

> 新しいチャットを開いたらまずこのファイルを読んで即作業開始。確認不要。
> **最終更新：2026-04-13 夜（v3.2 本番準備完了）**

---

## 本人
児玉翔平・28歳・大阪・資金200万・株式会社Rizup代表
今月目標：20万円 / 来月目標：30万円

---

## 🎯 現在のステータス

### ✅ 完了（2026-04-13）
**アプリ v3.2**
- 朝夜ジャーナル（朝→夜ループ・linked_morning_post_id で接続）
- ビジョン4階層 × 6カテゴリ（進捗自動計算）
- アンチビジョン
- 今日のToDo（ヒーロー表示・Rizupジャンプ）
- 習慣トラッカー（ビジョン紐付け・複利予測）
- 成長グラフ（理想 vs 実績の複利曲線）
- 複利スコア（0-100点自動算出）
- 時間帯別 Sho 挨拶（朝/昼/夜/深夜）
- PWA・オフラインページ・ダークモード
- Toast通知・Confetti・Rizupアニメ
- `safe-insert.ts`：DB未マイグレーション時でも動作するフォールバック
- Stripe Webhook
- 3ステップ オンボーディング

**社内基盤**
- `dispatch-server.mjs` v2：携帯から POST で intent routing
- `social-automation/`：Threads/X 自動投稿 + GAS連携
- `.claude/agents/`：Sora/Haru/Kai/Rei/Leo/QA の6人
- `company/tomorrow-first-actions.md`：明日の朝一リスト
- `app-store/`：申請用ドキュメント4点
- `notion-workspace/`：Notion構築手順（3方式）
- 投稿ストック：計56本（x-profile.md 48 + 8）

### 🔴 未完了（翔平さん操作必要）
1. **Supabase SQL 実行**：`supabase-v3-rebuild.sql` + `supabase-v3.2-appstore.sql`
2. **Stripe 本番設定**：商品作成・Webhook登録・Vercel環境変数
3. **X アカウント開設**：`@shohei_rizup` で登録・初日5投稿
4. **Threads トークン取得**：Meta Developer でApp作成
5. **GAS 自動投稿セットアップ**：15分で完了
6. **CW スカウト① 返信**：48時間ルール

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
| `company/tomorrow-first-actions.md` | **明日朝イチで開く** |
| `app/rizup-app/supabase-v3-rebuild.sql` | DB統合マイグレーション |
| `app/rizup-app/supabase-v3.2-appstore.sql` | App Store対応 追加 |
| `app/rizup-app/supabase-seed-recommendations.sql` | 初期Sho推薦18件 |
| `app/rizup-app/ENV_CHECKLIST.md` | Vercel環境変数11項目 |
| `app/rizup-app/APP_STORE_GUIDE.md` | Capacitorラップ手順 |
| `app-store/` | App Store申請4点セット |
| `consulting/crowdworks-send-ready.md` | **CW送信準備完了版** |
| `marketing/x-profile.md` | X投稿ストック56本 |
| `marketing/x-twitter-ready.md` | **X開設&初日投稿準備** |
| `social-automation/` | Threads/X自動投稿 |
| `social-automation/gas/setup-auto.md` | **GAS 15分セットアップ** |
| `social-automation/threads-setup-guide.md` | Threadsトークン取得 |
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

*最終更新：2026-04-13 夜 / Rizup v3.2 / 児玉翔平*
