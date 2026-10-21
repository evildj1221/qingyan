# 发版检查单（Release Checklist）

> 每次对外发布新版本时照此勾选。版本号遵循 SemVer：新功能进第二位（v0.2.0）、修复进第三位（v0.1.1）、破坏性变更进第一位（v1.0.0）。

## 一、发布前验证

- [ ] `npm run typecheck` 零错误
- [ ] `npm test` 通过（CI 同款检查，红叉会挂在仓库首页）
- [ ] 本地 `docker compose up -d --build` 起得来，首页/日报/管理后台人工过一遍
- [ ] `node scripts/smoke.ts --base http://localhost:3000` 全绿

## 二、版本三同步（缺一即不同步）

- [ ] `site/changelog.json` 顶部加本版条目（读者可见的更新日志）
- [ ] `git commit` 信息概括本版全部改动
- [ ] `git tag vX.Y.Z && git push --tags`

## 三、GitHub Release

- [ ] 基于 tag 创建 Release，说明粘贴 changelog 对应条目
- [ ] 破坏性变更（改配置格式/删功能/需要手动操作）必须在说明的**最顶部**标出

## 四、服务器部署

- [ ] 服务器 `git pull`
- [ ] `.env` 对照 `.env.example`：新增的环境变量已补（**密钥值只在服务器的 .env，永不入库**）
- [ ] `docker compose up -d --build`
- [ ] `node scripts/smoke.ts --base https://qingyannews.cn` + 首页/日报人工抽查

## 五、上游同步（每月一次）

- [ ] 看 [AIHOT Releases](https://github.com/KKKKhazix/AIHOT/releases)：有想要的改进 → `git cherry-pick` 摘取
- [ ] 冲突高发区（本项目改过的 4 个文件）：extract.ts（wechatBody/pageFetchable）、ingest/items.ts（bodyText）、eval-selection.ts（evalOutcome）、docker-compose.yml（NPM_REGISTRY）
- [ ] 合并后完整跑一遍第一节的验证
