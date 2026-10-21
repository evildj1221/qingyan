// digest-subscribe 的网页插口：侧栏「订阅」分组里的「邮件日报」入口。
import type { ReactNode } from "react";
import { defineWebModule } from "@aihot/web/modules";

const IconMail = ({ size = 18 }: { size?: number }): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 7L22 7" />
  </svg>
);

export default defineWebModule({
  name: "digest-subscribe",
  sidebar: {
    section: "订阅",
    items: [{ to: "/digest", label: "邮件日报", icon: IconMail }],
  },
});
