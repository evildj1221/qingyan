# 给 Agent 的说明

本项目「青砚」是 AIHOT 开源引擎的环保行业发行版。请先读 CLAUDE.md（项目结构、模块、补丁、运维要点），再按任务读 docs/ 与 README.md。

核心约束：
- 站名「青砚」，AIHOT 名字与 Logo 不得出现在访客可见处（LICENSE/NOTICE 署名除外）
- 分类体系 key 上线后不可改（industry/taxonomy.ts）
- 公众号采集走微信读书通道（weread），不要批量触发平台爬虫通道
- .env 与 .data/ 不入库；金标校准集保留私有
