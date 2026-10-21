// 竹叶笔触：分节标题旁的两三笔竹叶，颜色跟 currentColor（用 text-accent 等控制）。
export function BambooLeaves({ className = "" }: { className?: string }) {
  return (
    <svg width="68" height="20" viewBox="0 0 72 22" aria-hidden="true" className={className}>
      <path d="M2 16 Q 18 2 40 6 Q 22 10 5 18 Z" fill="currentColor" opacity=".75" />
      <path d="M8 19 Q 26 16 46 11 Q 27 19 10 21 Z" fill="currentColor" opacity=".45" />
      <path d="M30 16 Q 44 10 62 12 Q 46 15 32 18 Z" fill="currentColor" opacity=".6" />
    </svg>
  );
}
