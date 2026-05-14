export type SunshaozhenTaskId =
  | 'close-read'
  | 'prepare-lesson'
  | 'review-exam'
  | 'group-text'
  | 'make-paper'
  | 'student-qa';

export interface SunshaozhenSubOption {
  id: string;
  label: string;
  hint: string;
}

export interface SunshaozhenTaskDef {
  id: SunshaozhenTaskId;
  label: string;
  headline: string;
  description: string;
  subOptions?: SunshaozhenSubOption[];
  subOptionLabel?: string;
  quickQuestions: string[];
  outputOptions: string[];
}

export const SUNSHAOZHEN_TASKS: SunshaozhenTaskDef[] = [
  {
    id: 'close-read',
    label: '细读一篇',
    headline: '找矛盾、定锚句、出层次',
    description: '备课前的深度文本分析。绍振先找「不像常识那样顺」的地方，再按表层→情感→形式三层拆开，给出主问题链、语言敏感点和板书要点。',
    subOptionLabel: '文体',
    subOptions: [
      { id: 'prose', label: '现代散文', hint: '情感逻辑 + 语言敏感点 + 替换实验' },
      { id: 'fiction', label: '小说 / 叙事文', hint: '叙述视角 + 人物心口误差 + 情节错位' },
      { id: 'poetry-modern', label: '现代诗', hint: '意象落差 + 节奏与情感 + 非常规处' },
      { id: 'classic-prose', label: '古典散文', hint: '章法与情感 + 语言特殊处（不替代训诂）' },
      { id: 'essay', label: '议论性散文', hint: '论证逻辑 + 情感与理性的张力' },
      { id: 'news-biography', label: '新闻 / 传记 / 纪实', hint: '真实性边界 + 叙述者立场 + 细节选择' },
    ],
    quickQuestions: [
      '请先找这段文字里最「不平常」的一句，再设计课堂追问。',
      '请按表层→情感→形式三层，给这篇课文的细读骨架。',
      '请做一个替换/删改小实验，说明原文的语言增益在哪里。',
    ],
    outputOptions: [
      '全案（核心矛盾 + 层次 + 主问题链 + 板书 + 学生任务）',
      '只给核心矛盾 + 2-3 个语言敏感点',
      '只给主问题链（3-7 问，每问挂锚句）',
      '只给层进板书（5-12 词块 + 证据回指）',
      '只给学生可执行任务（1-3 条可判分）',
    ],
  },
  {
    id: 'prepare-lesson',
    label: '备一节课',
    headline: '教案 / PPT / 讲义 / 逐字稿',
    description: '贴课文或课文名，按一线语文老师的成品格式直出。含环节时长、板书设计、学生活动、过渡语。',
    subOptionLabel: '要什么成品',
    subOptions: [
      { id: 'lesson-plan', label: '教案', hint: '目标 / 重难点 / 环节时长 / 板书 / 作业 / 反思' },
      { id: 'ppt', label: 'PPT 课件骨架', hint: '8-15 页 · 每页标题 + 要点 + 过渡语' },
      { id: 'handout', label: '学生讲义 / 学案', hint: '导学问题 + 课堂任务 + 留白 + 自评' },
      { id: 'script', label: '课堂逐字稿', hint: '分钟级逐字稿，含过渡、设问、停顿' },
      { id: 'open-class', label: '公开课方案', hint: '主问题亮点 + 预设学生回答 + 追问话术' },
      { id: 'single-period', label: '单课时 40 分钟', hint: '时间分配 + 重难点突破 + 当堂训练' },
      { id: 'double-period', label: '连堂 80 分钟', hint: '两课时衔接，深度解读 + 迁移练笔' },
    ],
    quickQuestions: [
      '请给这篇课文生成一份 40 分钟教案，含板书设计。',
      '请生成 10-12 页 PPT 骨架，每页给标题 + 要点 + 过渡语。',
      '请给我一份能印给学生的讲义，含动笔空位和自评表。',
    ],
    outputOptions: [
      '完整成品（按所选格式）',
      '精简版（只给核心结构）',
      '含主问题链的完整成品',
      '含迁移练笔任务的完整成品',
    ],
  },
  {
    id: 'review-exam',
    label: '讲评阅读题',
    headline: '学生错答分析 + 文学证据链',
    description: '贴阅读题 + 原文节选 + 学生错答（可选）。绍振只给文学证据链，不编造赋分细则；识别学生错答的典型模式，给讲评话术。',
    subOptionLabel: '讲评场景',
    subOptions: [
      { id: 'analyze-question', label: '只拆题目', hint: '考查层次 + 文学证据 + 追问设计' },
      { id: 'wrong-answer', label: '讲学生错答', hint: '错答归因 + 错在哪一步 + 如何引导' },
      { id: 'review-class', label: '上一节讲评课', hint: '共性错因 + 微练 + 投影金句 + 作业闭环' },
      { id: 'exam-strategy', label: '答题思路训练', hint: '不编标答，但给「哪里找证据」的思路' },
      { id: 'typical-questions', label: '典型题型拆解', hint: '情节概括 / 语言赏析 / 主旨探究 / 开放题' },
    ],
    quickQuestions: [
      '请分析学生这道题的错答：错在哪一步？怎么引导？',
      '请按这道阅读题设计一节 40 分钟讲评课。',
      '请拆这道题的考查层次，给文学证据链（不要编标答）。',
    ],
    outputOptions: [
      '学生错答诊断 + 引导话术',
      '文学证据链 + 追问设计',
      '讲评课方案（流程 + 微练 + 作业闭环）',
      '典型错答 Top3 + 共性归因',
    ],
  },
  {
    id: 'group-text',
    label: '群文 / 单元',
    headline: '群文 · 单元整合 · 整本书切片',
    description: '多篇文本并置或整本书节选。先判并置理据（主题/文体/手法互证），再给可比性主问题，防止套作。',
    subOptionLabel: '整合类型',
    subOptions: [
      { id: 'thematic', label: '主题群文', hint: '同一主题下几篇如何互证互补' },
      { id: 'genre', label: '文体比较', hint: '同一文体的不同写法' },
      { id: 'technique', label: '手法比较', hint: '不同文本用相似手法的效果差异' },
      { id: 'author-series', label: '同一作家的几篇', hint: '作家风格与思想演变' },
      { id: 'unit-integration', label: '教材单元整合', hint: '单元导语 + 课后题 + 课文共同支撑什么' },
      { id: 'whole-book', label: '整本书阅读切片', hint: '一次课只处理一个章节或一组场景' },
    ],
    quickQuestions: [
      '请先判断这组文本并置的理据，再给可比性主问题链。',
      '请帮我做这个单元的整合设计：每篇教到哪一层？',
      '请给《红楼梦》这一章的整本书阅读任务设计。',
    ],
    outputOptions: [
      '并置理据 + 可比性主问题链',
      '单元整合方案（每篇分工 + 整合节点）',
      '整本书章节任务（阅读任务 + 讨论题 + 读写结合）',
      '群文迁移结构认知（防止素材搬运）',
    ],
  },
  {
    id: 'make-paper',
    label: '出阅读题',
    headline: '月考 / 周测 / 学习单 / 命题',
    description: '按场景出阅读理解题：现代文 / 诗词 / 群文比较 / 整本书。含命题说明、参考答案方向（不编造赋分细则）。',
    subOptionLabel: '出哪一种',
    subOptions: [
      { id: 'monthly-exam', label: '月考阅读题', hint: '一篇现代文 + 4-6 道题 + 参考方向' },
      { id: 'weekly-quiz', label: '周测阅读小题', hint: '短文 + 2-3 道题 + 参考方向' },
      { id: 'learning-sheet', label: '课堂学习单', hint: '导学问题 + 当堂任务 + 课后拓展' },
      { id: 'comparative', label: '比较阅读题', hint: '两篇并置 + 对比题 + 开放题' },
      { id: 'poetry-quiz', label: '诗词鉴赏题', hint: '不做逐字训诂，只做文学性鉴赏题' },
      { id: 'homework', label: '日常作业', hint: '1-2 道可在课后独立完成的阅读题' },
    ],
    quickQuestions: [
      '请按八年级学情出一份月考阅读题（一篇现代文 + 5 道题）。',
      '请出一道比较阅读题，两篇并置 + 3 道对比题。',
      '请出一份课堂学习单，含导学问题和当堂任务。',
    ],
    outputOptions: [
      '题目 + 命题说明 + 参考方向',
      '只出题目（老师自备参考）',
      '题目 + 参考方向 + 典型错答预告',
      '题目 + 学习单格式（含学生动笔空位）',
    ],
  },
  {
    id: 'student-qa',
    label: '学生问答',
    headline: '课堂救场 / 追问设计',
    description: '学生问了个刁钻问题不知道怎么接？贴出学生原话，绍振给三档回应：肯定里找漏洞、追问反推、证据锚定。不糊弄、不羞辱。',
    subOptionLabel: '问题类型',
    subOptions: [
      { id: 'challenge', label: '学生挑战文本', hint: '「这段写得不好」「为什么这样写」类质疑' },
      { id: 'off-topic', label: '学生理解跑偏', hint: '误读或强行套用概念的学生答案' },
      { id: 'deep-thinking', label: '学生深度提问', hint: '超出教参的有价值的提问' },
      { id: 'bored', label: '学生表达厌学', hint: '「有什么好分析的」类情绪性表达' },
      { id: 'design-follow-up', label: '设计追问链', hint: '针对某一主问题设计 3-5 层追问' },
    ],
    quickQuestions: [
      '学生说「这段写得很啰嗦」，我该怎么接？',
      '学生问「为什么作者非要这样写」，我该怎么引导？',
      '请针对这个主问题设计 3-5 层追问，由浅入深。',
    ],
    outputOptions: [
      '三档回应（肯定 / 追问 / 证据）',
      '追问链（3-5 层，每层挂证据锚句）',
      '引导话术 + 预设学生下一步反应',
      '情绪接住 + 回到文本的话术',
    ],
  },
];

export const DEFAULT_SUNSHAOZHEN_TASK: SunshaozhenTaskId = 'close-read';

export function getSunshaozhenTask(id: SunshaozhenTaskId): SunshaozhenTaskDef {
  return SUNSHAOZHEN_TASKS.find(t => t.id === id) ?? SUNSHAOZHEN_TASKS[0];
}

export function getDefaultSunshaozhenSubOption(task: SunshaozhenTaskDef): string {
  return task.subOptions?.[0]?.id ?? '';
}
