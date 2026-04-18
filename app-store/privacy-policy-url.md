# App Store 申請に必要な URL 一覧

> 作成：2026-04-13 / Haru（秘書）
> 対象：iOS App Store Connect / Google Play Console

---

## ✅ 必須 URL（申請時に必要）

| # | 項目 | URL | 状態 |
|---|---|---|---|
| 1 | **Privacy Policy URL**（プライバシーポリシー） | `https://rizup-app.vercel.app/legal/privacy-policy.html` | ✅ 公開済 |
| 2 | **Terms of Service URL**（利用規約） | `https://rizup-app.vercel.app/legal/terms-of-service.html` | ✅ 公開済 |
| 3 | **Support URL**（サポート窓口） | `https://rizup-app.vercel.app/settings` | ✅ 公開済（お問い合わせメール導線あり） |
| 4 | **Marketing URL**（公式サイト・任意） | `https://rizup-app.vercel.app` | ✅ 公開済 |
| 5 | **特定商取引法に基づく表記** | `https://rizup-app.vercel.app/legal/tokushoho.html` | ✅ 公開済（日本での課金には必須） |
| 6 | **Contact Email**（開発者連絡先） | `a1d.70th@gmail.com` | ✅ |
| 7 | **Copyright Holder**（著作権表示） | `Lueur Inc.` | ✅ |

---

## 📋 App Store Connect 入力チェックリスト

### General Information
- [ ] Bundle ID：`app.rizup.app`（Capacitor ラップ後）
- [ ] Name（Localized）：日本語 `Rizup - 毎日1%の複利成長` / 英語 `Rizup - 1% Daily Growth`
- [ ] Primary Language：日本語
- [ ] Categories：Primary `Health & Fitness`、Secondary `Productivity`

### App Privacy
- [ ] Privacy Policy URL：上記 #1
- [ ] Data Collection（以下を正確に申告）：
  - **Email Addresses**: Collected, Linked to user, Not used for tracking, App Functionality
  - **User Content**: Collected (journal posts, comments), Linked to user, Not for tracking, App Functionality
  - **Identifiers (User ID)**: Collected, Linked to user, Not for tracking, App Functionality / Analytics
  - **Usage Data (Product Interaction)**: Collected, Linked to user, Not for tracking, Analytics / Product Improvement

### Pricing and Availability
- [ ] Price Schedule：Free（主体）＋ In-App Purchase
- [ ] Availability：全世界（Jaapan先行ならJapanのみ）

### App Review Information
- [ ] Contact First/Last Name：Shohei / Kodama
- [ ] Contact Phone：（iOSでは必須）
- [ ] Contact Email：`a1d.70th@gmail.com`
- [ ] Demo Account：`shohei-demo@example.com` + 仮パスワード
- [ ] Notes for Reviewer：以下推奨記述

### App Reviewer 向け Notes（サンプル）

```
Thank you for reviewing Rizup.

OVERVIEW
Rizup is a self-growth app inspired by Darren Hardy's "The Compound Effect."
It helps users visualize 1% daily progress through journaling, vision planning,
and habit tracking. All content is user-generated with AI-powered moderation.

DEMO ACCOUNT
Email: shohei-demo@example.com
Password: [provided separately]
The demo account has 30 days of sample posts, 4 visions, 5 habits, and today's ToDos
pre-populated for comprehensive testing.

KEY FEATURES TO TEST
1. Onboarding: 3 steps (name → dream → start) — skippable on step 2
2. Home: Dashboard with 4 metrics + time-based Sho greeting
3. Morning/Evening journal: Posts save to Supabase with AI moderation
4. Vision/Anti-vision: 4-tier goal decomposition + negative vision
5. Growth graph: Ideal vs actual compound curve (SVG)
6. Compound score: Automatic calculation (ToDo × habit × mood)

USER-GENERATED CONTENT SAFEGUARDS
- Claude API moderation before every post
- Crisis detection (self-harm/suicide) shows mental health helplines
- User reporting + 3-strikes auto-suspension
- Age-gated (13+) in onboarding

IN-APP PURCHASES
- Pro: ¥780/month (StoreKit / Stripe via WebView)
- Premium: ¥1,480/month
- 7-day free trial
```

---

## 🏢 Google Play Console 入力チェックリスト

### Store Listing
- [ ] App Name（80字以内）：`Rizup - 毎日1%の複利成長`
- [ ] Short Description（80字以内）：`朝夜ジャーナル・ビジョン・習慣で複利成長を可視化する自己成長アプリ`
- [ ] Full Description：`app-store-description.md` の日本語版を流用
- [ ] Graphics：
  - [ ] App Icon（512×512 PNG）
  - [ ] Feature Graphic（1024×500 PNG）
  - [ ] Phone Screenshots（最低2枚、推奨8枚）

### Privacy & Safety
- [ ] Privacy Policy：上記 #1
- [ ] Data Safety：Google の「Data safety form」を自己申告
  - Personal info：Email（Account management）
  - App activity：Page views and taps（Analytics）
  - User-generated content：Text posts（App functionality, Communication）

### Content Rating
- [ ] IARC Questionnaire を完走
  - UGC: Yes, moderated
  - Sensitive topics: Mental health mentioned, crisis resources provided
  - Violence/sexual content: None
  - → **Teen (13+)** 相当

---

## 🔒 プライバシーマニフェスト（iOS 17+ 必須）

プロジェクトに `PrivacyInfo.xcprivacy` を追加：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyTracking</key><false/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeOtherUserContent</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
      </array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key>
      <string>NSPrivacyCollectedDataTypeUserID</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array>
        <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
        <string>NSPrivacyCollectedDataTypePurposeAnalytics</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
  </array>
</dict>
</plist>
```

Capacitor プロジェクトの iOS フォルダ直下に配置。

---

## 🗣 多言語化（将来）

現時点は日本語のみ申請。英語展開時に以下を追加：

- 英語版プライバシーポリシー URL
- 英語版利用規約 URL
- 英語版説明文（`app-store-description.md` の English Version 参照）

---

*Haru（秘書）/ 2026-04-13 / Rizup*
