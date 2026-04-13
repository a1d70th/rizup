// Rizup Dispatch Server v2（intent routing対応）
// POST /task で受け取ったメッセージから意図を検出し、
// SNS自動投稿 or Claude Code 実行を振り分ける。
//
// ── 組み込み意図（キーワード）──────────────────────────────
//   「スレッズ投稿」「threads投稿」        → threads-post.mjs
//   「X投稿」「ツイート」「twitter投稿」   → x-post.mjs
//   「SNS投稿」「両方投稿」                 → scheduler --now (両方)
//   それ以外                                → claude --print（AUTO_RUN=1時のみ）
//
// 環境変数:
//   PORT              デフォルト 3456
//   DISPATCH_SECRET   設定すると Authorization: Bearer <secret> を要求
//   AUTO_RUN_CLAUDE   "1" なら意図マッチなしの時に claude --print を起動
//   QUEUE_FILE        デフォルト ./dispatch-queue.jsonl

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3456);
const SECRET = process.env.DISPATCH_SECRET || "";
const AUTO_RUN = process.env.AUTO_RUN_CLAUDE === "1";
const QUEUE_FILE = process.env.QUEUE_FILE || path.join(__dirname, "dispatch-queue.jsonl");
const RESULTS_FILE = path.join(__dirname, "dispatch-queue-results.jsonl");
const LOG_FILE = path.join(__dirname, "dispatch.log");
const SOCIAL_DIR = path.join(__dirname, "social-automation");

function timestamp() { return new Date().toISOString(); }

async function log(msg) {
  const line = `[${timestamp()}] ${msg}\n`;
  process.stdout.write(line);
  try { await fs.appendFile(LOG_FILE, line, "utf8"); } catch { /* ignore */ }
}

async function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(new Error("Payload too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, status, obj) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(obj));
}

/** メッセージから意図を検出 */
function detectIntent(message) {
  if (/(スレッズ|threads).*(投稿|post|送|出)/i.test(message) ||
      /^(スレッズ|threads)\s*$/i.test(message.trim())) {
    return { kind: "threads" };
  }
  if (/(^|\s)(x|ツイッ|twitter)(\s|$|に|へ).*(投稿|post|送|つぶやく|ツイート)/i.test(message) ||
      /(ツイート|つぶやいて)/.test(message) ||
      /^(x投稿|ツイート)\s*$/i.test(message.trim())) {
    return { kind: "x" };
  }
  if (/(sns|両方|全部).*(投稿|post|配信)/i.test(message)) {
    return { kind: "both" };
  }
  return { kind: "claude" };
}

async function runScript(script, args = [], cwd = SOCIAL_DIR) {
  return new Promise((resolve) => {
    const full = path.join(cwd, script);
    const child = spawn(process.execPath, [full, ...args], {
      cwd, windowsHide: true,
    });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("close", (code) => resolve({ code, out, err }));
    child.on("error", (e) => resolve({ code: -1, out, err: String(e) }));
    setTimeout(() => { try { child.kill(); } catch { /* noop */ } }, 5 * 60_000);
  });
}

async function runClaude(prompt) {
  return new Promise((resolve) => {
    const child = spawn("claude", ["--print", prompt], {
      shell: true, cwd: __dirname, windowsHide: true,
    });
    let out = ""; let err = "";
    child.stdout.on("data", (d) => { out += d.toString(); });
    child.stderr.on("data", (d) => { err += d.toString(); });
    child.on("close", (code) => resolve({ code, out, err }));
    child.on("error", (e) => resolve({ code: -1, out, err: String(e) }));
    setTimeout(() => { try { child.kill(); } catch { /* noop */ } }, 5 * 60_000);
  });
}

async function dispatch(task) {
  const intent = detectIntent(task.message);
  await log(`🎯 task ${task.id} intent=${intent.kind}`);
  let result;
  switch (intent.kind) {
    case "threads":
      result = await runScript("threads-post.mjs");
      break;
    case "x":
      result = await runScript("x-post.mjs");
      break;
    case "both":
      result = await runScript("social-scheduler.mjs", ["--now"]);
      break;
    case "claude":
      if (AUTO_RUN) result = await runClaude(task.message);
      else result = { code: 0, out: "(queued only — AUTO_RUN_CLAUDE is off)", err: "" };
      break;
  }
  const record = {
    id: task.id,
    intent: intent.kind,
    finished_at: timestamp(),
    code: result.code,
    out_preview: (result.out || "").slice(0, 800),
    err_preview: (result.err || "").slice(0, 400),
  };
  await fs.appendFile(RESULTS_FILE, JSON.stringify(record) + "\n", "utf8").catch(() => {});
  await log(`✅ task ${task.id} finished intent=${intent.kind} code=${result.code}`);
  return { intent, result };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  if (req.method === "GET" && url.pathname === "/") {
    return json(res, 200, {
      service: "rizup-dispatch",
      version: "2.0",
      status: "alive",
      time: timestamp(),
      auto_run_claude: AUTO_RUN,
      intents: ["threads", "x", "both", "claude"],
      endpoints: ["POST /task", "GET /queue", "GET /results", "GET /log"],
    });
  }

  if (req.method === "GET" && url.pathname === "/queue") {
    try {
      const txt = await fs.readFile(QUEUE_FILE, "utf8").catch(() => "");
      const lines = txt.split("\n").filter((l) => l.trim()).slice(-50);
      const items = lines.map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
      return json(res, 200, { count: items.length, items });
    } catch (e) { return json(res, 500, { error: String(e) }); }
  }

  if (req.method === "GET" && url.pathname === "/results") {
    try {
      const txt = await fs.readFile(RESULTS_FILE, "utf8").catch(() => "");
      const lines = txt.split("\n").filter((l) => l.trim()).slice(-50);
      const items = lines.map((l) => { try { return JSON.parse(l); } catch { return { raw: l }; } });
      return json(res, 200, { count: items.length, items });
    } catch (e) { return json(res, 500, { error: String(e) }); }
  }

  if (req.method === "GET" && url.pathname === "/log") {
    try {
      const txt = await fs.readFile(LOG_FILE, "utf8").catch(() => "");
      const lines = txt.split("\n").slice(-50).join("\n");
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end(lines);
    } catch (e) { return json(res, 500, { error: String(e) }); }
  }

  if (req.method === "POST" && url.pathname === "/task") {
    if (SECRET) {
      const auth = req.headers.authorization || "";
      if (auth !== `Bearer ${SECRET}`) {
        await log(`401 from ${req.socket.remoteAddress}`);
        return json(res, 401, { error: "Unauthorized" });
      }
    }
    try {
      const raw = await readBody(req);
      let payload;
      try { payload = raw ? JSON.parse(raw) : {}; }
      catch { payload = { message: raw }; }
      const message = (payload.message || payload.prompt || payload.text || "").toString().trim();
      if (!message) return json(res, 400, { error: "message is required" });

      const task = {
        id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        received_at: timestamp(),
        source: req.socket.remoteAddress,
        message,
      };
      await fs.appendFile(QUEUE_FILE, JSON.stringify(task) + "\n", "utf8");
      const intent = detectIntent(message);
      await log(`📥 task ${task.id} intent=${intent.kind}`);

      dispatch(task).catch((e) => log(`❌ ${task.id} dispatch error: ${e}`));

      return json(res, 202, {
        ok: true,
        task_id: task.id,
        intent: intent.kind,
        message: `Task accepted; intent=${intent.kind}`,
      });
    } catch (e) {
      await log(`❌ /task error: ${e}`);
      return json(res, 500, { error: String(e) });
    }
  }

  return json(res, 404, {
    error: "Not found",
    available: ["POST /task", "GET /queue", "GET /results", "GET /log", "GET /"],
  });
});

server.listen(PORT, () => {
  log(`🚀 Rizup Dispatch v2 on http://127.0.0.1:${PORT}`);
  log(`   queue: ${QUEUE_FILE}`);
  log(`   secret: ${SECRET ? "enabled" : "disabled"}`);
  log(`   auto-run claude: ${AUTO_RUN ? "ON" : "OFF"}`);
  log(`   intents: threads / x / both / claude(fallback)`);
});

process.on("SIGINT", () => { log("shutdown"); server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { log("shutdown"); server.close(() => process.exit(0)); });
