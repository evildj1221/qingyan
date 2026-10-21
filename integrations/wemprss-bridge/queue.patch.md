# we-mp-rss 采集队列双消费者补丁

we-mp-rss 的文章采集队列默认**单消费者**（一个线程逐个处理账号）。公众号数量多时（100+），全量轮巡一轮要 1-2 小时。

本补丁把消费者线程数参数化：`QUEUE_WORKERS=2` 即双通道并行，实测 130+ 账号全量采集从 1-2 小时缩到约 10 分钟。

## 原理

`core/queue/queue.py` 的 `run_tasks()` 是单消费者循环，启动处只起一个线程。补丁：
1. 启动处按 `QUEUE_WORKERS` 环境变量起 N 个消费者线程，错峰 30 秒启动（降低并发峰值）
2. 修改 `_is_running` 守卫，允许多个 worker 共存

## 使用

1. 把本目录的 `queue.py` 挂载覆盖容器内同名文件，并设置环境变量：

```yaml
services:
  we-mp-rss:
    environment:
      - QUEUE_WORKERS=2
    volumes:
      - ./patch/queue.py:/app/core/queue/queue.py:ro
```

2. `docker compose up -d` 重建生效。日志里能看到多个任务同时 "Task started"。

## 注意

- 并发走的是微信读书通道（同一 Cookie），**建议 ≤2**；更高并发会增加风控面
- 双 worker 下 `_current_task` 状态展示会交替显示两个任务（仅展示问题，不影响执行）
- we-mp-rss 的任务队列在内存中，容器重启会清空排队任务，需重新触发采集
