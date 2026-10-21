// standard-countdown 的网页插口：侧栏「订阅」分组里的「标准倒计时」入口。
import type { ReactNode } from "react";
import { defineWebModule } from "@aihot/web/modules";

const IconClock = ({ size = 18 }: { size?: number }): ReactNode => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </svg>
);

export default defineWebModule({
  name: "standard-countdown",
  sidebar: {
    section: "订阅",
    items: [{ to: "/standards", label: "标准倒计时", icon: IconClock }],
  },
});
