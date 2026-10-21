// /standards：标准实施倒计时页。
import { useEffect, useState } from "react";
import { SITE } from "@aihot/site";

interface Row {
  stdno: string;
  title: string;
  effective_date: string;
  item_id: string | null;
  source_name: string | null;
  days: number;
}

function daysLabel(days: number): { text: string; tone: "hot" | "amber" | "ok" } {
  if (days === 0) return { text: "今日实施", tone: "hot" };
  if (days < 0) return { text: `已实施 ${-days} 天`, tone: "ok" };
  if (days <= 7) return { text: `还有 ${days} 天`, tone: "hot" };
  if (days <= 30) return { text: `还有 ${days} 天`, tone: "amber" };
  return { text: `还有 ${days} 天`, tone: "ok" };
}

export default function StandardsPage() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetch("/api/standards/list")
      .then((r) => r.json())
      .then((d: { items: Row[] }) => setRows(d.items))
      .catch(() => setRows([]));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-[28px] font-bold tracking-[0.04em] text-ink">标准实施倒计时</h1>
      <p className="mt-3 text-[14.5px] leading-[1.8] text-ink-3">
        新发布的环境标准什么时候正式生效？按施行日期从近到远排列，7 天内的标红提醒。数据来自{SITE.name}收录的标准类资讯，自动抽取标准号与施行日期。
      </p>
      {rows === null ? (
        <p className="mt-10 text-[14px] text-ink-4">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-line bg-surface px-5 py-6 text-center text-[14px] text-ink-3">
          暂无收录中的标准。有新标准发布并公布施行日期后，会自动出现在这里。
        </p>
      ) : (
        <ul className="mt-8">
          {rows.map((r) => {
            const d = daysLabel(r.days);
            return (
              <li key={r.stdno} className="border-b border-line py-4">
                <div className="flex items-baseline gap-3">
                  <span className="mono shrink-0 text-[13.5px] font-semibold text-hot">{r.stdno}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-[1.5] text-ink">
                    {r.item_id ? <a href={`/items/${r.item_id}`} className="transition-colors hover:text-accent">{r.title}</a> : r.title}
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${d.tone === "hot" ? "bg-hot-soft text-hot" : d.tone === "amber" ? "bg-amber-soft text-amber-ink" : "bg-ok-soft text-ok-ink"}`}>
                    {d.text}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-4">
                  施行日期 {r.effective_date}{r.source_name ? ` · 来源：${r.source_name}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
