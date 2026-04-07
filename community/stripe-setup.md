# Stripe × Discord 有料化 実装手順

> 月額1,000円の課金 → 支払い完了 → Discord有料チャンネルへ自動招待

---

## 全体のフロー

```
ユーザーが LP で「有料プランに参加する」をクリック
  → Stripe Checkout ページへ遷移
  → クレジットカード情報を入力・決済
  → Stripe Webhook が発火
  → サーバー側で Discord API を呼び出し
  → ユーザーに @有料メンバー ロールを自動付与
  → 有料チャンネルが閲覧可能になる

解約時：
  → Stripe で subscription をキャンセル
  → Webhook が発火
  → @有料メンバー ロールを自動削除
  → 有料チャンネルが非表示になる
```

---

## 1. Stripe の初期設定

### Step 1：Stripe アカウント作成

1. `https://stripe.com/jp` にアクセス
2. アカウントを作成（メールアドレス・パスワード）
3. ダッシュボードで本人確認・銀行口座を登録

### Step 2：商品と料金の作成

1. Stripe ダッシュボード → **「商品」** → **「商品を追加」**
2. 以下を入力：

| 項目 | 値 |
|---|---|
| 商品名 | Rizup 有料メンバーシップ |
| 説明 | Rizupコミュニティの有料プラン。限定チャンネル・メンター相談・週次レビュー会に参加できます。 |
| 価格 | ¥1,000 |
| 請求期間 | 月次（毎月） |

3. 作成後、**Price ID**（`price_xxxx`）をメモしておく

### Step 3：Checkout リンクの作成

**方法A：Payment Links（コード不要・最も簡単）**

1. ダッシュボード → **「Payment Links」** → **「リンクを作成」**
2. 上で作成した商品を選択
3. 「作成」をクリック → 支払いリンク（`https://buy.stripe.com/xxxx`）が発行される
4. このリンクを LP のボタンに設定する

**カスタムフィールド設定（必須）：**
Payment Link 作成時に「カスタムフィールドを追加」で以下を設定：
- フィールド名：`Discord ユーザー名`
- 種類：テキスト
- 必須：はい

> これにより、支払い完了後にどの Discord ユーザーにロールを付与するか特定できる。

---

## 2. Discord Bot の作成（ロール自動付与用）

### Step 1：Discord Developer Portal で Bot を作成

1. `https://discord.com/developers/applications` にアクセス
2. **「New Application」** → 名前：`Rizup Payment Bot`
3. **「Bot」** タブ → **「Add Bot」**
4. **Bot Token** をコピー（絶対に外部に公開しない）
5. **「Privileged Gateway Intents」** で以下を有効化：
   - Server Members Intent ✅
   - Message Content Intent ✅

### Step 2：Bot をサーバーに招待

1. **「OAuth2」** → **「URL Generator」**
2. Scopes: `bot`
3. Bot Permissions: `Manage Roles`
4. 生成された URL をブラウザで開いて Rizup サーバーに追加

### Step 3：Bot のロール位置を調整

- サーバー設定 → ロール → `Rizup Payment Bot` のロールを `@有料メンバー` より**上**に配置
- （Bot は自分より下のロールしか付与できないため）

---

## 3. Webhook サーバーの構築

Stripe の支払いイベントを受け取り、Discord にロールを付与するサーバーを構築する。

### 方法：Vercel Serverless Functions

#### ファイル構成

```
/rizup
  /api
    stripe-webhook.js    ← Stripe Webhook を受け取る API
```

#### `api/stripe-webhook.js`

```javascript
// Vercel Serverless Function
// Stripe Webhook → Discord ロール付与

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Stripe Webhook の署名検証にはraw bodyが必要
export const config = { api: { bodyParser: false } };

async function buffer(readable) {
  const chunks = [];
  for await (const chunk of readable) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 支払い完了時
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const discordUsername = session.custom_fields?.[0]?.text?.value;

    if (discordUsername) {
      await addPaidRole(discordUsername);
      console.log(`Paid role added for: ${discordUsername}`);
    }
  }

  // サブスクリプション解約時
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    // 解約時のロール削除ロジック
    console.log(`Subscription cancelled for: ${customer.email}`);
    // TODO: Discord ユーザー名をメタデータから取得してロール削除
  }

  res.status(200).json({ received: true });
}

// Discord API でロールを付与
async function addPaidRole(discordUsername) {
  const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const PAID_ROLE_ID = process.env.DISCORD_PAID_ROLE_ID;

  // ギルドメンバーを検索
  const searchRes = await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/search?query=${encodeURIComponent(discordUsername)}&limit=1`,
    { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } }
  );
  const members = await searchRes.json();

  if (!members.length) {
    console.log(`Member not found: ${discordUsername}`);
    return;
  }

  const userId = members[0].user.id;

  // ロールを付与
  await fetch(
    `https://discord.com/api/v10/guilds/${GUILD_ID}/members/${userId}/roles/${PAID_ROLE_ID}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
    }
  );
}
```

### Step 4：Vercel に環境変数を設定

Vercel ダッシュボード → `Settings` → `Environment Variables`：

| 変数名 | 値 | 取得場所 |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_xxxx` | Stripe → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxxx` | Stripe → Webhook 設定時に表示 |
| `DISCORD_BOT_TOKEN` | `Bot トークン` | Discord Developer Portal |
| `DISCORD_GUILD_ID` | `サーバーID` | Discord → サーバー右クリック → IDをコピー |
| `DISCORD_PAID_ROLE_ID` | `ロールID` | Discord → サーバー設定 → ロール → IDをコピー |

### Step 5：Stripe Webhook を登録

1. Stripe ダッシュボード → **「Developers」** → **「Webhooks」** → **「エンドポイントを追加」**
2. エンドポイント URL：`https://rizup.vercel.app/api/stripe-webhook`
3. リッスンするイベント：
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. 作成後、**Signing Secret**（`whsec_xxxx`）を Vercel の環境変数に設定

---

## 4. 無料 / 有料メンバーのチャンネル分け

### Discord のロール権限で制御

```
無料メンバー（@メンバー ロール）
  → 無料エリアのチャンネルのみ閲覧・発言可能
  → 有料エリアは完全に非表示

有料メンバー（@有料メンバー ロール）
  → 無料エリア + 有料エリアの両方を閲覧・発言可能
  → 有料エリア限定のコンテンツ・イベントに参加可能
```

### 有料メンバー限定で提供するもの

| コンテンツ | チャンネル | 内容 |
|---|---|---|
| 目標設定コーチング | #goal-setting | 月次目標の設定・追跡・フィードバック |
| 限定学習コンテンツ | #deep-learning | 有料記事・動画・ワークシート |
| メンター相談 | #mentorship | 1on1予約・キャリア相談 |
| 転職・副業サポート | #career-support | 履歴書レビュー・面接対策 |
| 週次振り返り会 | #weekly-review | 毎週金曜のオンライン振り返り |
| 限定イベント | #members-only | 月1回のゲスト講演・交流会 |

### 無料→有料のアップセル導線

無料エリアの各チャンネルに、定期的に以下のメッセージを投稿：

```
🔥 もっと深く取り組みたい方へ

有料プラン（月額 ¥1,000）では、以下が追加で利用できます：
✅ メンターとの1on1相談
✅ 週次振り返り会
✅ 限定学習コンテンツ
✅ 転職・副業サポート

詳しくはこちら → [LPのURL]
```

---

## 5. テスト手順

### Stripe テストモードでの確認

1. Stripe ダッシュボードをテストモードに切り替え（右上のトグル）
2. テスト用 Payment Link を作成
3. テスト用カード番号 `4242 4242 4242 4242`（有効期限・CVCは任意）で決済
4. Webhook が正しく発火するか確認
5. Discord で `@有料メンバー` ロールが付与されるか確認
6. 有料チャンネルが表示されるか確認

### テストカード一覧

| カード番号 | 結果 |
|---|---|
| `4242 4242 4242 4242` | 成功 |
| `4000 0000 0000 0002` | カード拒否 |
| `4000 0000 0000 3220` | 3Dセキュア認証 |

---

## 6. 本番切り替えチェックリスト

- [ ] Stripe アカウントの本人確認・銀行口座登録が完了
- [ ] Stripe を本番モードに切り替え
- [ ] 本番用の API キーを Vercel 環境変数に設定
- [ ] 本番用の Webhook エンドポイントを登録
- [ ] 本番用の Payment Link を作成
- [ ] LP のボタンを本番用 Payment Link URL に変更
- [ ] テスト購入で一連のフローを確認
- [ ] 解約フローのテスト

---

*作成：Sora（開発）/ 2026年4月*
