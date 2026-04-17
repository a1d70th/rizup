# Rizup テストデータ投入手順

## 1. 投入する user_id を用意する

Supabase Dashboard → Table Editor → **profiles** で投稿を紐付けたいユーザーを開き、
`id` カラム（UUID）をコピー。

既存ユーザーがいなければ claude.ai 風に test@test.com 等で `/register` から1アカウント作って
プロフィールができるのを確認してから、その `id` を使う。

## 2. seed-posts.sql を実行

1. https://supabase.com/dashboard/project/pcysqlvvqqfborgymabl/sql/new を開く
2. `app/rizup-app/supabase/seed-posts.sql` を開いて全文コピー
3. 冒頭の `\set seed_user_id '00000000-...'` の UUID を **手順1でコピーした id** に書き換える
4. SQL Editor に貼って **Run**（または Ctrl+Enter）
5. 右下に `INSERT 0 8` と出れば成功
6. 最後の `SELECT` で 8 行のプレビューが出るはず

## 3. アプリで確認

https://rizup-app.vercel.app/home をリロード。
タイムラインに 8 件の投稿（朝4/夜4）が並ぶ。

## 4. 片付け（投稿を削除したい）

```sql
DELETE FROM posts
WHERE user_id = 'コピーした UUID'
  AND content LIKE '朝6時に起きて散歩30分%';
-- 以下 8 件分を適宜
```

または全削除（そのユーザーの投稿すべて）:

```sql
DELETE FROM posts WHERE user_id = 'コピーした UUID';
```

## 備考

- `type` は `'morning'` または `'evening'`
- `mood` は 1〜5（4 ≒ いい感じ / 2 ≒ しんどい）
- `created_at` は `now() - interval 'X hours'` で相対指定
- `ai_feedback` / `morning_goal` は NULL で OK（v7.3 で UI 側から非表示化済み）
