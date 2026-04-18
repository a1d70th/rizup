# Rizup コミュニティイベント設計

> Rizup（事業①）の Pro ユーザー向けコミュニティ運用設計。
> 2026-04-18 確定版。

---

## 🎥 月 1 オンラインミーティング（定期・Pro 限定）

| 項目 | 内容 |
|---|---|
| 形式 | Zoom・Google Meet |
| 頻度 | 毎月第〇土曜 20:00〜21:30（曜日は翌月開始前に確定） |
| 対象 | Pro ユーザー限定 |
| 人数 | 上限なし |
| 参加費 | Pro 会費に含む（追加費用なし） |
| 翔平さん | 毎回ホスト |

### 内容構成
- **前半 45 分**: 翔平さんの近況報告（Rizup・NOMI・転職・等身大）
- **後半 45 分**: 参加者のシェアタイム（「今月やったこと・来月やること」）

### 司会運営ルール
- 開始時刻 厳守
- 初回参加者は冒頭で自己紹介（30 秒 × 人数）
- シェアタイムは 1 人 3 分 × 挙手制
- 録画: **なし**（安心して話せる空気を保つため）

---

## 🍻 不定期オフ会（大阪・リアル）

| 項目 | 内容 |
|---|---|
| 形式 | 大阪市内（難波・梅田・中崎町 等） |
| 頻度 | 不定期（2〜3 ヶ月に 1 回が目安） |
| 対象 | Pro ユーザー優先案内 + 一般参加枠 少数 |
| 人数 | 15〜30 人 |
| 翔平さん | 毎回参加・ホスト役 |

### 参加費（2026-04-18 確定方針）
- **Pro**: **¥500〜1,000**（場所代・実費のみ）
- **一般**: **¥2,000〜3,000**
- 翔平さんの方針: **「お金はそんなにいただきたくない、少しもらう程度」**
- 集金はリアル・現金 or PayPay（手数料で利益が消えないよう Stripe は経由しない）

### 内容
- テーマなし・自由交流
- 会場は毎回変更（居酒屋・カフェ・レンタルスペース）

---

## 🗓 実装フェーズ

### Phase 1（今月・MVP 軽量運用）
- Pro ユーザーへ Google フォームで参加希望を募る
- スレッズ（@shohei_rizup）で告知
- Zoom リンクをメール送信（Supabase のメール機能 or 手動）
- **開発コストゼロで走り出す**

### Phase 2（来月・アプリ統合）
- `/events` ページをアプリに実装
- Pro ユーザーのみ「参加する」ボタンが表示される
- Supabase に `events` テーブル追加
  ```sql
  CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('online', 'offline')),
    scheduled_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER,
    price_pro INTEGER DEFAULT 0,
    price_general INTEGER,
    zoom_url TEXT,
    location TEXT,
    description TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE event_attendees (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
  );
  ```

### Phase 3（将来・Premium 公開後）
- Premium ユーザーはオフ会参加費無料化
- 翔平さんとの 1on1 Q&A（月 30 分）枠を Premium に追加

---

## 📋 運用チェックリスト（月 1 ミーティング）

### 開催 1 週間前
- [ ] 日時を Google Calendar に入れる
- [ ] Zoom ミーティングを作成
- [ ] Google フォーム（参加希望）を作成・公開
- [ ] スレッズで告知投稿（Rei に依頼）

### 開催 2 日前
- [ ] 参加希望者にリマインドメール送信
- [ ] Zoom リンクを参加者に送信
- [ ] 翔平さんの「近況報告 45 分」アウトラインを準備

### 当日
- [ ] 10 分前に Zoom 待機室 ON
- [ ] 司会原稿確認
- [ ] シェアタイムのタイマー準備

### 開催後
- [ ] 参加者にお礼メール
- [ ] 次回告知を予告
- [ ] 参加者数・感想を dashboard に記録

---

## 🎯 KPI

| 指標 | 目標（Phase 1・初月） |
|---|---|
| Pro 登録者数 | 10 人 |
| 月 1 ミーティング参加率 | Pro の 50% 以上（5 人以上）|
| オフ会参加申込数 | 10 人以上（うち Pro 優先枠 6 人）|
| NPS | 8 以上（「また参加したい」率） |

---

## ⚠️ 注意事項

- **録画しない**: 参加者が本音を話せる空気を最優先
- **翔平さんの自己開示が鍵**: 成功話だけでなく失敗・悩みも共有する
- **シェアタイム強制しない**: 聞き専 OK ルールを明示
- **Zoom URL は使い回さない**: 毎月新規発行（セキュリティ）
- **オフ会の参加者 SNS 投稿**: 本人の同意を毎回確認
