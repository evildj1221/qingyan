// we-mp-rss → 青砚 AIHOT 推送桥：
// 周期性从 we-mp-rss 拉新文章（带正文），POST 到 AIHOT 的外部推送接口，
// 走同一套判重/预筛/评分/归组流水线。状态存在本地 state.json，重启不重复推。
// 先推送后又抓到正文的文章记入 __noBody，之后每轮补推（AIHOT 会按新内容出修订版）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASE = process.env.WEMPRSS_BASE ?? "http://we-mp-rss:8001";
const USER = process.env.WEMPRSS_USER ?? "admin";
const PASS = process.env.WEMPRSS_PASS ?? "admin@123";
const INGEST = process.env.AIHOT_INGEST ?? "http://api:3001/api/ingest/items";
const TOKEN = process.env.INGEST_TOKEN ?? "";
const INTERVAL_MIN = Number(process.env.INTERVAL_MIN ?? 10);
// wr_skey 是短命的会话 Cookie：微信读书网页版靠定期调续期接口保活，采集端只用不续，
// 一两天就过期、只能人工重扫。这里按固定节律续期，并把轮换后的 Cookie 写回 we-mp-rss。
const WEREAD_RENEW_MIN = Number(process.env.WEREAD_RENEW_MIN ?? 360);
const WEREAD_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const STATE_FILE = new URL("./state.json", import.meta.url);

let token = "";
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};

async function j(method, path, body, headers = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${path} -> HTTP ${res.status}: ${text.slice(0, 120)}`); }
  if (!res.ok && res.status === 401) token = ""; // 令牌过期，下轮重新登录
  return json;
}

async function login() {
  const res = await fetch(`${BASE}/api/v1/wx/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: USER, password: PASS }),
  });
  const json = await res.json();
  token = json?.data?.access_token ?? "";
  if (!token) throw new Error("登录失败: " + JSON.stringify(json).slice(0, 120));
}

/** 把 Set-Cookie 的轮换对合并进旧 Cookie 串，旧串里没有的键保留原样。 */
function mergeCookie(oldCookie, setCookies) {
  const jar = new Map();
  for (const part of oldCookie.split(";")) {
    const at = part.indexOf("=");
    if (at > 0) jar.set(part.slice(0, at).trim(), part.slice(at + 1).trim());
  }
  for (const sc of setCookies) {
    const pair = sc.split(";")[0];
    const at = pair.indexOf("=");
    if (at > 0) jar.set(pair.slice(0, at).trim(), pair.slice(at + 1).trim());
  }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function renewWeread() {
  try {
    const st = (await j("GET", "/api/v1/wx/weread"))?.data ?? {};
    const cookie = String(st.cookie ?? "").trim();
    if (!cookie) { console.log("[bridge] 微信读书续期跳过：无 Cookie"); return; }
    const res = await fetch("https://weread.qq.com/web/login/renewal", {
      method: "POST",
      headers: { "content-type": "application/json", cookie, referer: "https://weread.qq.com/web/reader/", "user-agent": WEREAD_UA },
      body: "{}",
    });
    const text = await res.text();
    const rotated = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
    const merged = mergeCookie(cookie, rotated);
    if (merged !== cookie) await j("POST", "/api/v1/wx/weread/cookie", { cookie: merged });
    const ok = res.ok && text.includes('"succ"');
    console.log(`[bridge] 微信读书续期：${ok ? "成功" : `异常 HTTP ${res.status}`}（${rotated.length ? "Cookie 已轮换并写回" : "本轮无轮换"}）`);
  } catch (e) {
    console.log("[bridge] 微信读书续期失败:", e.message);
  }
}

async function mps() {
  const out = [];
  for (let offset = 0; ; offset += 50) {
    const r = await j("GET", `/api/v1/wx/mps?limit=50&offset=${offset}`);
    const d = r?.data;
    const list = Array.isArray(d) ? d : d?.list ?? [];
    out.push(...list);
    if (list.length < 50) break;
  }
  return out;
}

async function push(sid, name, items) {
  const res = await fetch(INGEST, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ sourceId: `wemprss-${sid}`, sourceName: `${name}（公众号）`, items }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json).slice(0, 120)}`);
}

async function bodyOf(articleId) {
  try {
    const d = (await j("GET", `/api/v1/wx/articles/${encodeURIComponent(articleId)}`))?.data ?? {};
    const body = (d.content || "").trim();
    return body.length > 100 ? body.slice(0, 200_000) : null;
  } catch {
    return null;
  }
}

async function sync() {
  if (!token) { await login(); console.log("[bridge] 已登录 we-mp-rss"); }
  if (Date.now() - (state.__wereadRenewedAt ?? 0) >= WEREAD_RENEW_MIN * 60_000) {
    await renewWeread();
    state.__wereadRenewedAt = Date.now();
    writeFileSync(STATE_FILE, JSON.stringify(state));
  }
  const list = await mps();
  const noBody = (state.__noBody ?? {});
  let pushed = 0;

  for (const mp of list) {
    const sid = String(mp.id ?? "");
    if (!sid || !mp.mp_name) continue;
    let arts = [];
    try {
      const r = await j("GET", `/api/v1/wx/articles?mp_id=${encodeURIComponent(sid)}&limit=20`);
      const d = r?.data;
      arts = Array.isArray(d) ? d : d?.list ?? [];
    } catch (e) { console.log(`[bridge] 拉取 ${mp.mp_name} 失败: ${e.message}`); continue; }

    const last = state[sid] ?? 0;
    const firstImport = state[sid] === undefined;
    const fresh = arts
      .filter((a) => a.url && a.title)
      .map((a) => ({ ...a, t: Number(a.publish_time) > 1e12 ? Number(a.publish_time) : Number(a.publish_time) * 1000 }))
      .filter((a) => Number.isFinite(a.t) && a.t > last)
      .sort((a, b) => a.t - b.t);
    if (fresh.length === 0) continue;

    const items = [];
    for (const a of fresh) {
      const item = { title: a.title, url: a.url, publishedAt: new Date(a.t).toISOString() };
      if (a.description) item.summary = a.description;
      if (firstImport) item.raw = { _aihot: { backfill: true } }; // 首次导入的历史文章归档处理
      const body = a.has_content ? await bodyOf(a.id) : null;
      if (body) item.bodyText = body;
      else noBody[String(a.id)] = { sid, name: mp.mp_name, id: String(a.id), title: a.title, url: a.url, t: a.t, summary: item.summary ?? null };
      items.push(item);
      await new Promise((r) => setTimeout(r, 1500));
    }

    try {
      await push(sid, mp.mp_name, items);
      console.log(`[bridge] ${mp.mp_name}: 推送 ${items.length} 条${items.some((i) => i.bodyText) ? "（含正文）" : ""}`);
      state[sid] = fresh.at(-1).t;
      pushed += items.length;
    } catch (e) {
      console.log(`[bridge] 推送 ${mp.mp_name} 失败: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000)); // 避开推送接口限流
  }

  // 补推：之前没正文、现在抓到了的
  let backfilled = 0;
  for (const [id, rec] of Object.entries(noBody)) {
    const body = await bodyOf(rec.id);
    if (!body) continue;
    try {
      await push(rec.sid, rec.name, [{ title: rec.title, url: rec.url, publishedAt: new Date(rec.t).toISOString(), ...(rec.summary ? { summary: rec.summary } : {}), bodyText: body }]);
      delete noBody[id];
      backfilled += 1;
      console.log(`[bridge] 补正文: ${rec.title.slice(0, 24)}`);
    } catch (e) {
      console.log(`[bridge] 补推失败 ${rec.title.slice(0, 18)}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  state.__noBody = noBody;

  writeFileSync(STATE_FILE, JSON.stringify(state));
  console.log(`[bridge] 本轮完成：新推 ${pushed} 条，补正文 ${backfilled} 条`);
}

console.log(`[bridge] 启动：${BASE} → ${INGEST}，每 ${INTERVAL_MIN} 分钟一轮`);
sync().catch((e) => console.log("[bridge] 首轮失败:", e.message));
setInterval(() => sync().catch((e) => console.log("[bridge] 轮询失败:", e.message)), INTERVAL_MIN * 60_000);
