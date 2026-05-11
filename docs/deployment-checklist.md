# 部署验收清单

## 目标状态

线上环境至少要保证四件事：

- 后端、前端、PostgreSQL 能稳定启动
- 后端能读取项目内 `backend/personas/*/SKILL.md`
- 登录、选专家、发消息、历史记录、配额扣减这条主链路可用
- 生产域名已经写入 `CORS_ORIGIN`

## 必填环境变量

后端：

    DATABASE_URL=postgresql://aibrain:aibrain@postgres:5432/aibrain?schema=public
    DEEPSEEK_API_KEY=你的 DeepSeek Key
    PORT=3001
    CORS_ORIGIN=https://你的前端域名

可选：

    PERSONA_BASE_PATH=/app/personas

默认已经读取镜像内 `/app/personas`，只有外接独立知识库时才需要改 `PERSONA_BASE_PATH`。

## 上线前检查

1. 启动服务：

        docker-compose up --build

2. 检查后端健康接口：

        http://服务器地址:3001/api/v1/health

3. 检查专家列表：

        http://服务器地址:3001/api/v1/experts

   每个已上线专家应返回 `has_skill: true`。

4. 前端主流程验收：

   登录 -> 选择专家 -> 发送消息 -> 收到 AI 回复 -> 返回专家页 -> 打开历史对话。

5. 配额验收：

   发送消息后剩余次数减少；配额为 0 时，前端禁止继续发送，后端拒绝继续扣费对话。

## 不允许上线的情况

- 后端启动依赖本机 `D:\WIKI` 路径
- Docker 镜像内缺少 `personas`
- `.env` 被打进镜像
- 没有配置生产 `CORS_ORIGIN`
- 没有配置 `DEEPSEEK_API_KEY` 却验收聊天主链路
