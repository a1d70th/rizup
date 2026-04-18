# HARU — 日韓友達作りイベント

> **Lueur Inc.** 事業② の LP。日本人と韓国人が「ただ飲む」だけのイベントコミュニティ。
> 大阪発・月 1〜2 回開催予定。

---

## 🚀 デプロイ方法

1. **Vercel** にこのフォルダ（`haru/`）をプロジェクトとしてインポート
   - Framework Preset: **Other**（静的 HTML なので）
   - Root Directory: `haru`
   - Build Command: 空 / Output Directory: `.` / Install Command: 空
2. **ドメイン**: `haru-osaka.vercel.app`（予定）
3. デプロイ後は `vercel.json` の rewrites により SPA ライクに `/` 配下で動作

### ローカル確認

```bash
# Python でサクッと確認（推奨）
python -m http.server 8080
# → http://localhost:8080 を開く

# または npx serve
npx serve .
```

---

## 🌐 言語切り替え

ページは **日本語 / 韓国語** 両対応。右上のトグルで切替可能。

### 初期言語の判定ロジック（優先度順）

1. **URL パラメータ** `?lang=ja` or `?lang=ko`
2. **localStorage** `haru_lang` の保存値（前回訪問時の選択）
3. **ブラウザ言語** `navigator.language`（`ko-*` → 韓国語 / 他 → 日本語）
4. **フォールバック**: 日本語

### URL 例

| URL | 挙動 |
|---|---|
| `haru-osaka.vercel.app/` | ブラウザ言語で自動判定 |
| `haru-osaka.vercel.app/?lang=ja` | 日本語固定 |
| `haru-osaka.vercel.app/?lang=ko` | 韓国語固定 |

切替ボタン操作で URL に `?lang=xx` が付与され、シェア時に言語設定が保たれる。

---

## 📁 ファイル構成

```
haru/
├── index.html       ← LP 本体（約 450 行 / CSS + JS 全部込み）
├── logo.svg         ← HARU ロゴ（桜 + "HARU" + "하루"）
├── vercel.json      ← SPA リライト設定
└── README.md        ← この文書
```

**Next.js 不要・React 不要・ビルド不要**。シンプルな静的サイト。

---

## 🎨 デザイン仕様

- **メインカラー**: 桜ピンク `#FFB7C5` × 韓国の青緑 `#4ECDC4`
- **強調色**: `#FF6B9D`（CTA ボタン / 見出しグラデ）
- **フォント**: Noto Sans JP + Noto Sans KR + Space Mono
- **モバイルファースト**・480px 以下でパディング調整

---

## 📣 SNS 連携

- **Threads**: [@mushoku_owata](https://www.threads.net/@mushoku_owata)（運営者アカウント）
- **Instagram**: `@haru_osaka`（**準備中** → アカウント開設次第リンク有効化）

---

## 🛠 次のステップ

### LP まわり
- [ ] Vercel にデプロイして URL 確定
- [ ] OG 画像を生成して `/og-image.png` 配置（Twitter / Threads シェア時の画像）
- [ ] Google Analytics 設置（翔平さん既存プロパティに追加）
- [ ] FAQ セクション追加（「1 人で参加できる？」等）
- [ ] イベント日程が決まり次第 EVENT セクションを更新

### 集客・運用
- [ ] **Instagram アカウント `@haru_osaka` 作成**
- [ ] **こくちーず** に初回イベント掲載
- [ ] **韓国人の友達に女性を 2〜3 人紹介してもらう**（Phase 1 開始条件）
- [ ] スレッズ `@mushoku_owata` で HARU 始動告知
- [ ] HARU LP の URL を Rizup アプリ `/events` ページから導線追加

### Phase 1 開始条件（詳細は `company/new-business/HARU/TEAM_REVIEW.md`）
- ✅ LP 公開（今回）
- ⏳ 女性共同ホスト 1 人の内諾
- ⏳ 商標調査（J-PlatPat で HARU × 飲食・イベント）
- ⏳ Rizup 本業の Supabase migration + `SUPABASE_SERVICE_ROLE_KEY` 完了（本業優先）

---

## 📚 関連ドキュメント

内部運営資料は `company/new-business/HARU/` 配下:

- `STRATEGY.md` — ゼロ集客 4 STEP 戦略 + マネタイズ試算
- `TEAM_REVIEW.md` — 6 社員 レビュー結果（🟡 修正後 GO）
- `EVENT_COPY.md` — 告知コピー 日/韓バイリンガル
- `INSTAGRAM_STRATEGY.md` — `@haru_osaka` 運用設計
- `LP_DRAFT.md` — この LP の設計書（原案）

---

## 📄 ライセンス / 著作権

© 2026 Lueur Inc. HARU is a service by Lueur Inc.
