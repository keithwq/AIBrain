# 王荣生（荣生备课）语文教学内容与备课决策工作台

## 路径

`backend/personas/wangrongsheng-perspective`

## 一句话定位

基于王荣生公开论著、书目、目录、馆藏与可复核二手材料，蒸馏为 AiBrain 的“语文教学内容判断系统”：帮助教师判断一节课到底教什么、不教什么，检查目标、内容、活动、评价是否一致。

## 刃口

- 主责：教什么/不教什么，目标-内容-活动一致性，阅读/写作课内容理路，备课骨架，评课与磨课诊断。
- 不做：王鼎钧式作文升格、孙绍振式文学细读主链、官方课标/命题组口径、整篇侵权教案、无依据原话。

## 文件结构

- `SKILL.md`：专家工作系统、身份边界、判断框架、追问规则、输出模板、产品字段。
- `references/research/01-source-map-timeline.md`：来源地图、学术位置、版本风险。
- `02-core-books-anchors.md`：核心著作、公开书目和目录锚点。
- `03-concepts-glossary.md`：课程内容/教材内容/教学内容/四类选文等术语卡。
- `04-reading-lesson-logic.md`：阅读课内容理路诊断卡。
- `05-writing-lesson-logic.md`：写作课内容理路诊断卡。
- `06-lectures-interviews-trainings.md`：讲座、访谈、师训检索线索与强度标签。
- `07-secondary-reception.md`：二手评价、外部接受与引用边界。
- `08-boundaries-and-misuse.md`：反杜撰、反串台、反侵权边界。
- `09-textbook-text-memos.md`：常见篇名备忘，明确非权威定类。
- `10-workbench-tests.md`：产品工作台模板与验收题。
- `11-resource-exhaustion-log.md`：资源穷尽日志、检索式、纳入/排除标准、缺口。

## 资源穷尽验收

新指令下，不再使用 2000+/8000+/10000+ 作为达标线。验收改为：

- 是否尽可能覆盖公开互联网可复核材料。
- 是否清楚区分一手/近一手、馆藏/目录、平台简介、二手评论、无字幕视频。
- 是否把找到的材料转成专家判断系统，而不是材料堆。
- 是否把未找到或不能可靠使用的材料写成缺口，而不是补伪页码、伪原话、空模板。
- 是否仍然能服务 AiBrain 工作台输出。

行数统计只作为维护体量观察，不作为通过理由：

    node -e "const fs=require('fs');const p='backend/personas/wangrongsheng-perspective';const sk=fs.readFileSync(p+'/SKILL.md','utf8').split(/\r?\n/).length;let r=0;for(const f of fs.readdirSync(p+'/references/research')){if(f.endsWith('.md'))r+=fs.readFileSync(p+'/references/research/'+f,'utf8').split(/\r?\n/).length;}console.log(JSON.stringify({SKILL:sk,referencesMarkdown:r,total:sk+r},null,2));"

## README 主张 ↔ references 锚点抽查

| 主张 | 锚点 |
|---|---|
| 本台主责是语文教学内容与备课诊断 | `SKILL.md` 1-3 节；`01-source-map-timeline.md` 学术位置 |
| 三层内容辨析是核心判断入口 | `03-concepts-glossary.md` 课程内容/教材内容/教学内容卡 |
| 定篇/例文/样本/用件不能当权威篇名表 | `03-concepts-glossary.md` 与 `09-textbook-text-memos.md` |
| 阅读课要回到文类、教材证据位和学习结果 | `04-reading-lesson-logic.md` |
| 写作课只诊断教学内容，不抢作文升格 | `05-writing-lesson-logic.md` 与 `08-boundaries-and-misuse.md` |
| 讲座无字幕不得写成原话 | `06-lectures-interviews-trainings.md` |
| 二手材料只作接受史/检索线索 | `07-secondary-reception.md` |
| 资源穷尽情况可复审 | `11-resource-exhaustion-log.md` |
| 能服务 AiBrain 工作台字段 | `10-workbench-tests.md` |

## 维护规则

1. 新增页码必须来自纸书或合法电子书，不从网页猜。
2. 新增原话必须有可复核文字来源，且只短引必要片段。
3. 讲座、访谈、视频没有字幕或文字稿时，不得作为原话依据。
4. 篇名备忘只做备课追问，不做王荣生权威定类。
5. 每次新增资源，先更新 `11-resource-exhaustion-log.md` 的来源表和缺口，再决定是否进入 SKILL。
