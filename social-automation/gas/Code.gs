/**
 * Rizup Threads Auto-Publisher (Google Apps Script版)
 * ────────────────────────────────────────────────────
 * Spreadsheet を投稿キューとして使い、Threads API に定期投稿する。
 *
 * 【Spreadsheetスキーマ】（Sheet1の1行目にヘッダー固定）
 *  A: id                一意ID（自動）
 *  B: status            queued / published / failed / scheduled
 *  C: scheduled_at      投稿予定 ISO日時 or "now"（空欄で即時）
 *  D: text              本文（500字以内）
 *  E: posted_at         投稿時刻（自動）
 *  F: media_id          Threads の返却ID（自動）
 *  G: error             失敗時のエラーメッセージ（自動）
 *  H: impressions       Insights 取得後の表示数
 *  I: likes             同 いいね
 *  J: replies           同 返信
 *
 * 【Script Properties（PropertiesService）に保存する値】
 *  THREADS_ACCESS_TOKEN   60日トークン
 *  THREADS_USER_ID        数字ID
 *  THREADS_APP_SECRET     App Secret（トークン自動更新に使用）
 *  DISPATCH_SECRET        （任意）doPost で Bearer 認証する場合
 */

const SHEET_NAME = "Sheet1";
const API = "https://graph.threads.net/v1.0";

// ── ユーティリティ ─────────────────────────────────────────
function prop(key, def = null) {
  return PropertiesService.getScriptProperties().getProperty(key) || def;
}
function setProp(key, val) {
  PropertiesService.getScriptProperties().setProperty(key, val);
}
function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["id", "status", "scheduled_at", "text", "posted_at", "media_id", "error", "impressions", "likes", "replies"]);
    sh.setFrozenRows(1);
  }
  return sh;
}
function newId_() {
  return "p_" + Utilities.formatDate(new Date(), "JST", "yyyyMMddHHmmss") + "_" + Math.random().toString(36).slice(2, 6);
}
function authOk_(e) {
  const required = prop("DISPATCH_SECRET");
  if (!required) return true;
  const header = (e && e.parameter && e.parameter.secret) || "";
  return header === required;
}

// ── doPost: Claude Code / 外部から投稿を受け取る ─────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const secret = prop("DISPATCH_SECRET");
    if (secret && body.secret !== secret) {
      return ContentService.createTextOutput(JSON.stringify({ error: "Unauthorized" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const text = (body.text || body.message || "").toString().trim();
    if (!text) throw new Error("text is required");

    const sched = body.scheduled_at || "now";
    const id = newId_();
    sheet_().appendRow([id, "queued", sched, text, "", "", "", "", "", ""]);

    // scheduled_at が "now" か 1分以内なら即投稿
    const runNow = sched === "now" || (Date.now() + 60_000 > new Date(sched).getTime());
    let out = { ok: true, id, queued: true };
    if (runNow && (body.publish_immediately !== false)) {
      const r = publishOne_(id);
      out = { ...out, publish: r };
    }
    return ContentService.createTextOutput(JSON.stringify(out))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── doGet: キュー確認 ────────────────────────────────────────
function doGet(e) {
  const action = e && e.parameter && e.parameter.action;
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  const headers = rows.shift();

  if (action === "insights") {
    return ContentService.createTextOutput(JSON.stringify(fetchAllInsights_()))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const items = rows.map(r => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
  const filtered = e && e.parameter && e.parameter.status
    ? items.filter(x => x.status === e.parameter.status)
    : items;
  return ContentService.createTextOutput(JSON.stringify({
    count: filtered.length,
    items: filtered.slice(-50),
  })).setMimeType(ContentService.MimeType.JSON);
}

// ── publishScheduled: 5分おきに呼ばれる本体 ──────────────────
function publishScheduled() {
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  const now = new Date();
  for (let i = 1; i < rows.length; i++) {
    const [id, status, sched] = rows[i];
    if (status !== "queued" && status !== "scheduled") continue;
    const schedDate = (sched === "now" || !sched) ? now : new Date(sched);
    if (isNaN(schedDate.getTime())) continue;
    if (schedDate.getTime() <= now.getTime()) {
      publishOne_(id);
      Utilities.sleep(2000); // レート制限保護
    }
  }
}

// ── publishOne: 1件を Threads に投稿 ─────────────────────────
function publishOne_(id) {
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] !== id) continue;
    const rowNum = i + 1;
    const text = (rows[i][3] || "").toString().trim();
    if (!text) return { ok: false, reason: "empty text" };

    try {
      const token = prop("THREADS_ACCESS_TOKEN");
      const userId = prop("THREADS_USER_ID");
      if (!token || !userId) throw new Error("THREADS_ACCESS_TOKEN / THREADS_USER_ID not set");

      // Step 1: container
      const createRes = UrlFetchApp.fetch(`${API}/${userId}/threads`, {
        method: "post",
        payload: {
          media_type: "TEXT",
          text: text.slice(0, 500),
          access_token: token,
        },
        muteHttpExceptions: true,
      });
      const createJson = JSON.parse(createRes.getContentText());
      if (!createJson.id) throw new Error("createContainer: " + createRes.getContentText());

      // Threads公式推奨で少し待つ
      Utilities.sleep(2000);

      // Step 2: publish
      const pubRes = UrlFetchApp.fetch(`${API}/${userId}/threads_publish`, {
        method: "post",
        payload: {
          creation_id: createJson.id,
          access_token: token,
        },
        muteHttpExceptions: true,
      });
      const pubJson = JSON.parse(pubRes.getContentText());
      if (!pubJson.id) throw new Error("publish: " + pubRes.getContentText());

      sh.getRange(rowNum, 2).setValue("published");
      sh.getRange(rowNum, 5).setValue(new Date().toISOString());
      sh.getRange(rowNum, 6).setValue(pubJson.id);
      sh.getRange(rowNum, 7).setValue("");
      notifyOk_(text, pubJson.id);
      return { ok: true, media_id: pubJson.id };
    } catch (err) {
      sh.getRange(rowNum, 2).setValue("failed");
      sh.getRange(rowNum, 7).setValue(String(err).slice(0, 500));
      notifyErr_(text, String(err));
      return { ok: false, error: String(err) };
    }
  }
  return { ok: false, reason: "id not found" };
}

// ── トークン自動更新（24時間おきに呼ぶ） ────────────────────
function refreshTokenIfNeeded() {
  const token = prop("THREADS_ACCESS_TOKEN");
  if (!token) return "no token";
  // 30日経過したら更新（最終更新日時を保存）
  const lastRaw = prop("TOKEN_REFRESHED_AT");
  const last = lastRaw ? new Date(lastRaw) : new Date(0);
  const days = (Date.now() - last.getTime()) / 86400000;
  if (days < 30) return `not yet (${Math.round(days)}d)`;

  const url = `${API}/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(token)}`;
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  if (json.access_token) {
    setProp("THREADS_ACCESS_TOKEN", json.access_token);
    setProp("TOKEN_REFRESHED_AT", new Date().toISOString());
    return "refreshed";
  }
  return "failed: " + res.getContentText();
}

// ── Insights 取得（1時間おきに呼ぶ） ────────────────────────
function fetchAllInsights_() {
  const sh = sheet_();
  const rows = sh.getDataRange().getValues();
  const token = prop("THREADS_ACCESS_TOKEN");
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const [id, status, , , , mediaId] = rows[i];
    if (status !== "published" || !mediaId) continue;
    try {
      const res = UrlFetchApp.fetch(
        `${API}/${mediaId}/insights?metric=views,likes,replies&access_token=${encodeURIComponent(token)}`,
        { muteHttpExceptions: true }
      );
      const json = JSON.parse(res.getContentText());
      const data = json.data || [];
      const map = {};
      data.forEach(d => { map[d.name] = d.values?.[0]?.value; });
      if (map.views != null) sh.getRange(i + 1, 8).setValue(map.views);
      if (map.likes != null) sh.getRange(i + 1, 9).setValue(map.likes);
      if (map.replies != null) sh.getRange(i + 1, 10).setValue(map.replies);
      results.push({ id, media_id: mediaId, ...map });
    } catch (e) { /* ignore */ }
    Utilities.sleep(500);
  }
  return results;
}
function fetchInsights() { return fetchAllInsights_(); }

// ── 通知（Discord / メール） ──────────────────────────────────
function notifyOk_(text, mediaId) {
  const url = prop("DISCORD_WEBHOOK_URL");
  if (url) {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ content: "✅ Threads投稿完了 `" + mediaId + "`\n" + text.slice(0, 200) }),
      muteHttpExceptions: true,
    });
  }
  const to = prop("NOTIFY_EMAIL");
  if (to) {
    MailApp.sendEmail({ to, subject: "🧵 Threads投稿完了", body: `media_id: ${mediaId}\n\n${text}` });
  }
}
function notifyErr_(text, err) {
  const url = prop("DISCORD_WEBHOOK_URL");
  if (url) {
    UrlFetchApp.fetch(url, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify({ content: "⚠️ Threads投稿失敗\n```" + err.slice(0, 500) + "```\n" + text.slice(0, 200) }),
      muteHttpExceptions: true,
    });
  }
}

// ── 手動テスト ───────────────────────────────────────────────
function testPostNow() {
  const sh = sheet_();
  const id = newId_();
  sh.appendRow([id, "queued", "now", "GASセットアップテスト🌿 毎日1%の複利成長、ここから始まる。", "", "", "", "", "", ""]);
  return publishOne_(id);
}
