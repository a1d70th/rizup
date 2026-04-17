# Supabase マイグレーション実行手順（v6.8）

## 今すぐ実行してほしい SQL

以下を **Supabase Dashboard → SQL Editor** に貼って **Run**。
冪等なので複数回実行しても安全。

```sql
-- profiles カラム追加（400 エラー対策）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_animal text DEFAULT 'rabbit';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS character_name   text    DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak           integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin         boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan             text    DEFAULT 'free';

-- RLS 有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィール読み取り
DROP POLICY IF EXISTS "users can read own profile" ON profiles;
CREATE POLICY "users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

-- 自分のプロフィール更新
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 村メンバー読み取り（MVP: 全員可）
DROP POLICY IF EXISTS "authenticated can read peers" ON profiles;
CREATE POLICY "authenticated can read peers"
  ON profiles FOR SELECT TO authenticated USING (true);
```

## 実行手順

1. https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new を開く
2. 上の SQL ブロックを丸ごと貼り付け
3. 右上の **Run** ボタン（またはCtrl+Enter）を押す
4. 右下に `Success. No rows returned` と出れば完了

## 実行後の確認

Table Editor → profiles で以下のカラムが存在することを確認:

- `character_animal` (text, default 'rabbit')
- `character_name` (text, default '')
- `streak` (integer, default 0)
- `is_admin` (boolean, default false)
- `plan` (text, default 'free')

Authentication → Policies → profiles に 3 ポリシーが並んでいることを確認。

## これで何が直る

- `profiles?select=streak,is_admin,character_animal,character_name` の **400 エラー解消**
- ホーム画面が読み込まれない問題が解消
- キャラ選択・streak 更新・Pro プラン判定すべて正常動作

## 関連ファイル

- 同内容の SQL: `supabase/migrations/20260417_fix_profiles.sql`
- より包括的な移行: `supabase-v6-safe.sql`
