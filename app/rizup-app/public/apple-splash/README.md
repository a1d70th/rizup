# iOS Splash Screens

App Store 申請時に必要な iOS Safari / PWA 用スプラッシュ画像。

## 必要なサイズ一覧（iPhone 15/14/13/12/11 および iPad）

| デバイス | ポートレート | ランドスケープ |
|---|---|---|
| iPhone 15 Pro Max / 14 Plus | 1290×2796 | 2796×1290 |
| iPhone 15 Pro / 14 Pro | 1179×2556 | 2556×1179 |
| iPhone 15 / 14 / 13 Pro | 1170×2532 | 2532×1170 |
| iPhone 13 / 12 / 12 Pro | 1170×2532 | 2532×1170 |
| iPhone 13 mini / 12 mini | 1080×2340 | 2340×1080 |
| iPhone 11 Pro Max / XS Max | 1242×2688 | 2688×1242 |
| iPhone 11 / XR | 828×1792 | 1792×828 |
| iPhone 11 Pro / X / XS | 1125×2436 | 2436×1125 |
| iPhone 8 Plus / 7 Plus | 1242×2208 | 2208×1242 |
| iPhone 8 / 7 / 6s | 750×1334 | 1334×750 |
| iPad Pro 12.9" | 2048×2732 | 2732×2048 |
| iPad Pro 11" | 1668×2388 | 2388×1668 |
| iPad mini / Air | 1536×2048 | 2048×1536 |

## デザイン仕様

- **背景**：`#fafafa`（ライト）または `#0f1512`（ダーク）
- **中央配置**：`sho.png`（256×256px を中央）
- **下部**：`Rizup` ロゴ（アンチエイリアス・アプリ名）
- **セーフエリア**：上下100pxは空白（ノッチ対応）

## 一括生成方法（推奨）

### A. PWA Asset Generator（npm）

```bash
npx pwa-asset-generator ./source-512.png ./app/rizup-app/public/apple-splash \
  --splash-only \
  --background "#fafafa" \
  --padding "25%"
```

`source-512.png` は 512×512 の sho.png を配置。

### B. 手動（Figma / Photoshop）

各サイズのキャンバスを用意し、背景色 → Sho画像中央配置 → PNG出力。

## layout.tsx からの参照

`next/head` で各サイズを参照：

```tsx
// src/app/layout.tsx
<link rel="apple-touch-startup-image"
  media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
  href="/apple-splash/iphone-1290x2796.png" />
```

※生成後にコミットすること。

## 暫定対応

現時点では `sho.png` をスプラッシュとして `apple-touch-icon` で代用。
Capacitor ラップ時は Xcode の `LaunchScreen.storyboard` で中央配置にする方が簡単。
