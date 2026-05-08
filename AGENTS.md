# AiBrain

## 项目架构

- **技术栈**: Node.js + TypeScript + Express + Prisma + PostgreSQL（后端）, React + TypeScript + TailwindCSS + Vite（前端）, DeepSeek API（LLM）
- **架构**: LLM + WIKI（预编译知识，不用 RAG）
- **专家 persona**: 从 `D:\WIKI\40_Knowledge 知识资产\Personas 人物原型\{id}-perspective\SKILL.md` 读取作为 system prompt

## 开发命令

### 后端
```bash
cd backend
npm run dev              # ts-node-dev 热重载启动 (localhost:3001)
npm run build            # TypeScript 编译到 dist/
npm start                # 运行编译后代码
npx prisma db push       # 同步 schema 到数据库
npx prisma generate      # 生成 Prisma Client
npx tsc --noEmit         # TypeScript 类型检查
```

### 前端
```bash
cd frontend
npm run dev              # Vite 热重载启动 (localhost:5173)
npm run build            # 生产构建
npm run lint             # ESLint 检查
npx tsc --noEmit         # TypeScript 类型检查
```

### Docker
```bash
docker-compose up        # 一键启动全栈
```

## 环境变量

后端 `.env`:
```
DATABASE_URL="postgresql://aibrain:aibrain@localhost:5432/aibrain?schema=public"
DEEPSEEK_API_KEY=your-deepseek-api-key
PORT=3001
```

## 数据库

- PostgreSQL 运行在 `time_value_postgres` 容器 (localhost:5432)
- 数据库名: aibrain, 用户: aibrain, 密码: aibrain
- Prisma schema: `backend/prisma/schema.prisma` (4张表: users, conversations, messages, usage_logs)

## 专家列表 (8位已蒸馏)

| ID | 花名 | 真名 |
|---|------|------|
| steve-jobs | 乔大爷 | 乔布斯 |
| zhangxuefeng | 冰山老师 | 张雪峰 |
| yemaozhong | 叶将军 | 叶茂中 |
| luoyonghao | 罗胖子 | 罗永浩 |
| mayun | 太极老总 | 马云 |
| masike | 马斯克狂人 | 马斯克 |
| luoxiang | 罗翔老师 | 罗翔 |
| fandeng | 樊老师 | 樊登 |

## 合作契约

1. **用户是外行** — 不懂编程、软件工程，不读代码。所有技术决策 AI 直接做最优解，不给选项。禁止问"要不要/是否/如果/或者"这类增加选择成本的问题。

2. **指令必须被质疑** — 用户指令可能模糊、错误或不完整。发现任何问题直接指出，不允许妥协。指令与正确路径冲突时，优先纠正再执行。

3. **AI 是技术实现方** — 这是合作关系，不是问答。需要决策时直接做最优解，不把选择推回给用户。

## 协作规范

### 提示词格式
当需要给用户生成提示词（用于新会话/拷贝粘贴）时，提示词中的 Markdown 代码块（\`\`\`）会被特殊符号破坏。必须使用以下方式避免：
- 代码块改用缩进格式（每行前加4个空格），不要用 \`\`\` 包裹
- 或者将内容写成纯文本内联格式
- 总之不要用 \`\`\`bash、\`\`\`typescript 等围栏代码块
