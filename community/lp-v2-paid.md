# LP v2（有料化版）設計書

> β版 LP（v1）から有料プランを含む LP（v2）への切り替え設計。
> 無料参加と有料参加の2つの導線を持つ構成。

---

## 1. v1 → v2 の変更概要

| 項目 | v1（現在・β版） | v2（有料化後） |
|---|---|---|
| トップバナー | 「現在ベータ版・完全無料・限定10名」 | 「無料プランあり・有料プラン月額¥1,000」 |
| CTAボタン | メール登録 → Discord | 2ボタン：無料で始める / 有料プランに参加 |
| 料金セクション | なし | 無料 vs 有料の比較表を追加 |
| ヒーローCTA | 「無料で参加してみる」1つ | 「まず無料で始める」+「有料プランを見る」 |
| ナビ | 「無料で参加する」 | 「料金プラン」リンク + 「参加する」ボタン |
| フッター | 基本リンクのみ | 特定商取引法に基づく表記を追加 |

---

## 2. ページ構成（v2）

```
[バナー] 無料プランあり ・ 有料プラン月額¥1,000
[ナビ]   Rizup ✦ | コンセプト | できること | 料金 | 参加する

[ヒーロー]
  今日から、前向きになれる場所がある。
  [まず無料で始める] [有料プランを見る]

[トラストバー]
  完全無料プランあり / 有料は月額¥1,000 / いつでも解約可能

[About] ← v1と同じ
[3つの約束] ← v1と同じ
[Problem] ← v1と同じ
[Features] ← v1と同じ

[★ 新セクション：料金プラン]
  無料プラン vs 有料プランの比較表

[Steps] ← 無料・有料それぞれの参加ステップ

[CTA]
  メール登録フォーム → 無料：Discord / 有料：Stripe Checkout

[フッター] ← 特定商取引法リンク追加
```

---

## 3. 新セクション：料金プラン

### デザイン仕様

2カラムのカード形式。有料プランを強調（ボーダーをミントグリーンに）。

### コンテンツ

```
┌─────────────────────┐  ┌─────────────────────────────┐
│  無料プラン          │  │  ★ 有料プラン               │
│  ¥0 / 月             │  │  ¥1,000 / 月                │
│                     │  │  「本気で前に進みたい人へ」    │
│  ✅ コミュニティ参加  │  │                             │
│  ✅ daily-checkin    │  │  無料プランの全機能 +        │
│  ✅ 雑談・悩み相談    │  │                             │
│  ✅ 達成報告         │  │  ✅ メンター1on1相談         │
│  ✅ なんでも質問     │  │  ✅ 月次目標コーチング        │
│                     │  │  ✅ 限定学習コンテンツ        │
│  ❌ メンター相談     │  │  ✅ 転職・副業サポート        │
│  ❌ 目標コーチング    │  │  ✅ 週次振り返り会           │
│  ❌ 限定コンテンツ   │  │  ✅ 限定イベント             │
│  ❌ 週次振り返り会   │  │                             │
│                     │  │  [有料プランに参加する]       │
│  [無料で始める]      │  │  いつでも解約可能            │
└─────────────────────┘  └─────────────────────────────┘
```

### HTML 実装ガイド

```html
<!-- 料金セクション -->
<section class="pricing" id="pricing">
  <div class="pricing-inner">
    <span class="sec-label">Pricing</span>
    <h2 class="sec-title">あなたに合ったプランを選べます</h2>
    <p class="sec-desc">まずは無料で始めて、もっと深く取り組みたくなったら有料プランへ。</p>

    <div class="pricing-grid">
      <!-- 無料プラン -->
      <div class="price-card">
        <h3>無料プラン</h3>
        <div class="price">¥0<span>/月</span></div>
        <p class="price-desc">気軽に始めたい方へ</p>
        <ul class="price-features">
          <li class="included">コミュニティ参加</li>
          <li class="included">毎日のチェックイン</li>
          <li class="included">雑談・悩み相談</li>
          <li class="included">達成報告・お祝い</li>
          <li class="included">なんでも質問</li>
          <li class="excluded">メンター1on1相談</li>
          <li class="excluded">目標コーチング</li>
          <li class="excluded">限定コンテンツ</li>
          <li class="excluded">週次振り返り会</li>
        </ul>
        <a href="#join" class="btn-sub">無料で始める</a>
      </div>

      <!-- 有料プラン -->
      <div class="price-card price-card-featured">
        <div class="price-badge">おすすめ</div>
        <h3>有料プラン</h3>
        <div class="price">¥1,000<span>/月</span></div>
        <p class="price-desc">本気で前に進みたい方へ</p>
        <ul class="price-features">
          <li class="included">無料プランの全機能</li>
          <li class="included">メンター1on1相談</li>
          <li class="included">月次目標コーチング</li>
          <li class="included">限定学習コンテンツ</li>
          <li class="included">転職・副業サポート</li>
          <li class="included">週次振り返り会</li>
          <li class="included">限定イベント参加</li>
        </ul>
        <!-- 有料化時はここをStripe決済URLに変更 -->
        <a href="https://buy.stripe.com/xxxxx" class="btn-main">有料プランに参加する</a>
        <p class="price-note">いつでも解約可能・日割り返金あり</p>
      </div>
    </div>
  </div>
</section>
```

### CSS 実装ガイド

```css
.pricing { background: var(--bg); }
.pricing-inner { max-width: 820px; margin: 0 auto; text-align: center; }
.pricing-inner .sec-desc { margin: 0 auto 3rem; }

.pricing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.price-card {
  background: var(--white);
  border-radius: 24px;
  padding: 2.5rem 2rem;
  border: 1.5px solid var(--border);
  text-align: left;
}

.price-card-featured {
  border-color: var(--mint);
  position: relative;
  box-shadow: 0 8px 32px rgba(110,203,176,0.18);
}

.price-badge {
  position: absolute;
  top: -12px; right: 24px;
  background: var(--mint);
  color: #fff;
  padding: 0.3rem 1rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.price { font-size: 2.8rem; font-weight: 800; color: var(--text); }
.price span { font-size: 1rem; font-weight: 400; color: var(--text-mid); }

.price-features { list-style: none; margin: 1.5rem 0; }
.price-features li {
  padding: 0.5rem 0;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.price-features .included::before { content: '✅'; }
.price-features .excluded::before { content: '—'; color: var(--text-light); }
.price-features .excluded { color: var(--text-light); }

@media (max-width: 768px) {
  .pricing-grid { grid-template-columns: 1fr; }
}
```

---

## 4. CTA セクションの変更

### v2 の CTA

```html
<section class="cta-section" id="join">
  <div class="cta-inner">
    <div class="cta-icon">🌿</div>
    <h2>今日から、一緒に<br>前を向いていこう。</h2>
    <p>
      まずは無料で始めてみませんか？<br>
      もっと深く取り組みたくなったら、有料プランがあります。
    </p>

    <!-- 無料参加フロー -->
    <form id="ctaForm" name="rizup-join" method="POST" onsubmit="handleJoin(event)">
      <div class="cta-form">
        <input class="cta-input" type="email" name="email"
               placeholder="メールアドレスを入力" required />
        <button class="cta-submit" type="submit">無料で始める</button>
      </div>
    </form>
    <p class="cta-note" style="margin-bottom: 1.5rem;">
      無料プラン · クレジットカード不要 · いつでも退会可能
    </p>

    <!-- 有料参加フロー -->
    <p style="font-size: 0.95rem; color: var(--text-mid); margin-bottom: 0.8rem;">
      または
    </p>
    <!-- 有料化時はここをStripe決済URLに変更 -->
    <a href="https://buy.stripe.com/xxxxx" target="_blank" rel="noopener"
       class="btn-sub" style="display: inline-block;">
      有料プラン（¥1,000/月）に参加する →
    </a>
  </div>
</section>
```

---

## 5. ヒーローセクションの変更

```html
<!-- v2 ヒーローボタン -->
<div class="hero-btns">
  <!-- 有料化時はここをStripe決済URLに変更 -->
  <a href="#join" class="btn-main">まず無料で始める</a>
  <a href="#pricing" class="btn-sub">料金プランを見る</a>
</div>
<p class="hero-note">無料プランあり · 有料プランは月額¥1,000 · いつでも解約可能</p>
```

---

## 6. バナーの変更

```html
<!-- v2 バナー -->
<div class="top-banner" id="topBanner">
  <span>無料プランあり</span>
  <span class="tb-badge">有料プラン ¥1,000/月</span>
  <span>いつでも解約可能</span>
  <button class="tb-close" onclick="closeBanner()" aria-label="閉じる">✕</button>
</div>
```

---

## 7. フッターの変更

```html
<footer>
  <div class="footer-logo">Riz<span>up</span></div>
  <ul class="footer-links">
    <li><a href="#">プライバシーポリシー</a></li>
    <li><a href="#">利用規約</a></li>
    <li><a href="#">特定商取引法に基づく表記</a></li>
    <li><a href="#">お問い合わせ</a></li>
  </ul>
  <p>&copy; 2026 Rizup Community. All rights reserved.</p>
</footer>
```

---

## 8. 切り替え手順チェックリスト

v1 → v2 の切り替え時に実施すること：

### 事前準備
- [ ] Stripe アカウントの本番設定が完了している
- [ ] Payment Link（本番用）が作成済み
- [ ] Stripe Webhook サーバーが稼働中
- [ ] Discord の有料チャンネルとロールが設定済み
- [ ] テストモードで決済→ロール付与の一連フローを確認済み

### LP 切り替え作業
- [ ] `index.html` のバナーテキストを v2 に変更
- [ ] ヒーローのボタンを v2 に変更
- [ ] ナビに「料金プラン」リンクを追加
- [ ] 料金セクション（pricing）を追加
- [ ] CTA を無料/有料の2導線に変更
- [ ] Stripe Payment Link URL を `<!-- 有料化時はここをStripe決済URLに変更 -->` コメントの箇所に設定
- [ ] フッターに「特定商取引法に基づく表記」リンクを追加
- [ ] `git add . && git commit -m "LP v2: Add paid plan" && git push`

### 切り替え後の確認
- [ ] LP の表示崩れがないか確認（PC・スマホ両方）
- [ ] 無料参加フロー（メール → Discord）が動作するか
- [ ] 有料参加フロー（Stripe Checkout → 決済 → Discord ロール付与）が動作するか
- [ ] 解約フロー（Stripe → ロール削除）が動作するか

---

## 9. 特定商取引法に基づく表記（テンプレート）

有料販売を行う場合、日本の法律で以下の表示が必要。
LP または別ページに掲載する。

```
# 特定商取引法に基づく表記

販売業者：株式会社 Rizup（または個人名）
代表者：Shohei Kodama
所在地：（住所）
電話番号：（電話番号）※メール対応優先
メールアドレス：（連絡先メール）

販売価格：月額 ¥1,000（税込）
支払方法：クレジットカード（Stripe経由）
支払時期：申込時に初回決済、以降毎月自動課金
サービス提供時期：決済完了後、即時
返品・キャンセル：いつでも解約可能。解約月の月末まで利用可能。日割り返金あり。
```

---

*作成：Sora（開発）/ Haru（PM）/ 2026年4月*
