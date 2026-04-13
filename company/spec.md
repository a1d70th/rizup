# Rizup アプリ 仕様書 v3（確定版）

> 最終更新：2026-04-13 / Sora（CTO）
> 対象：`app/rizup-app`（Next.js 14 App Router / Supabase / Tailwind / Claude API）

---

## 0. 絶対ゴール

**「これ一本で毎日の内省・自己成長・習慣化が全部できる」アプリ。**

- 引き算の設計。シンプル。美しい。バグゼロ。
- テンプレ的AIデザイン禁止（紫グラデーション・白カード羅列NG）
- カラー：ミントグリーン `#6ecbb0` ＋ ライトオレンジ `#f4976c`
- キャラクター：Sho（丸くてかわいい、不完全で親しみやすい）

---

## 1. 残す機能（これだけ）

| # | 機能 | パス |
|---|---|---|
| 1 | 朝夜ジャーナリング | `/journal` |
| 2 | ビジョンボード（逆算4階層） | `/vision` |
| 3 | アンチビジョン | `/anti-vision` |
| 4 | 習慣トラッカー | `/habits` |
| 5 | 今日のToDo | `/today` |
| 6 | 成長グラフ（睡眠・気分・ポジティブ度の時系列） | `/growth` |
| 7 | タイムライン（仲間の投稿） | `/home` 内 |
| 8 | マイページ | `/profile` |
| 9 | 設定 | `/settings` |
| 10 | 通知 | `/notifications` |
| 11 | 認証・オンボーディング | `/login` `/register` `/onboarding` |
| 12 | 管理画面 | `/admin` |

---

## 2. 削除する機能（全部）

### 2-1. 競争系（ランキング・MVP・バッジ）
- `/api/mvp`（月間MVP自動選出）全削除
- `notifications.type = 'mvp_announcement'` 廃止
- `badges` テーブル・関連UI・付与ロジック全削除
  - `check-progress/route.ts` 内のバッジ付与ブロック
  - `profile/page.tsx` の `badgeMap`・`獲得バッジ` セクション
  - `notifications/page.tsx` の `badge` タイプラベル
- `mvp-spec-final.md` からランキング章を削除（spec.mdを正とする）

### 2-2. VIP tier
- `/vip` ページ削除
- `vip_contents` `vip_consultations` テーブル削除
- `notifications.type = 'vip_message'` 廃止
- `profiles.plan` の enum から `'vip'` を除外（`free|pro|premium`のみ）
- `/admin/content` の VIP タブ削除
- `/admin/notifications` の VIP ブロードキャスト削除
- BottomNav の `/vip` エントリ削除
- settings ページの VIP 行削除
- Stripe VIP price id 参照削除

### 2-3. デッドコード
- `vision_boards` テーブル（未使用）→ DROP
- `lib/demo-data.ts` 削除
- `habits.name` vs コードの `title` 不整合 → コードを `title` に統一、SQLで ALTER
- `mockup.html` 削除（古いモック）

### 2-4. 週間チャレンジ（ToDoとビジョン月次と重複）
- `challenges` テーブル DROP
- `/api/check-progress` の challenge 部分削除
- ホームの「今週のチャレンジ」カード削除

---

## 3. コアデータモデル（逆算の繋がり）

```
vision (最終/3年/1年/今月)
  └─ habits (この目標のための日々の習慣)
        └─ habit_logs (毎日のチェック)
  └─ todos (今週・今月のタスク)
        └─ 朝ジャーナル (今日やる3つを選ぶ)
              └─ 夜ジャーナル (達成判定 → visionの進捗に反映)

anti_visions (絶対に避けたい未来) — 独立。毎朝リマインドに使う
```

### 3-1. 統合マイグレーション SQL（`supabase-v3-rebuild.sql`）

```sql
-- ──────────────────────────────────────
-- 1. 削除（競争系・VIP・デッドコード）
-- ──────────────────────────────────────
DROP TABLE IF EXISTS badges CASCADE;
DROP TABLE IF EXISTS vip_contents CASCADE;
DROP TABLE IF EXISTS vip_consultations CASCADE;
DROP TABLE IF EXISTS vision_boards CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;

DELETE FROM notifications WHERE type IN ('mvp_announcement','vip_message','badge','sho_weekly','unreplied');

-- profiles.plan から 'vip' を除外
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
UPDATE profiles SET plan = 'premium' WHERE plan = 'vip';
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','pro','premium'));

-- ──────────────────────────────────────
-- 2. posts 拡張：朝夜紐付け + 睡眠独立カラム + 感謝独立
-- ──────────────────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS morning_goal TEXT,
  ADD COLUMN IF NOT EXISTS goal_achieved TEXT CHECK (goal_achieved IN ('yes','partial','no')),
  ADD COLUMN IF NOT EXISTS linked_morning_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sleep_hours NUMERIC(3,1),
  ADD COLUMN IF NOT EXISTS bedtime TIME,
  ADD COLUMN IF NOT EXISTS gratitudes TEXT[];

-- 1ユーザー 1日 1タイプ 1投稿
ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_date DATE GENERATED ALWAYS AS ((created_at AT TIME ZONE 'Asia/Tokyo')::date) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS posts_user_date_type_unique ON posts (user_id, posted_date, type);

-- ──────────────────────────────────────
-- 3. habits のカラム名統一（name → title）
-- ──────────────────────────────────────
ALTER TABLE habits RENAME COLUMN name TO title;
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ──────────────────────────────────────
-- 4. ToDo 新設（今日のタスク）
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vision_id UUID REFERENCES visions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_done BOOLEAN DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_todos_user_date ON todos (user_id, due_date);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "todos_own_select" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "todos_own_insert" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "todos_own_update" ON todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "todos_own_delete" ON todos FOR DELETE USING (auth.uid() = user_id);

-- 朝ジャーナル × 今日のToDo 紐付け（朝に選んだToDo＝今日やる3つ）
CREATE TABLE IF NOT EXISTS journal_todos (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, todo_id)
);
ALTER TABLE journal_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal_todos_all" ON journal_todos FOR ALL USING (
  EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.user_id = auth.uid())
);

-- ──────────────────────────────────────
-- 5. アンチビジョン（避けたい未来）
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS anti_visions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE anti_visions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anti_visions_own" ON anti_visions FOR ALL USING (auth.uid() = user_id);
```

---

## 4. 画面仕様

### 4-1. `/home`（ホーム）— "今日やること3つが一瞬で見える"

**上から順に：**

1. **Sho の挨拶バー**（コンパクト・1行）
2. **今日のヒーローカード**
   - 今日のToDo3つ（朝ジャーナルで選んだもの）
   - チェックボックス1タップで完了
   - チェック瞬間に Sho の祝福アニメーション（ぴょん！と跳ねる）
   - 朝ジャーナル未投稿なら「☀️ 朝ジャーナルを書く」1ボタンを表示
3. **今日の習慣サマリー**
   - `3/5 達成` の進捗リングと、未達分のワンタップチェック
4. **タイムライン**（仲間の投稿、新しい順20件）

**非表示化：** トライアル残日数バナー（控えめなチップに縮小）、未コメント催促、週間チャレンジ、連続投稿カードは `/growth` に移設。

### 4-2. `/journal`（朝夜ジャーナリング）

**朝モード（4時〜15時）：**
- 気分5段階
- 昨夜の睡眠時間（数値）→ `posts.sleep_hours`
- 今日の目標（1行）→ `posts.morning_goal`
- 今日やるToDoを3つまで選択 or 新規追加
  - 既存の`todos`（due_date=today）から選ぶ or +新規
  - 選んだら `journal_todos` へ insert、vision_id があれば継承
- 一言（任意）

**夜モード（15時〜翌4時）：**
- 気分5段階
- 今朝の目標を自動表示 →「達成できた？」3択（`yes/partial/no`）
- 朝選んだToDoのチェック状況を自動表示（未完了があればその場でチェック可能）
- 今夜の就寝予定時刻 → `posts.bedtime`
- 感謝3つ（独立カラム `gratitudes`）
- 振り返り本文
- 夜投稿時、朝投稿のIDを `linked_morning_post_id` に自動セット
- 達成したToDoはビジョンの進捗に反映する（後述）

**投稿フロー：**
- `/api/moderate` で本文・ToDo・感謝・振り返りをチェック
- safe → insert → AIフィードバック（`posts.ai_feedback`）
- 自傷系（crisis）→ `よりそいホットライン 0120-279-338` モーダル表示

### 4-3. `/vision`（ビジョンボード）

- 4階層（最終 ⭐ / 3年 🚀 / 1年 🎯 / 今月 ✅）× 6カテゴリ
- 各ビジョンカードから **「この目標のために習慣を追加」「今月のToDoを追加」** ボタン
- タップで `/habits?vision_id=xxx` `/today?vision_id=xxx` に遷移し、作成時に外部キーを継承
- 進捗は **紐付いた ToDo と習慣の達成率の加重平均** で自動算出（手動スライダーは補助）
  - `progress = ROUND( (todos_done/todos_total)*0.6 + (habit_logs_7d/habit_targets_7d)*0.4 * 100 )`

### 4-4. `/anti-vision`（アンチビジョン）新設

- 「5年後、絶対こうなりたくない自分」を書く
- リスト形式（最大5件）
- 毎朝のRizup Insightに「今日の行動がこのアンチビジョンから遠ざける一歩になる」と絡める

### 4-5. `/habits`（習慣トラッカー）

- 最大5つ → **最大10個まで拡張**
- 新規作成時にビジョンを選択（任意）
- チェック時にRizupジャンプアニメ＋streak更新
- `habits.streak` の更新ロジックを実装（連続日数を habit_logs から算出）

### 4-6. `/today`（今日のToDo）新設

- 今日のToDo3つ（朝選んだ／後追加分含む）
- + ボタンで追加（ビジョン選択付き）
- 完了トグル → Rizupアニメ
- 未完了は翌日 `due_date = tomorrow` に持ち越すボタン

### 4-7. `/growth`（成長グラフ）新設 — 旧 profile の一部を統合

- 気分の推移（30日／90日／全期間）折れ線
- 睡眠時間の推移（`posts.sleep_hours` 直接使用）折れ線
- ポジティブ度（`posts.positivity_score`）折れ線
- 3系列を重ねられる
- 連続投稿（streak）と総投稿数
- 月次PDF（Premium）ダウンロードボタン

### 4-8. `/profile`

- アイコン・名前・夢・Rizupタイプ・MBTI
- バッジ表示削除
- 統計：投稿数 / 連続日数 / 仲間から受けた応援数
- 投稿履歴
- 成長グラフへのリンク

### 4-9. `/recommend`

- カテゴリを **自己実現軸6つ**に削減：本・言葉・習慣・目標達成法・今日の幸せ・モチベ
- グルメ/カフェ/旅/絶景/映画/音楽/YouTube/アプリ/勉強法/体験 は DB 上は残すが UI から非表示に（段階的移行）

---

## 5. プラン制御（`lib/plan.ts` 本実装）

```ts
export function isTrialActive(p) {
  if (!p?.trial_ends_at) return false;
  return new Date(p.trial_ends_at).getTime() > Date.now();
}
export function isProOrAbove(p) {
  if (isTrialActive(p)) return true;
  return ['pro','premium'].includes(p?.plan ?? 'free');
}
export function isPremium(p) {
  return p?.plan === 'premium';
}
```

- 無料：朝夜ジャーナル（本文のみ）・タイムライン閲覧・リアクション・ToDo・習慣（3つまで）・ビジョン（3つまで）
- Pro（¥780/月）：AIフィードバック・Rizup Insight・成長グラフ全指標・習慣/ビジョン無制限・アンチビジョン・ポジティブ度分析
- Premium（¥1,480/月）：Proの全機能＋月次/週次PDFレポート

---

## 6. UI/UX 原則（絶対遵守）

1. **ホームを開いた瞬間に今日やること3つが見える**
2. **1タップで記録できる**（チェックボックス・toggle・slider）
3. **チェックした瞬間にRizupが喜ぶアニメーション**（`animate-sho-bounce`）
4. **紫・グレー羅列 NG**。ミント＋オレンジの配色を徹底
5. **空状態 (empty state)** には必ずShoと一言メッセージ
6. **エラー時** には必ず赤ではなく温かいトーンで Sho の吹き出し

---

## 7. 作業順序（自動実行ループ）

1. 不要機能の全削除（`/vip`ページ・`api/mvp`・バッジUI・challenges・vision_boards）
2. DB統合マイグレーション `supabase-v3-rebuild.sql` 作成
3. posts を独立カラムに移行、journal/page.tsx を書き直し
4. `/today` 新設、`/anti-vision` 新設、`/growth` 新設
5. `/home` 刷新：今日やること3つヒーローカード
6. ビジョン→習慣→ToDoの逆算導線を繋ぐ
7. `lib/plan.ts` を本実装に差し替え、PlanGate を該当画面に適用
8. qa-reviewer でレビュー→不合格なら修正→再レビュー
9. git commit + push

---

*spec v3 確定*
