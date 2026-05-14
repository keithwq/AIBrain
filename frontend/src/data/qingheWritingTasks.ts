export type QingheWritingTaskId =
  | 'grade-essay'
  | 'homework-feedback'
  | 'teach-prompt'
  | 'lesson-delivery'
  | 'make-paper'
  | 'make-material'
  | 'teaching-operations';

export interface QingheWritingSubOption {
  id: string;
  label: string;
  /** 用户看到的一句话说明（下拉菜单里） */
  hint: string;
}

export interface QingheWritingTaskDef {
  id: QingheWritingTaskId;
  label: string;
  /** 一句话副标题，出现在卡片上 */
  headline: string;
  /** 卡片下方灰阶描述 */
  description: string;
  /** 任务是否走三包输出 */
  triPackage: boolean;
  /** 若有子类型，展示子选项下拉 */
  subOptions?: QingheWritingSubOption[];
  subOptionLabel?: string;
  quickQuestions: string[];
  outputOptions: string[];
  /** 右侧初始区展示的使用提示（一句话） */
  tip: string;
}

export const QINGHE_WRITING_TASKS: QingheWritingTaskDef[] = [
  {
    id: 'grade-essay',
    label: '批改作文',
    headline: '单篇、二稿、三稿及以上',
    description: '初稿按完整流程批；二稿起只看上一稿任务做得怎么样；三稿以后可继续加轮次。',
    triPackage: true,
    subOptionLabel: '这是第几稿（可继续加）',
    subOptions: [
      { id: 'first-draft', label: '初稿（第 1 稿）', hint: '完整批改：题目读通、找亮点、指出最大问题、给下一稿任务' },
      { id: 'second-draft', label: '二稿', hint: '对照上次给的任务，逐条看有没有做到；再提一个最该改的地方' },
      { id: 'third-draft', label: '三稿或以上', hint: '不推倒重来，只挑一处最影响阅读的地方收口' },
    ],
    quickQuestions: [
      '请帮我把这篇作文完整批一遍。',
      '只看上次布置的任务有没有做到。',
      '请给孩子 3 条以内的修改任务，其中一条 10 分钟能完成。',
    ],
    outputOptions: [
      '三份反馈（学生 + 老师 + 家长）',
      '只给学生看的那份',
      '只给老师看的那份',
      '只给家长看的那份',
    ],
    tip: '同时贴上作文题和学生正文，批改结果会更准确；二稿起请一并贴上上一稿布置的任务。',
  },
  {
    id: 'homework-feedback',
    label: '检查作业',
    headline: '日记、练笔、摘抄、阅读札记',
    description: '只看本次作业目标，不把所有问题一次改完。',
    triPackage: false,
    subOptionLabel: '作业类型',
    subOptions: [
      { id: 'diary-feedback', label: '日记 / 周记', hint: '看真实材料、一个镜头和一句可执行反馈' },
      { id: 'micro-writing-feedback', label: '片段练笔', hint: '只按本次技法目标检查，如对话、描写、开头、过渡' },
      { id: 'excerpt-feedback', label: '摘抄作业', hint: '看学生是否说清摘抄好在哪里，并能接一句自己的话' },
      { id: 'reading-note-feedback', label: '阅读札记', hint: '短引原文、一件生活对应小事、一句判断或疑问' },
      { id: 'class-summary-feedback', label: '全班作业汇总', hint: '整理本周亮点、共性问题和下周一个小目标' },
    ],
    quickQuestions: [
      '请帮我检查这次小练笔，只看描写是否具体。',
      '请把这批日记整理成课堂反馈。',
      '请给这份阅读札记一段学生能看懂的反馈。',
    ],
    outputOptions: [
      '学生可读反馈',
      '课堂汇总',
      '学生反馈 + 教师汇总',
    ],
    tip: '检查作业要先说明作业目标；如果目标是对话，就只看对话，不同时评价立意、结构和语言。',
  },
  {
    id: 'teach-prompt',
    label: '讲作文题',
    headline: '把一道题或一种训练讲给学生',
    description: '一道作文题或一类训练目标，按你想讲到什么程度给不同深浅的方案。',
    triPackage: false,
    subOptionLabel: '要讲到什么程度',
    subOptions: [
      { id: 'break-prompt', label: '只拆题目', hint: '把题目里的限制、任务、关键词理清楚，给几条审题路径' },
      { id: 'teach-writing', label: '教一道题怎么写', hint: '审题路径 + 示范片段 + 给学生的训练任务' },
      { id: 'review-class', label: '上一节讲评课', hint: '共性问题诊断 + 课堂流程 + 板书金句 + 小练 + 课后作业' },
    ],
    quickQuestions: [
      '请帮我把这道题的限制、任务、关键词理清楚。',
      '请给这道题一条能讲的审题路径。',
      '请设计一段 10 分钟的课堂小练，加课后作业。',
    ],
    outputOptions: [
      '默认输出',
      '加板书金句',
      '加学生训练任务',
    ],
    tip: '粘贴完整题干（含引导语和要求），审题路径会更贴合题目限制，减少跑偏风险。',
  },
  {
    id: 'lesson-delivery',
    label: '备课',
    headline: '教案、课件、讲义、逐字稿、学案',
    description: '围绕同一节课产出不同交付物，避免把“备课”和“课件讲义”拆成重复分类。',
    triPackage: false,
    subOptionLabel: '要哪一种成品',
    subOptions: [
      { id: 'make-ppt', label: 'PPT 课件骨架', hint: '8-12 页：每页标题、要点、过渡语' },
      { id: 'make-lesson-plan', label: '教案', hint: '目标、重难点、环节、板书、作业、反思栏' },
      { id: 'make-handout', label: '学生讲义', hint: '审题提示、示范片段、练笔留白、修改任务' },
      { id: 'make-script', label: '课堂逐字稿', hint: '10-15 分钟分块的讲话稿，含过渡和提问' },
      { id: 'make-worksheet', label: '随堂学案', hint: '导学问题、课堂任务、自评、反思' },
    ],
    quickQuestions: [
      '请帮我生成一份 10 页的讲评课 PPT 骨架。',
      '请帮我写一份 40 分钟的作文讲评课教案。',
      '请帮我生成一份学生用的讲义，带动笔空位。',
    ],
    outputOptions: [
      '完整版',
      '精简版（只给核心结构）',
    ],
    tip: '告诉我本次作文的 Top3 共性问题，备课成品会更贴合班级实际，减少通用套话。',
  },
  {
    id: 'make-paper',
    label: '测评',
    headline: '月考、周测、补差、提优、专项训练',
    description: '按目标出写作题、练习或测评任务，含评分参考和使用建议。',
    triPackage: false,
    subOptionLabel: '出哪一种',
    subOptions: [
      { id: 'monthly-exam', label: '月考作文', hint: '一道大作文题 + 命题说明 + 评分参考' },
      { id: 'weekly-quiz', label: '周测小作文', hint: '一段微写作 200-400 字 + 要点提示' },
      { id: 'daily-homework', label: '日常作业', hint: '一道当日作业：题目 + 写作提示 + 交付要求' },
      { id: 'focused-drill', label: '专项训练', hint: '围绕一个技能点的 3-5 题小练习' },
      { id: 'in-class-drill', label: '随堂小练', hint: '10 分钟课堂小练 + 评改指引' },
      { id: 'exam-improve', label: '中考提优 / 高考提分', hint: '面向高分段，强化审题、结构、表达和稳定得分' },
      { id: 'remedial-support', label: '中考补差 / 高考补差', hint: '面向基础薄弱学生，压低门槛，给可完成的保底任务' },
    ],
    quickQuestions: [
      '请按初二学情出一份月考作文卷，带命题说明和评分参考。',
      '请出一份周测微写作（200 字内），加要点提示。',
      '请围绕"叙事中加入细节"出 5 小题专项训练。',
    ],
    outputOptions: [
      '题目 + 命题说明 + 评分参考',
      '只出题目',
      '题目 + 评分参考 + 常见失分点',
    ],
    tip: '说明年级和本阶段训练重点，出题方向会更准；评分参考仅供参考，不代表官方阅卷口径。',
  },
  {
    id: 'make-material',
    label: '素材库',
    headline: '事例、意象、金句、主题包',
    description: '给学生写作用的素材库，按主题或文体组织。',
    triPackage: false,
    subOptionLabel: '要哪一类素材',
    subOptions: [
      { id: 'figure-examples', label: '人物事例', hint: '按主题给 5-8 位可用人物，一句话点评 + 可用角度' },
      { id: 'imagery-bank', label: '意象与细节', hint: '记叙常用意象、感官细节、场面调度的句式模板' },
      { id: 'quote-bank', label: '金句与过渡句', hint: '开头、过渡、升华的句式模板，分文体' },
      { id: 'theme-pack', label: '主题素材包', hint: '围绕一个主题给"事例 + 意象 + 金句"三件套' },
      { id: 'news-material', label: '时事素材', hint: '只到方向级，不编造具体人物与时间细节' },
    ],
    quickQuestions: [
      '请围绕"坚持"给 5 位可用人物，每位一句话点评。',
      '请给我 10 条秋天的感官细节（视觉 / 听觉 / 嗅觉）。',
      '请给议论文常用的 8 种过渡句式，各配一句示例。',
    ],
    outputOptions: [
      '分类清单',
      '分类清单 + 示范句',
      '主题卡片（可发学生）',
    ],
    tip: '给出具体主题词和文体方向，素材会更精准；时事素材只到方向级，具体细节请自行核实。',
  },
  {
    id: 'teaching-operations',
    label: '教研',
    headline: '家校沟通、教研复盘、课程交付说明',
    description: '处理教学服务里的说明、复盘、沟通和续报材料，不套作文批改表单。',
    triPackage: false,
    subOptionLabel: '运营场景',
    subOptions: [
      { id: 'parent-note', label: '家长反馈', hint: '说明本次作文学习事实、进步和家庭配合事项' },
      { id: 'consult-reply', label: '回应家长咨询', hint: '针对家长原话生成克制、具体的回复' },
      { id: 'parent-meeting', label: '家长会发言', hint: '3-5 分钟班级写作情况说明' },
      { id: 'teaching-review', label: '教研复盘', hint: '复盘一节课或一次批改任务，形成下一轮改进点' },
      { id: 'course-report', label: '课程交付说明', hint: '给校区、家长或教研负责人看的交付说明' },
    ],
    quickQuestions: [
      '请帮我写一段本次作文课后的家长反馈。',
      '请把这节课复盘成下次可执行的改进清单。',
      '请写一份课程交付说明，客观说明做了什么和下一步做什么。',
    ],
    outputOptions: [
      '按场景默认输出',
      '加行动清单',
      '加对外沟通版本',
    ],
    tip: '教研与运营只处理教学事实、沟通对象和下一步安排，不使用作文题、正文等批改字段。',
  },
];

export const DEFAULT_QINGHE_WRITING_TASK: QingheWritingTaskId = 'grade-essay';

export function getQingheWritingTask(id: QingheWritingTaskId): QingheWritingTaskDef {
  return QINGHE_WRITING_TASKS.find(task => task.id === id) || QINGHE_WRITING_TASKS[0];
}

export function getDefaultSubOption(task: QingheWritingTaskDef): string {
  return task.subOptions?.[0]?.id ?? '';
}
