# Rizup App — Supabase セットアップ手順

## 1. Supabase プロジェクト作成

1. `https://supabase.com` にアクセスしてログイン
2. 「New project」をクリック
3. 以下を入力：
   - Organization：自分のorg
   - Name：`rizup`
   - Database Password：強力なパスワードを設定（メモしておく）
   - Region：`Northeast Asia (Tokyo)`
4. 「Create new project」をクリック

## 2. DB テーブルを作成

1. Supabase ダッシュボード → 左メニューの **「SQL Editor」** をクリック
2. 「New query」をクリック
3. `supabase-schema.sql` の内容を全てコピーして貼り付け
4. **「Run」** をクリック
5. 全テーブルが作成されたことを確認（Table Editor で確認可能）

## 3. 環境変数を取得

1. Supabase ダッシュボード → **「Settings」** → **「API」**
2. 以下の2つをコピー：
   - **Project URL**（`https://xxxxx.supabase.co`）
   - **anon public key**（`eyJhbGci...` で始まる長い文字列）

## 4. ローカル開発の場合

`app/rizup-app/.env.local` を作成：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

## 5. Vercel デプロイの場合

1. Vercel ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. 以下を追加：

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |

3. **Redeploy** をクリック

## 6. Google 認証を有効化（任意）

1. Supabase ダッシュボード → **Authentication** → **Providers**
2. **Google** を有効化
3. Google Cloud Console で OAuth 2.0 クライアント ID を作成
4. Client ID と Secret を Supabase に入力
5. Redirect URL：`https://xxxxx.supabase.co/auth/v1/callback`

## 7. 動作確認

1. アプリにアクセス → 新規登録
2. メール確認 → オンボーディング → ホーム画面
3. ジャーナリング投稿 → タイムラインに表示されることを確認
