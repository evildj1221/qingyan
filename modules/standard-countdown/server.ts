// standard-countdown 后端：每天扫一遍近 90 天的标准类文章，从标题/摘要/正文里抽标准号与施行日期入库；
// /api/standards/list 给页面数据。只收未来 400 天内（或刚实施 14 天内）的标准，页面按天数排列。
import type { FastifyInstance } from "fastify";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";

const STD_NO = /((?:GB|HJ|DB|CJ|SL|YS|JT|AQ|HY|LY)[A-Z]{0,3}(?:\/[A-Z])?\s?\d{2,6}(?:\.\d{1,3})?(?:\s?[—\-–]\d{2,5})?|T\/[A-Z]{2,12}(?:-[A-Z0-9]+)?\s?\d{2,5}(?:\s?[—\-–]\d{4})?)/;
const DATE_PATTERNS = [
  /(?:自|于)\s*(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:起)?\s*(?:起)?(?:正式)?(?:施行|实施|执行|生效)/,
  /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日(?:起)?(?:正式)?(?:施行|实施|执行|生效)/,
  /施行[（(]日期[）)]?[：:]\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/,
];

function extractDate(text: string): string | null {
  for (const re of DATE_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      if (y > 2020 && y < 2100 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }
  return null;
}

async function scan(): Promise<{ kept: number }> {
  const rows = await sql<{ id: string; title: string; title_zh: string | null; summary: string | null; body: string | null; source_name: string }[]>`
    SELECT a.id, a.title, an.title_zh, an.summary_zh AS summary, a.body_text AS body, s.name AS source_name
    FROM articles a
    JOIN sources s ON s.id = a.source_id
    JOIN LATERAL (SELECT category, title_zh, summary_zh FROM analyses x WHERE x.article_id = a.id ORDER BY x.id DESC LIMIT 1) an ON an.category = 'standard'
    WHERE a.published_at > now() - interval '90 days'`;
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const horizon = new Date(today.getTime() + 400 * 86400_000);
  const recent = new Date(today.getTime() - 14 * 86400_000);
  let kept = 0;
  for (const r of rows) {
    const haystack = `${r.title}\n${r.title_zh ?? ""}\n${r.summary ?? ""}\n${(r.body ?? "").slice(0, 4000)}`;
    const std = STD_NO.exec(haystack)?.[0]?.replace(/\s+/g, " ").trim();
    if (!std) continue;
    const date = extractDate(haystack);
    if (!date) continue;
    if (date > iso(horizon) || date < iso(recent)) continue;
    await sql`INSERT INTO standard_countdown (stdno, title, effective_date, item_id, source_name, updated_at)
      VALUES (${std}, ${r.title_zh || r.title}, ${date}, ${r.id}, ${r.source_name}, now())
      ON CONFLICT (stdno) DO UPDATE SET title = EXCLUDED.title, effective_date = EXCLUDED.effective_date, item_id = EXCLUDED.item_id, source_name = EXCLUDED.source_name, updated_at = now()`;
    kept += 1;
  }
  // 清掉已过期超过 14 天的
  await sql`DELETE FROM standard_countdown WHERE effective_date < ${iso(recent)}`;
  return { kept };
}

interface Row {
  stdno: string;
  title: string;
  effective_date: string;
  item_id: string | null;
  source_name: string | null;
  days: number;
}

export const STANDARD_COUNTDOWN_MODULE = defineServerModule({
  name: "standard-countdown",
  http: (app: FastifyInstance) => {
    app.get("/api/standards/list", async (_req, reply) => {
      const rows = await sql<Row[]>`
        SELECT stdno, title, to_char(effective_date, 'YYYY-MM-DD') AS effective_date, item_id, source_name,
          (effective_date - current_date) AS days
        FROM standard_countdown ORDER BY effective_date ASC LIMIT 100`;
      return reply.header("cache-control", "public, max-age=300").header("content-type", "application/json").send({ items: rows });
    });
  },
  schedules: [
    { name: "standard-countdown.scan", cron: "30 4 * * *", run: scan },
  ],
});
