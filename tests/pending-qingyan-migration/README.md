# 待迁移测试（不参与 npm test）

分类体系切换为环保体系后，这批测试的罐头夹具需逐个迁移。迁移进度见 issue #1：

- ✅ 已迁移并通过（11 个文件）：analyze*.test.ts ×5、content-publication、default-model、processing-recovery、public-cache、reading、search-sharing
- ⏳ 本目录待迁移（8 个文件）：category-corrections（RELEASE 标签语义）、discovery-scope、independent-selected、pool-relevance（实体别名搜索）、topic-cache-deadline、topic-membership、topics-withdrawal（撤回/缓存语义）、topics（主题归属的“关于 vs 提及”语义）

迁移要点：罐头响应的 category/tags/subjects/itemType 换成环保体系值（见 industry/taxonomy.ts）；测试若用“两个不同实体验证 about vs mention”，须保留实体区分（不要让标题点名的实体与主体实体相同）；主题 slug 用 industry/topics.json 的真实 slug；测试间共享数据库，主题/实体需互不撞车。迁移完成后移回 tests/ 恢复参与测试。
