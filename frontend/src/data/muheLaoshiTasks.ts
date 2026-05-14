export type MuheLaoshiTaskId =
  | 'behavior-analysis'
  | 'parent-confusion'
  | 'parent-child-repair'
  | 'couple-co-parenting'
  | 'growth-risk'
  | 'education-strategy'
  | 'age-guide';

export interface MuheLaoshiTask {
  id: MuheLaoshiTaskId;
  label: string;
  headline: string;
  description: string;
  behaviorLabel: string;
  behaviorPlaceholder: string;
  durationLabel: string;
  familyLabel: string;
  familyPlaceholder: string;
  goalLabel: string;
  goalPlaceholder: string;
  quickQuestions: string[];
  prompt: string;
}

export const MUHE_LAOSHI_TASKS: MuheLaoshiTask[] = [
  {
    id: 'behavior-analysis',
    label: '行为问题分析',
    headline: '顶嘴、撒谎、冷漠、暴躁、偷拿',
    description: '先判断是偶发还是习惯化，再看家庭模式，给出根源判断和今天就能做的动作。',
    behaviorLabel: '具体行为描述',
    behaviorPlaceholder: '发生了什么？最近一次是什么情况？',
    durationLabel: '持续多久了',
    familyLabel: '家庭管教方式',
    familyPlaceholder: '只写规则和执行方式：谁定规则、谁执行、是否一致、孩子违反规则后怎么处理',
    goalLabel: '家长最想解决什么',
    goalPlaceholder: '例如：想知道为什么、想知道怎么管、想知道要不要找专业帮助',
    quickQuestions: [
      '请判断这个行为是偶发还是习惯化，根源更可能来自哪里。',
      '请给我今天就能做的一个具体动作。',
      '这种情况需要找专业帮助吗？',
    ],
    prompt: '请用木禾老师的心理抚养框架，先判断行为是偶发还是习惯化，再分析根源（养育方式/关系/性格形成），最后给出家长今天就能做的具体动作，并说明什么情况需要专业帮助。',
  },
  {
    id: 'parent-confusion',
    label: '家长困惑',
    headline: '不会管、管不住、怕伤关系',
    description: '把家长的困惑整理清楚，先看关系基础，再给边界和陪伴的具体方法。',
    behaviorLabel: '家长的困惑',
    behaviorPlaceholder: '你现在最不知道怎么办的是什么？',
    durationLabel: '这个困惑持续多久了',
    familyLabel: '家庭现状',
    familyPlaceholder: '只写家庭关系结构：父母是否一致、是否当孩子面争吵、老人是否介入规则',
    goalLabel: '希望得到什么',
    goalPlaceholder: '例如：想知道该怎么说、想知道该不该管、想知道关系怎么修复',
    quickQuestions: [
      '请帮我判断现在亲子关系的基础是否稳固。',
      '我该先修复关系还是先立规矩？',
      '请给一个今天就能用的沟通方法。',
    ],
    prompt: '请用木禾老师的心理抚养框架，先判断亲子关系基础（情感账户在谁那里），再给出边界设立和关系修复的具体方法，结尾给一个今天就能执行的动作。',
  },
  {
    id: 'parent-child-repair',
    label: '亲子关系修复',
    headline: '不说话、对抗、疏远、怕孩子恨我',
    description: '先看情感账户在谁那里，再判断是关系断裂、权威失效，还是沟通方式把孩子越推越远。',
    behaviorLabel: '关系卡住的具体表现',
    behaviorPlaceholder: '例如：一说学习就吵、不愿意回家、不和父母说真话、只和老人亲',
    durationLabel: '这种关系状态持续多久了',
    familyLabel: '父母回应方式',
    familyPlaceholder: '只写冲突回应模式：谁讲道理、谁发火、谁沉默、谁兜底、是否反复翻旧账',
    goalLabel: '最想先恢复哪一步',
    goalPlaceholder: '例如：能坐下来谈、孩子愿意说实话、减少对抗、重新建立父母权威',
    quickQuestions: [
      '请判断现在是关系断裂，还是规则失效。',
      '孩子不愿意沟通时，父母第一句话该怎么说？',
      '请给一套今晚就能用的亲子修复话术。',
    ],
    prompt: '请用木禾老师的心理抚养框架处理亲子关系修复：先判断情感账户、主要照料者和权威结构，再区分关系断裂、规则失效或沟通方式错误；输出一段家长可直接照着说的话，以及接下来三天的具体动作。不要羞辱家长，不要把孩子贴标签。',
  },
  {
    id: 'couple-co-parenting',
    label: '夫妻共育分工',
    headline: '一个管一个护、父亲缺位、老人插手',
    description: '把夫妻关系、父母分工和家庭权威结构放在一起看，先止住内耗，再统一规则。',
    behaviorLabel: '夫妻或家庭分歧',
    behaviorPlaceholder: '例如：妈妈管、爸爸不管；爸爸一管就吼；老人护孩子；夫妻当孩子面吵',
    durationLabel: '这种分工状态持续多久了',
    familyLabel: '现在的家庭权威结构',
    familyPlaceholder: '只写分工和权威：谁负责陪伴、谁负责规则、谁经常拆台、哪些规则执行不一致',
    goalLabel: '希望家庭先统一什么',
    goalPlaceholder: '例如：手机规则、作业规则、睡眠规则、父亲参与方式、老人边界',
    quickQuestions: [
      '父亲现在应该先补陪伴，还是先立规矩？',
      '夫妻教育意见不一致，怎样不在孩子面前互相拆台？',
      '老人总护孩子，父母怎么设边界？',
    ],
    prompt: '请用木禾老师的家庭教育判断框架处理夫妻共育：先判断父母分工、父亲参与、母亲兜底、老人插手和孩子情感账户；再给出家庭权威结构调整方案。输出必须包含：夫妻私下统一话术、对孩子的一致规则、父亲今天能做的一件事、老人边界话术。语气直接、清楚、可执行。',
  },
  {
    id: 'growth-risk',
    label: '成长风险识别',
    headline: '早恋、沉迷、逃学、结交不良',
    description: '先判断风险等级，再给家庭可处理的行动，明确什么情况需要专业介入。',
    behaviorLabel: '风险信号描述',
    behaviorPlaceholder: '发现了什么？什么时候开始的？',
    durationLabel: '持续多久了',
    familyLabel: '家庭和学校情况',
    familyPlaceholder: '只写外部结构：学校是否已介入、同伴关系如何、家庭和学校是否有共同处理方案',
    goalLabel: '家长现在最担心什么',
    goalPlaceholder: '例如：担心越来越严重、担心影响学业、担心交友问题',
    quickQuestions: [
      '请判断这个风险信号的等级：家庭可处理、需要专业帮助，还是需要立即求助？',
      '沉迷手机/游戏背后真正的原因是什么？',
      '我现在能做什么，不能做什么？',
    ],
    prompt: '请用木禾老师的心理抚养框架，先判断风险等级（家庭可处理/需要专业帮助/需要立即求助），再分析根源，给出家庭行动清单，并明确什么情况必须降级求助。',
  },
  {
    id: 'education-strategy',
    label: '教育策略咨询',
    headline: '怎么陪、怎么立规矩、怎么沟通',
    description: '针对具体教育场景，给出可执行的家庭方法，不讲空泛道理。',
    behaviorLabel: '想解决的教育场景',
    behaviorPlaceholder: '例如：孩子不听话、不知道怎么立规矩、沟通总是吵架',
    durationLabel: '这个问题存在多久了',
    familyLabel: '已经试过的方法',
    familyPlaceholder: '只写方法和结果：试过哪些规则、沟通、奖惩或陪伴方式，分别有没有效果',
    goalLabel: '希望达到什么效果',
    goalPlaceholder: '例如：孩子能接受规则、沟通不再对抗、关系更亲近',
    quickQuestions: [
      '3-6岁立规矩最重要的原则是什么？',
      '孩子情绪激动时，我应该先做什么？',
      '父亲在家庭教育里应该扮演什么角色？',
    ],
    prompt: '请用木禾老师的心理抚养框架，针对具体教育场景给出可执行的家庭方法，重点是今天就能做的动作，不讲空泛道理，结尾给出一个最关键的执行要点。',
  },
  {
    id: 'age-guide',
    label: '年龄段养育指南',
    headline: '0-3岁 / 3-6岁 / 6-12岁 / 青春期',
    description: '按孩子年龄段，给出这个阶段最重要的养育重点和常见误区。',
    behaviorLabel: '当前最关注的问题',
    behaviorPlaceholder: '例如：这个年龄段该怎么陪、该立什么规矩、该注意什么',
    durationLabel: '孩子这个阶段大概多久了',
    familyLabel: '家庭养育方式',
    familyPlaceholder: '只写养育风格：规则稳定吗、陪伴多吗、父母标准是否一致、老人是否干预',
    goalLabel: '希望了解什么',
    goalPlaceholder: '例如：这个阶段的养育重点、常见误区、父母该做什么',
    quickQuestions: [
      '0-3岁最重要的事是什么？',
      '3-6岁怎么立规矩才有效？',
      '青春期叛逆怎么处理？',
    ],
    prompt: '请用木禾老师的心理抚养四维度框架，针对这个年龄段给出养育重点、常见误区和具体可执行的家庭建议，重点是家长今天就能做的事。',
  },
];

export const DEFAULT_MUHE_LAOSHI_TASK: MuheLaoshiTaskId = 'behavior-analysis';

export function getMuheLaoshiTask(id: MuheLaoshiTaskId): MuheLaoshiTask {
  return MUHE_LAOSHI_TASKS.find(t => t.id === id) ?? MUHE_LAOSHI_TASKS[0];
}

export const AGE_STAGES = [
  { value: '', label: '请选择年龄段' },
  { value: '0-3岁（依恋期）', label: '0-3岁（依恋期）' },
  { value: '3-6岁（性格塑造期）', label: '3-6岁（性格塑造期）' },
  { value: '6-12岁（观念引导期）', label: '6-12岁（观念引导期）' },
  { value: '青春期（12-18岁）', label: '青春期（12-18岁）' },
  { value: '成年子女', label: '成年子女' },
];

export const DURATION_OPTIONS = [
  { value: '', label: '请选择' },
  { value: '刚发生', label: '刚发生' },
  { value: '1-2周', label: '1-2周' },
  { value: '1个月左右', label: '1个月左右' },
  { value: '3个月以上', label: '3个月以上' },
  { value: '半年以上', label: '半年以上' },
  { value: '一直都这样', label: '一直都这样' },
];
