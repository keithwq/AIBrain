# PRD-v2: AI外脑 — 人格化AI专家对话系统

## 1. 产品概述

- **产品名称**：AI外脑
- **产品定位**：人格化AI专家对话系统
- **核心理念**：用户与具体专家（如"王志纲"）对话，不是与抽象的"AI"对话。每位专家拥有独立人格、知识体系和表达风格。
- **技术架构**：LLM + WIKI（预编译知识，不用RAG）

## 2. 技术栈

| 层级 | 技术选型 |
|------|----------|
| 后端 | Node.js + TypeScript + Express + Prisma |
| 前端 | React 18 + TypeScript + TailwindCSS + Vite |
| 数据库 | PostgreSQL |
| LLM | DeepSeek API |

## 3. MVP 功能

1. **简化认证** — 用户通过昵称快速登录，无需密码
2. **专家列表展示** — 展示8位专家，含头像、简介、擅长领域
3. **与专家多轮对话** — 选择专家后进入对话界面，支持连续对话
4. **配额限制** — 每位用户每天10次对话（不含历史消息）
5. **对话历史查看** — 查看历史对话记录及完整消息

## 4. 8个专家

| # | 专家 | 状态 | 领域 |
|---|------|------|------|
| 1 | 王志纲 | 已蒸馏 | 战略策划、城市运营 |
| 2 | 罗永浩 | 待蒸馏 | 创业、产品 |
| 3 | 张雪峰 | 待蒸馏 | 教育、职业规划 |
| 4 | 叶茂中 | 待蒸馏 | 营销、品牌 |
| 5 | 樊登 | 待蒸馏 | 读书、学习 |
| 6-8 | 待定 | 待蒸馏 | 待定 |

## 5. 专家知识库

- **位置**：默认随后端发布在 `backend/personas/`
- **外接覆盖**：如需使用独立知识库，可通过 `PERSONA_BASE_PATH` 指向同结构目录
- **格式**：每位专家一个子目录，包含 `SKILL.md` 文件
- **示例**：`wangzhigang-perspective\SKILL.md`
- **内容**：角色扮演规则、心智模型、决策启发式、表达DNA

### 系统提示词构建方式

将对应专家的 `SKILL.md` 内容作为 system prompt 前缀，拼接对话上下文发送给 LLM，无需向量检索。

## 6. 数据库设计

### users
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| nickname | VARCHAR(50) | 昵称 |
| daily_quota | INTEGER | 每日剩余配额，默认10 |
| created_at | TIMESTAMP | 创建时间 |

### conversations
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| expert_id | VARCHAR(50) | 专家标识 |
| title | VARCHAR(200) | 对话标题 |
| created_at | TIMESTAMP | 创建时间 |

### messages
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| conversation_id | UUID | 对话ID |
| role | VARCHAR(20) | user / assistant |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

### usage_logs
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 用户ID |
| expert_id | VARCHAR(50) | 专家标识 |
| created_at | TIMESTAMP | 创建时间 |

## 7. API接口设计

### 认证
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/auth/quick-login | 昵称登录，不存在则自动创建 |

### 专家
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/experts | 获取专家列表 |

### 对话
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/chat/conversations | 创建新对话 |
| GET | /api/v1/chat/conversations | 获取对话列表 |
| GET | /api/v1/chat/conversations/{id}/messages | 获取对话消息 |
| POST | /api/v1/chat/conversations/{id}/messages | 发送消息 |

### 配额
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/users/{user_id}/quota | 获取用户配额信息 |

## 8. 目录结构

```
AiBrain/
├── backend/
│   ├── personas/
│   │   └── {expert_id}-perspective/
│   │       └── SKILL.md
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/
│   ├── PRD-v2.md
│   └── plans/
│       └── implementation-plan.md
├── CLAUDE.md
└── AGENTS.md
```

## 9. 非功能需求

| 指标 | 目标 |
|------|------|
| API响应时间 | < 2秒（不含AI回复） |
| AI回复时间 | < 5秒 |
| 页面加载时间 | < 3秒 |

## 10. 关键约束

- 使用 **LLM + WIKI** 架构，预编译知识无需运行时检索
- **不**使用 RAG（检索增强生成）
- **不**使用向量数据库
- 专家 persona 信息从 `SKILL.md` 文件读取
