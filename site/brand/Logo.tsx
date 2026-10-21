// 站点的字标、圆环标记和朱砂印：页面用 Wordmark 画站名（size 是高度，单位像素），RingMark 是小标记，
// 转起来就是加载动画，Seal 是「砚」字朱砂印，用在报头落款等处。
// 站名用楷体书法字排（font-kai）；有自己的 Logo 时，把 Wordmark 换成你的 SVG（保持同样的参数）。
import { SITE } from "../site.ts";

export function Wordmark({ size = 24, className = "", title = SITE.name }: { size?: number; className?: string; title?: string }) {
  return (
    <span className={`inline-flex items-center font-kai font-bold leading-none tracking-[0.06em] ${className}`} style={{ fontSize: Math.round(size * 0.92) }} aria-label={title} role="img">
      <span aria-hidden="true" className="mr-[0.3em] inline-block size-[0.42em] rounded-full bg-accent" />
      <span aria-hidden="true">{SITE.name}</span>
    </span>
  );
}

/** A ring with a dot; spinning, it is the loader. */
export function RingMark({ className = "", spinning = false }: { className?: string; spinning?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g style={spinning ? { transformOrigin: "12px 12px", animation: "spin-slow 1.1s linear infinite" } : undefined}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="42 15" />
      </g>
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

/** 「砚」字朱砂印：红底白字、微微歪斜，像钤在纸上的印。 */
export function Seal({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[22%] font-kai font-bold text-[#fdf8ec] shadow-[inset_0_1px_0_rgba(0,0,0,0.18)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.56), background: "var(--hot)", transform: "rotate(-2.5deg)" }}
      aria-hidden="true"
    >
      砚
    </span>
  );
}
