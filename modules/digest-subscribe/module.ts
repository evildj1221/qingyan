// digest-subscribe：读者邮件订阅每日环保日报。页面 /digest 留邮箱，确认后每天 08:10 收到日报。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "digest-subscribe",
  pages: [{ path: "digest", file: "page.tsx" }],
  apiPaths: [/^\/api\/digest\//, /^\/digest\/(confirm|unsubscribe)$/],
});
