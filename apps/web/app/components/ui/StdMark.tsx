// 标题里的标准号（GB、HJ、DB、T/ 团标）用朱色等宽字突出：是"标准库转链"的视觉锚点，
// 以后标准号可点击跳官方全文平台。
import type { ReactNode } from "react";

/** 标准号的常见写法：GB 12345—2026、GB/T 24001、HJ 91.2—2025、DB43/T 555、T/CECA-G 0203。 */
const STD_NO =
  /((?:GB|HJ|DB|CJ|SL|YS|JT|AQ|HY|LY)[A-Z]{0,3}(?:\/[A-Z])?\s?\d{2,6}(?:\.\d{1,3})?(?:\s?[—\-–]\d{2,5})?|T\/[A-Z]{2,12}(?:-[A-Z0-9]+)?\s?\d{2,5}(?:\s?[—\-–]\d{4})?)/g;

/** 把标题拆成普通文字与标准号，标准号包上朱色等宽 span。 */
export function stdMark(title: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of title.matchAll(STD_NO)) {
    const i = m.index ?? 0;
    if (i > last) out.push(title.slice(last, i));
    out.push(
      <span key={`std-${i}`} className="mono text-[0.92em] font-medium text-hot">
        {m[0]}
      </span>,
    );
    last = i + m[0].length;
  }
  if (last < title.length) out.push(title.slice(last));
  return out;
}
