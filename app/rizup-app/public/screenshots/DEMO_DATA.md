# App Store スクリーンショット用デモデータ

> 作成：2026-04-13 / Sora（CTO）
> 目的：App Store 申請時のスクリーンショット撮影で見栄えのする画面を作る

---

## 📸 必要なスクリーンショット（最低5枚）

| # | 画面 | 目的 |
|---|---|---|
| 1 | ホーム（今日のダッシュボード） | アプリの核心を一目で見せる |
| 2 | 朝ジャーナル | 使い方の起点 |
| 3 | 複利グラフ | 独自機能・差別化ポイント |
| 4 | ビジョン（4階層） | 逆算設計の魅力 |
| 5 | 夜の複利スコア | 数字でフィードバック |

---

## 🎭 デモ用ユーザー：児玉翔平

**Supabase SQL Editor で1回だけ実行してデモ状態を作る：**

```sql
-- ⚠️ 本番環境では実行しないこと。ステージング or デモ用プロジェクトのみ
-- 事前に auth.users にデモユーザー shohei-demo@example.com を作成しておく

-- ユーザーID を取得（前提：事前登録済）
DO $$
DECLARE demo_id UUID;
BEGIN
  SELECT id INTO demo_id FROM auth.users WHERE email = 'shohei-demo@example.com';
  IF demo_id IS NULL THEN RAISE EXCEPTION 'Demo user not found'; END IF;

  -- プロフィール
  INSERT INTO profiles (id, email, name, dream, avatar_url, streak, plan, zodiac, rizup_type, mbti, onboarding_completed, trial_started_at, trial_ends_at)
  VALUES (demo_id, 'shohei-demo@example.com', '翔平', '昨日より今日を1%好きになる', '🌿', 42, 'pro', 'てんびん座', 'Flame', 'ENFP', TRUE, NOW() - INTERVAL '42 days', NOW() + INTERVAL '23 days')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, streak = EXCLUDED.streak, plan = EXCLUDED.plan;

  -- ビジョン 4階層
  INSERT INTO visions (user_id, title, description, category, time_horizon, progress) VALUES
    (demo_id, '活躍できていない人を引き上げる社会を作る', '誰もが前向きになれる場所を', 'growth', 'final', 12),
    (demo_id, 'Rizup を月商500万円のプロダクトに', 'フルリモートチーム5人で運営', 'work', '3year', 28),
    (demo_id, '有料ユーザー500人達成', 'プロダクトの価値を証明', 'work', '1year', 45),
    (demo_id, '月商20万円を達成する', 'クラウドワークス + Rizup合算', 'money', 'monthly', 65);

  -- 習慣 5つ
  INSERT INTO habits (user_id, title, icon) VALUES
    (demo_id, '朝6:30に起きる', '☀️'),
    (demo_id, '朝ジャーナルを書く', '📝'),
    (demo_id, '10分読書', '📚'),
    (demo_id, 'ジム（週3回）', '💪'),
    (demo_id, '21時以降SNSを閉じる', '🌙');

  -- 過去30日分の投稿（朝夜交互、気分は上昇トレンド）
  FOR i IN 0..29 LOOP
    INSERT INTO posts (user_id, type, content, mood, morning_goal, sleep_hours, created_at)
    VALUES (
      demo_id, 'morning',
      CASE (i % 5)
        WHEN 0 THEN '今日は10分だけ集中して読書する。完璧じゃなくていい。'
        WHEN 1 THEN '朝からちょっと不安。でも、1つだけ動こう。'
        WHEN 2 THEN '昨日良く寝れた。今日は提案文を3本書く。'
        WHEN 3 THEN 'Rizupの新機能を1つリリースする。小さくていい。'
        ELSE '今日は休むことも大事。午前だけ集中しよう。'
      END,
      3 + (i % 3),  -- 3,4,5,3,4,5...
      CASE WHEN i % 5 = 2 THEN 'Rizup改善に2時間' ELSE '提案文1本送る' END,
      6.5 + (random() * 2),
      NOW() - INTERVAL '1 hour' * (30 - i) * 24
    );

    IF i % 2 = 0 THEN
      INSERT INTO posts (user_id, type, content, mood, goal_achieved, gratitudes, bedtime, compound_score_today, created_at)
      VALUES (
        demo_id, 'evening',
        '今日できたこと：朝ジャーナル／読書10分／ジム。できなかったこと：ToDoの3つ目。明日も続ける。',
        3 + (i % 3),
        CASE (i % 3) WHEN 0 THEN 'yes' WHEN 1 THEN 'partial' ELSE 'no' END,
        ARRAY['朝の空気が気持ちよかった', '妹が応援してくれた', '少しでも動けた自分'],
        '23:00'::time,
        60 + (i % 30),
        NOW() - INTERVAL '1 hour' * (30 - i) * 24 + INTERVAL '12 hours'
      );
    END IF;
  END LOOP;

  -- 今日のToDo 3つ
  INSERT INTO todos (user_id, title, is_done, due_date) VALUES
    (demo_id, 'クラウドワークス提案を3件送る', TRUE, CURRENT_DATE),
    (demo_id, 'Rizupの複利グラフを微調整', TRUE, CURRENT_DATE),
    (demo_id, 'X 朝の投稿を送信', FALSE, CURRENT_DATE);

  -- アンチビジョン
  INSERT INTO anti_visions (user_id, content) VALUES
    (demo_id, '言い訳ばかりして動けない35歳'),
    (demo_id, '自分の可能性を信じられないまま歳を取る');

END $$;
```

---

## 📱 スクリーンショット撮影フロー

### 1. ブラウザでログイン
`https://rizup-app.vercel.app/login` → `shohei-demo@example.com`

### 2. 各画面を開いてスクリーンショット
iPhone Safari の場合、共有ボタン → スクリーンショット

### 3. 推奨 Mock 画像比率

iPhone 15 Pro Max で撮影 → 1290×2796 にリサイズ。
Figma / Canva で以下のようなフレームに入れる：

```
┌─────────────────────────┐
│  毎日1%の複利成長        │ ← キャッチ
├─────────────────────────┤
│                         │
│     [実機スクショ]       │
│                         │
├─────────────────────────┤
│  Rizup | 無料で始める    │ ← CTA
└─────────────────────────┘
```

### 4. キャッチコピー例（スクショごと）

1. ホーム：**「今日やることが、一目で見える」**
2. 朝ジャーナル：**「5分で今日が動き出す」**
3. 複利グラフ：**「見えない1%を、グラフで見る」**
4. ビジョン：**「夢から逆算、今日の一歩まで」**
5. 夜スコア：**「毎日の複利を、数字で実感」**

---

## 🎨 デザイン要件（Apple ガイドライン準拠）

- 画像内に **「App Store」「iPhone」** の記載禁止
- **実機フレーム** を使う場合は Apple 公式 Marketing Resources を使用：
  https://developer.apple.com/design/resources/
- **デバイスの傾き・反射** は OK（推奨）
- 文字サイズは **大きく**（視認性重視）
- 背景色：ミント `#6ecbb0` または白 `#fafafa`（紫禁止）

---

*Sora（CTO）/ 2026-04-13 / Rizup*
