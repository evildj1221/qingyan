// /digest：读者订阅每日环保日报的页面。
import { useState } from "react";
import { SITE } from "@aihot/site";

export default function DigestPage() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error ?? "提交失败");
      setState("sent");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "提交失败");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-5 py-14">
      {/* 报头：楷体标题 + 竹青底线，似古籍题签 */}
      <div className="border-b-[3px] border-accent pb-4">
        <h1 className="font-kai text-[30px] font-bold tracking-[0.08em] text-ink">
          邮件订阅<span className="text-accent"> · </span>{SITE.subject}日报
        </h1>
        <p className="mt-2 font-kai text-[13px] tracking-[0.3em] text-ink-4">研环保之墨 · 见行业之先</p>
      </div>

      {/* 朱丝栏内容格 */}
      <div className="relative mt-6 rounded-[4px] border-[1.5px] border-[var(--zhu-rule)] p-5 outline outline-1 outline-offset-[3px] outline-[var(--zhu-rule-soft)]">
        <p className="text-[14.5px] leading-[1.9] text-ink-2">
          每天早上 <span className="font-semibold text-accent-ink">08:10</span>，把当日环保与双碳要闻——
          <span className="text-ink">政策、标准、处罚、名单、督察</span>——汇总成一封古籍样式的邮件发给你。
          先发确认邮件到你的邮箱，点击其中的链接即完成订阅；邮件尾部随时可退订。
        </p>
        {state === "sent" ? (
          <div className="mt-5 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[14px] text-accent-ink">
            确认邮件已钤印发出——请到你的邮箱（含垃圾邮件夹）点击「确认订阅」。
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 flex gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="你的邮箱地址"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={state === "sending"}
              className="shrink-0 rounded-lg bg-accent px-6 py-2.5 font-kai text-[15px] font-bold text-accent-contrast disabled:opacity-60"
            >
              {state === "sending" ? "呈递中…" : "订 阅"}
            </button>
          </form>
        )}
        {state === "error" && <p className="mt-3 text-[13px] text-hot">{error}</p>}
      </div>

      <p className="mt-6 text-[12.5px] leading-[1.8] text-ink-4">
        更适合程序员的姿势：日报同样提供 <a href="/agent" className="text-accent hover:underline">RSS 与 API</a>；
        新标准发布还可在 <a href="/standards" className="text-accent hover:underline">标准倒计时</a> 页追踪施行日期。
      </p>
    </main>
  );
}
