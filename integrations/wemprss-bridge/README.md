# 微信公众号免费采集桥（we-mp-rss → 引擎）

零 API 费用采集微信公众号的完整方案：**we-mp-rss**（自托管采集器）负责抓取，**推送桥**把带正文的文章推进引擎的 ingest 接口，走同一套判重/预筛/评分/归组流水线。

> 原理：基于微信读书的公众号订阅接口采集（正常阅读行为），**不调用任何按次付费的数据服务**。成本 = 一台跑 Docker 的机器 + 几周一次的扫码续期。

## 架构

```
微信（扫码授权 ×2：公众号平台 + 微信读书）
  ↓
we-mp-rss（每 2 小时全量轮巡，读书通道，串行温和不限流）
  ↓ 每 10 分钟
推送桥 bridge.mjs（带正文、游标断点、__noBody 补推）
  ↓ Bearer INGEST_TOKEN
引擎 /api/ingest/items → 判重 → 预筛 → 评分 → 精选/日报
```

## 部署步骤

### 1. 部署 we-mp-rss（采集器）

```yaml
services:
  we-mp-rss:
    image: ghcr.io/rachelos/we-mp-rss:latest
    container_name: we-mp-rss
    restart: unless-stopped
    ports: ["8001:8001"]
    environment:
      - TZ=Asia/Shanghai
    volumes: ["./data:/app/data"]
    networks: [default, aihot_default]
  wemprss-bridge:
    image: node:24-trixie-slim
    container_name: wemprss-bridge
    restart: unless-stopped
    working_dir: /app/bridge
    command: node bridge.mjs
    environment:
      - WEMPRSS_BASE=http://we-mp-rss:8001
      - WEMPRSS_USER=admin
      - WEMPRSS_PASS=<面板密码>
      - AIHOT_INGEST=http://api:3001/api/ingest/items
      - INGEST_TOKEN=<与引擎 .env 的 INGEST_TOKEN 一致>
      - INTERVAL_MIN=10
    volumes: ["./bridge:/app/bridge"]
    networks: [default, aihot_default]

networks:
  aihot_default:
    external: true   # 引擎 compose 网络名字（docker network ls 查看）
```

### 2. 引擎侧开启推送接口

引擎 `.env` 里设置 `INGEST_TOKEN`（≥16 位随机字符），`docker compose up -d` 生效。

### 3. 授权与订阅

1. 打开 we-mp-rss 面板（8001 端口）→ 微信读书授权 → 微信扫码
2. 面板 → 公众号平台授权 → 用公众号管理员微信扫码（**搜索新号依赖它，约 4 天有效**，过期重新扫即可）
3. 面板里搜索并订阅目标公众号；或建一个定时任务（cron `0 */2 * * *`）全量轮巡

### 4.（可选）双消费者并发

we-mp-rss 采集队列默认单线程。本仓库 `integrations/wemprss-bridge/` 同目录提供 `queue.patch.md` 说明如何用挂载补丁开启双消费者（130+ 号全量采集从 1-2 小时缩到 ~10 分钟）。

## 维护预期（诚实版）

| 事项 | 频率 | 方式 |
|---|---|---|
| 公众号平台 Token 续期 | ~4 天 | 面板重新扫码 30 秒（只影响搜索加新号，不影响采集）；配合运维告警邮件的提前预警 |
| 微信读书 Cookie 续期 | 数周 | 同上；日常采集活动会自动续期 |
| 无正文文章 | ~8% | 微信部分页面是 JS 空壳，无法取正文，仅标题展示 |

不想维护可随时切换到按次付费的商业数据服务（引擎原生支持 `mp_account` 信源 + 预算熔断）。

## 文件说明

- `bridge.mjs`：推送桥本体（登录 → 拉文章 → 取正文 → 推送 → 游标落盘）
- 首次导入的历史文章自动带 `_aihot.backfill` 标记归档，不会刷屏
- 已推送但后来才拿到正文的文章，进入 `__noBody` 队列自动补推（引擎出修订版）
