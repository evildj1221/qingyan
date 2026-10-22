// ops-alert 后端：
// ① 每 30 分钟四项体检：收录停止（6h 无新文）/ 公众号通道停止（24h 无 wemprss 新文）/ AI 流水线积压 / 磁盘超 85%
//    —— 同一问题 12 小时内只提醒一次（状态表去重）。
// ② 每天 09:05 心跳摘要：过去 24h 收录、库存、积压、磁盘 —— 收得到心跳，说明告警系统本身活着（死信开关）。
// 邮件复用 NOTIFY_SMTP_* 配置；未配授权码时 dry-run 打日志。
import { statfs } from "node:fs/promises";
import nodemailer from "nodemailer";
import { credential } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";
import { SITE } from "@aihot/site";

const QUIET_HOURS = 6;      // 全站多少小时无新文算“停止收录”
const MP_QUIET_HOURS = 24;  // 公众号通道多少小时无新文算停摆（授权过期的典型症状）
const STUCK_LIMIT = 50;     // 编辑性信源中，3 小时以上无分析结果的积压上限
const DISK_PCT = 85;        // 磁盘使用率告警线
const RESEND_HOURS = 12;    // 同一告警的最小重复间隔

function smtp() {
  const user = credential("integrations", "NOTIFY_SMTP_USER") ?? "";
  const pass = credential("integrations", "NOTIFY_SMTP_PASS") ?? "";
  const host = credential("integrations", "NOTIFY_SMTP_HOST") ?? "smtp.qq.com";
  const port = Number(credential("integrations", "NOTIFY_SMTP_PORT") ?? 465);
  return { user, pass, host, port, to: credential("integrations", "NOTIFY_EMAIL_TO") ?? user, configured: Boolean(user && pass) };
}

async function sendMail(subject: string, text: string, html?: string): Promise<void> {
  const cfg = smtp();
  if (!cfg.configured) {
    console.log(`[ops-alert] dry-run（未配 SMTP）：${subject}\n${text}`);
    return;
  }
  const mailer = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass } });
  await mailer.sendMail({ from: `${SITE.name}运维 <${cfg.user}>`, to: cfg.to, subject, text, ...(html ? { html } : {}) });
}

/** 运维邮件的古籍风外壳：tone 用 "zhu"（告警，朱丝栏+朱印）或 "qing"（心跳，竹青报头+青印）。 */
function opsEmail(title: string, bodyHtml: string, tone: "zhu" | "qing"): string {
  const band = tone === "zhu" ? "#a83f39" : "#5f7f4e";
  const rule = tone === "zhu" ? "#c96f66" : "#5f7f4e";
  const ruleSoft = tone === "zhu" ? "#dea39b" : "#a9c9a0";
  const seal = tone === "zhu" ? "砚" : "青";
  return `<div style="background:#efe9d7;padding:24px 10px;font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;">
    <tr><td>
      <div style="background:${band};border-radius:6px 6px 0 0;padding:14px 24px;">
        <span style="font-family:'Kaiti SC','STKaiti',KaiTi,serif;font-size:19px;font-weight:700;color:#fdfaf1;letter-spacing:6px;">${title}</span>
        <span style="float:right;color:rgba(253,250,241,0.75);font-size:12px;padding-top:6px;">${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}</span>
      </div>
      <div style="background:#fbf7ec;border:1.5px solid ${rule};border-top:none;padding:20px 24px;">
        <div style="border:1px solid ${ruleSoft};padding:14px 18px;">
          <div style="font-size:13.5px;color:#23221d;line-height:2.0;">${bodyHtml}</div>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
          <tr>
            <td style="font-size:12px;color:#8b8577;font-family:'Kaiti SC','STKaiti',KaiTi,serif;letter-spacing:2px;">青砚运维 · ${tone === "zhu" ? "见字如面" : "研墨于此"}</td>
            <td align="right"><span style="display:inline-block;background:${band};color:#fdf8ec;padding:4px 8px;border-radius:3px;font-family:'Kaiti SC','STKaiti',KaiTi,serif;font-size:12px;font-weight:700;">${seal}</span></td>
          </tr>
        </table>
      </div>
    </td></tr>
  </table>
</div>`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>");

async function diskUsage(): Promise<number | null> {
  try {
    const s = await statfs("/data");
    if (!s.blocks) return null;
    return Math.round((1 - s.bfree / s.blocks) * 100);
  } catch {
    return null;
  }
}

// ── we-mp-rss 凭据健康探测 ──────────────────────────────────────────────────────────────
// 提前预警（区别于“停摆后才报”的通道告警）：读书 Cookie 失效=采集即将停摆（紧急）；
// 公众号平台 Token 失效=无法搜索添加新信源（不影响日常采集，但需要重新扫码）。
const WEMPRSS_BASE = process.env.OPS_WEMPRSS_BASE ?? "http://we-mp-rss:8001";
const WEMPRSS_USER = process.env.OPS_WEMPRSS_USER ?? "admin";
const WEMPRSS_PASS = process.env.OPS_WEMPRSS_PASS ?? "admin@123";

async function weMpCall(path: string, method: "GET" | "POST" = "GET", body?: unknown, token?: string): Promise<{ code?: number; data?: never } & Record<string, unknown>> {
  const res = await fetch(`${WEMPRSS_BASE}${path}`, {
    method,
    headers: { "content-type": method === "POST" && body ? "application/json" : "application/x-www-form-urlencoded", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: method === "POST" && body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as { code?: number; data?: unknown };
  if (json.code !== 0) throw new Error(`${path} code=${json.code}`);
  return json as never;
}

/** 读书 Cookie 健康探测：走采集主链路验证凭据（轻量）。异常 = Cookie 失效，采集即将停摆。 */
async function wereadCookieAlive(): Promise<boolean> {
  const login = (await fetch(`${WEMPRSS_BASE}/api/v1/wx/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: WEMPRSS_USER, password: WEMPRSS_PASS }),
    signal: AbortSignal.timeout(15_000),
  }).then((r) => r.json())) as { data?: { access_token?: string } };
  const token = login?.data?.access_token ?? "";
  if (!token) throw new Error("we-mp-rss 登录失败");
  // 探测走采集主链路（/weread/mp/test → /api/mp/cover）。书架接口（/web/shelf/sync）是
  // 旧接口，易被微信读书风控误伤且与采集可用性无关，曾造成大量"Cookie 已失效"误报。
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt += 1) {
    ok = await weMpCall("/api/v1/wx/weread/mp/test", "POST", {}, token).then(() => true, () => false);
    if (!ok && attempt === 0) await new Promise((r) => setTimeout(r, 3000));
  }
  return ok;
}

/** 公众号平台 Token 健康探测：每日一次，搜一个已知存在的号。空结果 = Token 过期（影响添加新信源）。 */
async function platformTokenAlive(): Promise<boolean> {
  const login = (await fetch(`${WEMPRSS_BASE}/api/v1/wx/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: WEMPRSS_USER, password: WEMPRSS_PASS }),
    signal: AbortSignal.timeout(15_000),
  }).then((r) => r.json())) as { data?: { access_token?: string } };
  const token = login?.data?.access_token ?? "";
  if (!token) throw new Error("we-mp-rss 登录失败");
  const res = await fetch(`${WEMPRSS_BASE}/api/v1/wx/mps/search/${encodeURIComponent("生态环境部")}`, {
    headers: { authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(30_000),
  }).then((r) => r.json()) as { data?: { list?: unknown[] } };
  return ((res?.data?.list as unknown[]) ?? []).length > 0;
}

async function runChecks(): Promise<{ fired: number }> {
  const [r] = await sql<{ n: number }[]>`
    SELECT count(*) AS n FROM articles WHERE timeline_at > now() - (${QUIET_HOURS} || ' hours')::interval AND backfill = false`;
  const [m] = await sql<{ n: number }[]>`
    SELECT count(*) AS n FROM articles a JOIN sources s ON s.id = a.source_id
    WHERE s.id LIKE 'wemprss-%' AND a.timeline_at > now() - (${MP_QUIET_HOURS} || ' hours')::interval AND a.backfill = false`;
  const [s] = await sql<{ n: number }[]>`
    SELECT count(*) AS n FROM articles a JOIN sources s ON s.id = a.source_id
    WHERE s.participation_mode = 'editorial' AND a.discovered_at < now() - interval '3 hours'
      AND NOT EXISTS (SELECT 1 FROM analyses x WHERE x.article_id = a.id)`;
  const disk = await diskUsage();

  const findings: Array<{ key: string; subject: string; text: string }> = [];
  if (Number(r.n) === 0) findings.push({ key: "quiet", subject: `⚠️ ${SITE.name}：收录停止 ${QUIET_HOURS} 小时`, text: `过去 ${QUIET_HOURS} 小时没有任何新文章入库。\n可能原因：采集任务停止（docker compose logs worker）、数据库问题、或全部信源失败。\n检查：后台“运行”页与“信源”页。` });
  if (Number(m.n) === 0) findings.push({ key: "mp-quiet", subject: `⚠️ ${SITE.name}：公众号通道 ${MP_QUIET_HOURS} 小时无新文`, text: `wemprss 信源过去 ${MP_QUIET_HOURS} 小时零产出。\n最常见原因：we-mp-rss 的公众号平台授权或微信读书 Cookie 过期，需要重新扫码。\n检查：we-mp-rss 面板（8001 端口）的登录与采集状态。` });
  if (Number(s.n) > STUCK_LIMIT) findings.push({ key: "stuck", subject: `⚠️ ${SITE.name}：AI 流水线积压 ${s.n} 条`, text: `${s.n} 条文章超过 3 小时没有分析结果（阈值 ${STUCK_LIMIT}）。\n可能原因：模型额度或预算熔断、模型服务故障。\n检查：后台“模型与评测”页的成功率与用量。` });
  if (disk !== null && disk >= DISK_PCT) findings.push({ key: "disk", subject: `⚠️ ${SITE.name}：磁盘使用率 ${disk}%`, text: `数据卷使用率已达 ${disk}%（阈值 ${DISK_PCT}%）。\n检查：docker system df、图片缓存与备份文件，及时清理或扩容。` });
  // 凭据健康提前预警：读书 Cookie 失效（采集将停摆）/ 平台 Token 失效（无法搜索加新源）
  try {
    if (!(await wereadCookieAlive())) {
      findings.push({ key: "weread-cookie", subject: `🚨 ${SITE.name}：微信读书 Cookie 已失效`, text: `公众号采集的读书 Cookie 已失效，公众号通道即将停摆。\n解决：打开 we-mp-rss 面板 → 微信读书授权 → 重新扫码（约 30 秒）。` });
    }
  } catch (e) {
    console.log(`[ops-alert] 读书 Cookie 探测失败: ${String(e).slice(0, 80)}`);
  }
  if (process.env.OPS_PROBE_MP_TOKEN === "1") {
    try {
      if (!(await platformTokenAlive())) {
        findings.push({ key: "mp-token", subject: `⚠️ ${SITE.name}：公众号平台授权已过期`, text: `公众号平台的登录 Token 已失效——日常采集不受影响，但无法搜索添加新的公众号信源。\n解决：打开 we-mp-rss 面板 → 公众号授权 → 重新扫码（约 30 秒）。` });
      }
    } catch (e) {
      console.log(`[ops-alert] 平台 Token 探测失败: ${String(e).slice(0, 80)}`);
    }
  }

  // 引擎告警兜底：引擎自身的告警（日报缺口、备份滞后、模型熔断等）只发飞书——未配飞书时全部静默。
  // alerts.state 里的条目即"仍在生效"的引擎告警（恢复时会被移除），转成邮件，12h 去重同其余体检项。
  try {
    const [row] = await sql<{ value: Record<string, { title?: string; since?: string }> }[]>`SELECT value FROM settings WHERE key = 'alerts.state'`;
    for (const [key, alert] of Object.entries(row?.value ?? {})) {
      if (!alert?.title) continue;
      const since = Date.parse(alert.since ?? "");
      findings.push({
        key: `engine:${key}`,
        subject: `⚠️ ${SITE.name}：${alert.title}`,
        text: `引擎告警（只发飞书，此处为邮件兜底）${Number.isFinite(since) ? `，自 ${new Date(since).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })} 起` : ""}。\n详见后台"运行"页与引擎日志。`,
      });
    }
  } catch (e) {
    console.log(`[ops-alert] 引擎告警读取失败: ${String(e).slice(0, 80)}`);
  }

  await sql`INSERT INTO ops_alert_state (singleton) VALUES (true) ON CONFLICT DO NOTHING`;
  const [state] = await sql<{ last_sent: Record<string, string> }[]>`SELECT last_sent FROM ops_alert_state WHERE singleton`;
  const last = state?.last_sent ?? {};
  const now = Date.now();
  let fired = 0;
  for (const f of findings) {
    const prev = last[f.key] ? Date.parse(last[f.key]) : 0;
    if (Number.isFinite(prev) && now - prev < RESEND_HOURS * 3600_000) continue;
    await sendMail(f.subject, f.text);
    last[f.key] = new Date(now).toISOString();
    fired += 1;
    console.log(`[ops-alert] 已告警 ${f.key}: ${f.subject}`);
  }
  if (fired > 0) await sql`UPDATE ops_alert_state SET last_sent = ${sql.json(last)}, updated_at = now() WHERE singleton`;
  return { fired };
}

async function heartbeat(): Promise<void> {
  const [d] = await sql<{ day: number; total: number; pending: number; sources: number }[]>`
    SELECT
      (SELECT count(*) FROM articles WHERE timeline_at > now() - interval '24 hours' AND backfill = false)::int AS day,
      (SELECT count(*) FROM articles)::int AS total,
      (SELECT count(*) FROM articles a JOIN sources s ON s.id = a.source_id WHERE s.participation_mode = 'editorial' AND a.discovered_at < now() - interval '3 hours' AND NOT EXISTS (SELECT 1 FROM analyses x WHERE x.article_id = a.id))::int AS pending,
      (SELECT count(*) FROM sources WHERE enabled)::int AS sources`;
  const disk = await diskUsage();
  const hb = `<p style="margin:0 0 8px;">过去 24 小时新收录 <strong style="color:#33766a;font-size:16px;">${d.day}</strong> 条，库存共 <strong>${d.total}</strong> 条，启用信源 ${d.sources} 个。</p>
    <p style="margin:0 0 8px;">待处理积压 <strong>${d.pending}</strong> 条。磁盘使用 ${disk ?? "?"}%。</p>
    <p style="margin:0;color:#8b8577;font-size:12.5px;">收到这封心跳，说明告警系统正常——无需回复。</p>`;
  const hbText = `过去 24 小时：新收录 ${d.day} 条（库存共 ${d.total} 条，启用信源 ${d.sources} 个）。
待处理积压 ${d.pending} 条。磁盘使用 ${disk ?? "?"}%。

——收到这封邮件说明告警系统正常；无需回复。`;
  await sendMail(`✅ ${SITE.name}运维心跳`, hbText, opsEmail(`${SITE.name}运维心跳`, hb, "qing"));
}

export const OPS_ALERT_MODULE = defineServerModule({
  name: "ops-alert",
  schedules: [
    { name: "ops-alert.check", cron: "*/30 * * * *", run: runChecks },
    { name: "ops-alert.heartbeat", cron: "5 9 * * *", run: heartbeat },
  ],
});
