// feedback-notify：用户提交反馈后，汇总发邮件到站长邮箱。没有页面和接口，只有一个定时任务。
import { defineModule } from "@aihot/contracts/modules";

export default defineModule({ name: "feedback-notify" });
