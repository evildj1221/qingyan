# 待迁移测试（不参与 npm test）

分类体系切换为环保体系后，这些文件的罐头模型响应仍是 AI 示例数据，需要逐个迁移。

- 迁移清单与根因：https://github.com/evildj1221/qingyan/issues/1
- 方法：罐头响应的 category/tags/subjects 换成环保体系对应值（见 industry/taxonomy.ts），断言同步
- 迁移完成后移回 tests/ 即恢复参与测试
