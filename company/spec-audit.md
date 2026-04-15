# Rizup 現状棚卸し（2026-04-15）

> 作成：Sora（CTO）
> 対象コミット：main/HEAD（v4.3.1 post-PHASE）

---

## 現在ある全ページ（19）

| # | パス | 主機能 | 状態 |
|---|---|---|---|
| 1 | `/` | LP（ランディング） | 維持 |
| 2 | `/login` | ログイン | 維持 |
| 3 | `/register` | 登録 | 維持 |
| 4 | `/onboarding` | 3stepオンボ | 維持 |
| 5 | `/home` | タイムライン＋ステータスバー | 維持（簡素化済） |
| 6 | `/journal` | 朝夜ジャーナル | 維持 |
| 7 | `/vision` | ビジョン4階層＋アンチタブ | 維持 |
| 8 | `/habits` | 習慣トラッカー | 維持 |
| 9 | `/growth` | 成長グラフ | 維持 |
| 10 | `/profile` | プロフィール＋投稿履歴 | 維持 |
| 11 | `/settings` | 設定（テーマ・プラン） | 維持 |
| 12 | `/notifications` | お知らせ一覧 | 維持 |
| 13 | `/anti-vision` | アンチビジョン単独 | **統合検討**（/vision のタブに統合済） |
| 14 | `/recommend` | おすすめ（投稿機能付） | **削除候補** |
| 15 | `/premium` | 課金ページ | 維持 |
| 16 | `/admin` | 管理者ダッシュボード | 維持 |
| 17 | `/admin/users` | ユーザー管理 | 維持 |
| 18 | `/admin/posts` | 投稿管理 | 維持 |
| 19 | `/user/[id]` | 他ユーザープロフィール | 維持 |

## コンポーネント（13）

| ファイル | 用途 | 状態 |
|---|---|---|
| `BottomNav` | 下部5タブ | 維持 |
| `Header` | 上部ロゴ＋🔔 | 維持 |
| `PostCard` | フィードカード | 維持 |
| `Loading` / `Skeleton` | ローディング | 維持 |
| `Toast` | 通知 | 維持 |
| `ErrorBoundary` | エラー境界 | 維持 |
| `CountUp` | 数字アニメ | 維持 |
| `EmptyState` | 空状態 | 維持 |
| `PlanGate` | 有料ゲート | 維持 |
| `InstallBanner` | PWA 追加誘導 | 維持 |
| `PushOptIn` | 通知許可 | 維持 |
| `Confetti` | 紙吹雪 | **削除**（使用箇所ゼロ） |

## API ルート（13）

| パス | 用途 | 状態 |
|---|---|---|
| `/api/moderate` | モデレーション | 維持 |
| `/api/analyze/score` | ポジティブ度 | 維持 |
| `/api/analyze/words` | 頻出語 | 維持 |
| `/api/check-progress` | streak計算 | 維持 |
| `/api/cron/morning-notification` | 朝通知 | 維持 |
| `/api/push/subscribe` | Push購読 | 維持 |
| `/api/stripe/checkout` | 決済 | 維持 |
| `/api/stripe/webhook` | Webhook | 維持 |
| `/api/report/weekly` | 週PDF | 維持 |
| `/api/report/monthly` | 月PDF | 維持 |
| `/api/vision-feedback` | AIアドバイス | 維持 |
| `/api/anti-vision/generate` | AI自動生成 | 維持（v4.3追加） |
| `/api/sho-insight` | 追加インサイト | **利用箇所不明→削除候補** |
| `/api/warn` | モデ警告 | 維持 |

---

## 削除すべき機能（根拠付き）

| 項目 | 削除理由 |
|---|---|
| `/today` ページ | 朝ジャーナル「今日の目標」と重複（v4.3で既に削除済） |
| タイムライン4タブ | X/Threads に倣い1本フィード化（v4.3で既に削除済） |
| アンチビジョン手動追加 | 自動生成で十分（v4.3で既に削除済） |
| `Confetti` コンポーネント | 使用箇所ゼロ。コード肥大の元 |
| ステータスバーの ToDo 表示 | 朝ジャーナル内で完結（v4.3で既に削除済） |
| `/recommend` ページ全体 | 毎日のコアループに乗らない。将来 v5 で復活 |
| `/api/sho-insight` | フロントから呼ばれていない |
| `/anti-vision` 単独ページ | `/vision` の "anti" タブに統合済のため不要（重複維持） |

## 残すべきコア機能（確定）

1. 朝夜ジャーナル（今日の目標＋振り返り）
2. 習慣トラッカー
3. ビジョン設定（アンチはタブ内・自動生成）
4. タイムライン（みんなの今日・1本フィード）
5. 成長グラフ（複利曲線）
6. プロフィール／設定／通知／管理

---

## BottomNav 最終決定（5タブで継続）
🏠 ホーム / 📝 ジャーナル / 🎯 ビジョン / 📈 成長 / 👤 マイページ

---

*Sora / Rizup CTO / 2026-04-15*
