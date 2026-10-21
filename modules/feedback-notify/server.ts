// feedback-notify：每 2 分钟查一次反馈表，把新反馈汇总成一封邮件发给站长。
// 没配 SMTP 授权码（NOTIFY_SMTP_PASS）时以 dry-run 运行：只把要发的内容打进日志，不发信。
import nodemailer from "nodemailer";
import { credential } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineServerModule } from "@aihot/backend/modules";
import { SITE } from "@aihot/site";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  to: string;
  configured: boolean;
}

function smtpConfig(): SmtpConfig {
  const user = credential("integrations", "NOTIFY_SMTP_USER") ?? "";
  const pass = credential("integrations", "NOTIFY_SMTP_PASS") ?? "";
  const host = credential("integrations", "NOTIFY_SMTP_HOST") ?? "smtp.qq.com";
  const port = Number(credential("integrations", "NOTIFY_SMTP_PORT") ?? 465);
  const to = credential("integrations", "NOTIFY_EMAIL_TO") ?? user;
  return { host, port, user, pass, to, configured: Boolean(user && pass) };
}

async function sendDigest(rows: Array<{ id: number; content: string; email: string | null; page_url: string | null; created_at: Date }>, cfg: SmtpConfig): Promise<void> {
  const subject = `${SITE.name}新反馈（${rows.length} 条）`;
  const text = rows
    .map((r) => `#${r.id} ${new Date(r.created_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}\n${r.email ? `邮箱：${r.email}\n` : ""}${r.page_url ? `页面：${r.page_url}\n` : ""}\n${r.content}`)
    .join("\n\n————\n\n");
  if (!cfg.configured) {
    console.log(`[feedback-notify] dry-run（未配 NOTIFY_SMTP_PASS）：${subject}\n${text}`);
    return;
  }
  const mailer = nodemailer.createTransport({ host: cfg.host, port: cfg.port, secure: cfg.port === 465, auth: { user: cfg.user, pass: cfg.pass } });
  await mailer.sendMail({
    from: `${SITE.name} <${cfg.user}>`,
    to: cfg.to,
    subject,
    text,
  });
}

async function poll(): Promise<{ notified: number }> {
  // 游标：上次已通知的最大反馈 id。首次运行从当前最大值起，只通知今后的新反馈。
  const [state] = await sql<{ last_feedback_id: bigint }[]>`SELECT last_feedback_id FROM feedback_notify_state WHERE singleton`;
  let last: number;
  if (state) {
    last = Number(state.last_feedback_id);
  } else {
    const [mx] = await sql<{ max: number }[]>`SELECT coalesce(max(id), 0) AS max FROM feedback`;
    last = mx.max;
    await sql`INSERT INTO feedback_notify_state (singleton, last_feedback_id) VALUES (true, ${last}) ON CONFLICT DO NOTHING`;
  }
  const rows = await sql<{ id: number; content: string; email: string | null; page_url: string | null; created_at: Date }[]>`
    SELECT id, content, email, page_url, created_at FROM feedback WHERE id > ${last} ORDER BY id LIMIT 20`;
  if (rows.length === 0) return { notified: 0 };
  await sendDigest(rows, smtpConfig());
  // 发送成功才推进游标：失败抛错时下轮重发这批（邮件偶发重复可接受，丢通知不可接受）。
  await sql`UPDATE feedback_notify_state SET last_feedback_id = ${rows.at(-1)!.id}, updated_at = now() WHERE singleton`;
  return { notified: rows.length };
}

export const FEEDBACK_NOTIFY_MODULE = defineServerModule({
  name: "feedback-notify",
  schedules: [
    {
      name: "feedback-notify.poll",
      cron: "*/2 * * * *",
      run: poll,
    },
  ],
});
