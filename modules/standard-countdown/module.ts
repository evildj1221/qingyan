// standard-countdown：标准实施倒计时。扫描标准类文章，抽出标准号和施行日期，/standards 页按倒计时排列。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({
  name: "standard-countdown",
  pages: [{ path: "standards", file: "page.tsx" }],
  apiPaths: [/^\/api\/standards\//],
});
