# Rizup App Store 申請ガイド

> 作成：2026-04-13 / Sora（CTO）
> 対象：rizup-app.vercel.app（Next.js + Supabase PWA）を iOS App Store / Google Play に出す手順

---

## ⚠️ 大前提：PWA単体ではApp Storeに出せない

Apple App Store は **ネイティブアプリ or WKWebView ラップ** のみ受け付けます。
Google Play も 同様に APK/AAB が必要です。

選択肢は以下の3つ。**推奨は「Capacitor でラップ」** です。

| 方式 | iOS | Android | 工数 | コスト |
|---|---|---|---|---|
| **Capacitor（推奨）** | ✅ | ✅ | 1〜2日 | Apple $99/年 + Google $25 |
| PWABuilder | ✅ | ✅ | 半日 | 同上 |
| ネイティブ再実装 | ✅ | ✅ | 1〜3ヶ月 | 同上 |

---

## 🎯 Capacitor ラップ手順（本命・推奨）

### Step 1：Capacitor プロジェクト作成

```bash
cd C:\Users\81806\Desktop\rizup\app\rizup-app
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init Rizup app.rizup.app --web-dir=out
```

`next.config.mjs` に静的出力を追加：
```js
const nextConfig = {
  output: "export",
  images: { unoptimized: true },
};
```

### Step 2：ネイティブ設定（capacitor.config.ts）

```ts
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "app.rizup.app",
  appName: "Rizup",
  webDir: "out",
  server: {
    // 本番はVercelへリダイレクト（PWAラッパー構成）
    url: "https://rizup-app.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#fafafa",
  },
  android: {
    backgroundColor: "#fafafa",
    allowMixedContent: false,
  },
};
export default config;
```

### Step 3：ビルド → ネイティブプロジェクト生成

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

### Step 4：iOS 申請

**前提**：Apple Developer Program 登録済み（$99/年）・Mac 実機

```bash
npx cap open ios
```

Xcode が開く。以下を設定：

1. **Signing & Capabilities** → Team を自分のApple IDに
2. **Bundle Identifier**：`app.rizup.app`
3. **Version**：1.0.0、**Build**：1
4. **Icons**：`App Icon` に Sho画像（1024x1024px）をセット
5. **Launch Screen**：`LaunchScreen.storyboard` にミント背景 + Sho配置
6. **Capabilities**：Push Notifications / Background Modes（Remote notifications）をON

Archive → Distribute App → App Store Connect → Upload

App Store Connect で：
- カテゴリ：Health & Fitness または Productivity
- 年齢区分：4+（コミュニティ機能があるため12+推奨）
- プライバシーポリシー URL：`https://rizup-app.vercel.app/legal/privacy-policy.html`
- サポート URL：`https://rizup-app.vercel.app/settings`（問い合わせ導線あり）
- スクリーンショット：iPhone 6.7" / 6.5" / 5.5" 各3枚必須
- レビュー用アカウント：テスト用メール+パスワードを提供

### Step 5：Android 申請

**前提**：Google Play Console 登録済み（$25・一回払）

```bash
npx cap open android
```

Android Studio が開く：

1. **applicationId**：`app.rizup.app`
2. **versionCode**：1、**versionName**："1.0.0"
3. **ic_launcher**：Sho（maskable対応で512x512推奨）
4. Build → Generate Signed Bundle → AAB（Android App Bundle）
5. Google Play Console → アプリを作成 → Production トラック → AAB をアップロード
6. コンテンツレーティング：13+（ユーザー生成コンテンツあり）
7. データ セーフティ：収集データを正直に申告（email / 投稿内容 / 使用状況）

---

## 📋 App Store 審査通過チェックリスト（iOS基準）

### 必須（Apple Review Guidelines）

- [ ] **2.1 App Completeness**：placeholder/"Coming soon" 表示なし → ✅ 全画面動作確認済
- [ ] **2.3 Accurate Metadata**：スクリーンショットが実機と一致 → 撮影時に注意
- [ ] **4.2 Minimum Functionality**：PWA+α の独自価値（複利エフェクト・アンチビジョン）がある → ✅
- [ ] **5.1 Privacy**：プライバシーポリシー提示 → ✅ `/legal/privacy-policy.html`
- [ ] **5.1.1(v) Data Collection**：App Privacy Label 正確に設定
- [ ] **1.2 User-Generated Content**：通報機能 + ブロック機能 + 有害コンテンツ削除機能 → ✅ （通報・警告カウント・即時非表示）
- [ ] **5.6.1 Developer Code of Conduct**：コミュニティ運営ルール明示 → ✅
- [ ] **2.5.16 App Tracking**：広告ID追跡なし → ✅ トラッカーなし

### 推奨

- [ ] 年齢制限 13+ 明示 → ✅ オンボで確認チェックボックス
- [ ] オフライン時の表示 → ✅ `/offline.html` 実装済
- [ ] アクセシビリティ：VoiceOver 対応（`aria-label`）→ ✅ 主要コンポーネント対応済
- [ ] 暗いモード：ダークモード対応 → ✅ `prefers-color-scheme` 追従
- [ ] スプラッシュスクリーン → Xcode の LaunchScreen.storyboard で設定

---

## 🏪 App Store 用コンテンツ準備リスト

### テキスト素材

| 項目 | 内容 | 文字数 |
|---|---|---|
| App Name | Rizup | 30字以内 |
| Subtitle | 毎日1%の複利成長アプリ | 30字以内 |
| Promotional Text | 毎日1%の積み重ねが1年で37倍に。朝夜ジャーナル×ビジョン×習慣で複利成長を可視化 | 170字以内 |
| Description | （別途1000字程度で準備） | 4000字以内 |
| Keywords | 習慣,ジャーナル,日記,目標,複利,成長,自己啓発,セルフケア,マインドフルネス | 100字 |
| What's New | 初回リリース。朝夜ジャーナル・ビジョンボード・アンチビジョン・今日のToDo・成長グラフを搭載 | 4000字 |

### 画像素材

| 項目 | サイズ | 必要数 |
|---|---|---|
| App Icon | 1024×1024px（角丸なし・透過なし） | 1 |
| iPhone 6.7" Screenshot | 1290×2796px | 3〜10枚 |
| iPhone 6.5" Screenshot | 1284×2778px | 3〜10枚 |
| iPhone 5.5" Screenshot | 1242×2208px | 3〜10枚 |
| iPad Pro 12.9" | 2048×2732px | Optional |
| App Preview Video | 15〜30秒 | Optional |

### スクリーンショット撮影ポイント

1. **ホーム**：今日のToDo3つ + 複利カード（🔥連続日数）
2. **朝ジャーナル**：気分入力 + 睡眠時間
3. **ビジョン**：4階層の逆算ビジョン
4. **成長グラフ**：複利曲線（理想 vs 実績）
5. **夜ジャーナル**：複利スコア表示

---

## 🔐 プライバシー マニフェスト（iOS 17+必須）

**`PrivacyInfo.xcprivacy`** を Xcode プロジェクトに追加：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key><false/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
  </array>
</dict>
</plist>
```

---

## 📅 申請スケジュール目安

| タスク | 所要 |
|---|---|
| Apple Developer 登録・本人確認 | 1〜3日 |
| Capacitor プロジェクト作成・ビルド | 1日 |
| スクリーンショット撮影・編集 | 半日 |
| App Store Connect 登録 | 半日 |
| Apple 審査 | 通常 1〜3日（初回は長め） |
| **合計** | 約 1週間 |

---

## 🚨 よくあるリジェクト理由

1. **「ただのWebView」扱い** → 独自の機能価値（複利計算・アンチビジョンなど）を説明文で強調
2. **プライバシーポリシー欠落** → すでに `/legal/privacy-policy.html` で対応済
3. **ユーザー生成コンテンツに通報機能なし** → すでに実装済
4. **スプラッシュ画面が白紙** → Xcode で LaunchScreen 設定必須
5. **アイコンに透過** → Sho の背景に白かミントの単色を敷く

---

*Sora（CTO）/ 2026-04-13 / Rizup v3.2*
