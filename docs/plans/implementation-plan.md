# 实施计划

## 阶段一：项目脚手架与基础设施

### 任务 1.1 初始化后端项目
- [ ] 创建 `backend/` 目录及 `package.json`
- [ ] 安装依赖：express, prisma, typescript, ts-node, cors, dotenv
- [ ] 配置 `tsconfig.json`（target ES2020, strict mode）
- [ ] 配置 `.env` 文件（DATABASE_URL, DEEPSEEK_API_KEY, PORT）
- [ ] 配置 Prisma schema（4张表）
- [ ] 运行 `prisma migrate` 生成初始迁移

### 任务 1.2 初始化前端项目
- [ ] 使用 Vite 创建 React + TypeScript 项目到 `frontend/`
- [ ] 安装依赖：tailwindcss, react-router-dom, axios
- [ ] 配置 TailwindCSS
- [ ] 配置基础路由结构

### 验收标准
- [ ] `npm run dev` 后端在 3001 端口启动无报错
- [ ] `npm run dev` 前端在 5173 端口启动无报错
- [ ] Prisma 迁移成功，数据库表创建完成

---

## 阶段二：后端核心功能

### 任务 2.1 认证模块
- [ ] 实现 `POST /api/v1/auth/quick-login` 接口
- [ ] 昵称登录逻辑：查找用户 → 不存在则创建 → 返回 user_id
- [ ] 不使用 session/JWT，直接用 user_id 标识

### 任务 2.2 专家模块
- [ ] 创建专家数据源（硬编码或配置文件）
- [ ] 实现 `GET /api/v1/experts` 接口
- [ ] 从 `SKILL.md` 文件读取专家描述信息

### 任务 2.3 对话模块
- [ ] 实现 `POST /api/v1/chat/conversations` 创建对话
- [ ] 实现 `GET /api/v1/chat/conversations` 获取列表
- [ ] 实现 `GET /api/v1/chat/conversations/{id}/messages` 获取消息
- [ ] 实现 `POST /api/v1/chat/conversations/{id}/messages` 发送消息
- [ ] 集成 DeepSeek API 生成回复
- [ ] 构建 system prompt：SKILL.md 内容 + 对话历史

### 任务 2.4 配额模块
- [ ] 实现 `GET /api/v1/users/{user_id}/quota` 接口
- [ ] 每次发消息前检查配额
- [ ] 每日 0 点重置配额

### 验收标准
- [ ] Postman 测试所有接口返回正确数据
- [ ] 对话流程完整：创建 → 发消息 → 收回复 → 查历史
- [ ] 配额用完后拒绝继续对话

---

## 阶段三：前端核心功能

### 任务 3.1 登录页面
- [ ] 昵称输入框 + 登录按钮
- [ ] 调用 quick-login 接口 → 存储 user_id（localStorage）

### 任务 3.2 专家列表页
- [ ] 网格展示8位专家卡片（头像、姓名、领域简介）
- [ ] 点击专家进入对话

### 任务 3.3 对话页面
- [ ] 消息列表展示（气泡样式）
- [ ] 输入框 + 发送按钮
- [ ] 调用发送消息接口并展示回复
- [ ] 流式展示 AI 回复（SSE 或轮询）

### 任务 3.4 配额展示
- [ ] 页面顶部或侧边显示剩余配额
- [ ] 配额为 0 时禁用输入

### 验收标准
- [ ] 登录 → 选专家 → 对话 → 查历史 完整流程可用
- [ ] 配额 UI 实时更新

---

## 阶段四：专家蒸馏

### 任务 4.1 王志纲（已完成）
- [ ] 确认 `wangzhigang-perspective/SKILL.md` 存在且内容完整

### 任务 4.2 罗永浩
- [ ] 收集公开资料（采访、演讲、文章）
- [ ] 编写 `luoyonghao/SKILL.md`
- [ ] 测试对话效果

### 任务 4.3 张雪峰
- [ ] 同上流程

### 任务 4.4 叶茂中
- [ ] 同上流程

### 任务 4.5 樊登
- [ ] 同上流程

### 任务 4.6 待定专家（3位）
- [ ] 确定人选后补充

### 验收标准
- [ ] 每位专家对话风格与真人高度相似
- [ ] SKILL.md 覆盖：角色定位、知识边界、表达风格、典型话术

---

## 阶段五：优化与部署

### 任务 5.1 错误处理
- [ ] 后端统一错误响应格式
- [ ] 前端全局错误提示组件
- [ ] 网络异常处理

### 任务 5.2 性能优化
- [ ] 消息列表虚拟滚动（如果数据量大）
- [ ] API 响应缓存
- [ ] 前端代码分割

### 任务 5.3 部署
- [ ] 后端 Dockerfile
- [ ] 前端构建配置
- [ ] docker-compose.yml（后端 + 前端 + PostgreSQL）
- [ ] 部署文档

### 验收标准
- [ ] `docker-compose up` 一键启动
- [ ] 全功能可用
- [ ] 满足非功能需求指标
