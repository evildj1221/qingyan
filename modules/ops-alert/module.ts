// ops-alert：纯后端运维告警（无页面）。定时检查采集/流水线/磁盘/公众号通道，出问题发邮件；每天一封心跳摘要。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({ name: "ops-alert" });
