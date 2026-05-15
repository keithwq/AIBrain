import { getQingheWritingTask, type QingheWritingTaskId } from './qingheWritingTasks';

export type WorkbenchFieldKey =
  | 'clientName'
  | 'clientBackground'
  | 'background'
  | 'goal'
  | 'material'
  | 'output'
  | 'grade'
  | 'region'
  | 'textbook'
  | 'materialType'
  | 'studentLevel'
  | 'studentLevelNote'
  | 'examPurpose'
  | 'examPurposeNote'
  | 'specificGoal'
  | 'classType'
  | 'teachingVenue'
  | 'classSize'
  | 'lessonDuration'
  | 'prompt'
  | 'text';

export interface WorkbenchField {
  key: WorkbenchFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
  options?: string[];
  control?: 'select' | 'combo' | 'textarea' | 'input';
  companionKey?: WorkbenchFieldKey;
  companionLabel?: string;
  companionPlaceholder?: string;
}

export type WorkbenchValues = Record<WorkbenchFieldKey, string>;

export interface WorkbenchCopy {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  outputFallback: string;
  fields: WorkbenchField[];
}

const commonContextFields: WorkbenchField[] = [
  { key: 'grade', label: '年级', placeholder: '请选择年级', rows: 1, options: ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] },
  { key: 'region', label: '地区', placeholder: '省份或城市，例如：江苏南京', rows: 1 },
  { key: 'textbook', label: '教材版本', placeholder: '请选择教材版本', rows: 1, options: ['统编版', '人教版', '苏教版', '沪教版', '其他', '不确定'] },
  { key: 'materialType', label: '文体', placeholder: '请选择文体', rows: 1, options: ['命题记叙', '半命题记叙', '材料议论', '任务驱动', '读后感', '游记', '微写作', '话题作文', '其他'] },
  {
    key: 'studentLevel',
    label: '学生水平',
    placeholder: '请选择学生水平',
    rows: 1,
    options: ['基础薄弱', '中等', '较好', '尖子生', '不确定'],
    control: 'combo',
    companionKey: 'studentLevelNote',
    companionLabel: '具体情况',
    companionPlaceholder: '例如：能写满字数，但结构松散；审题容易偏；语言有亮点但不稳定。',
  },
  {
    key: 'examPurpose',
    label: '目标',
    placeholder: '请选择目标',
    rows: 1,
    options: ['日常提升', '单元作文', '中考提优', '中考补差', '高考提分', '高考补差', '公开课展示', '校区课程交付', '其他'],
    control: 'combo',
    companionKey: 'examPurposeNote',
    companionLabel: '目标补充',
    companionPlaceholder: '例如：初三二轮复习，目标是把 42 分段稳定到 46 分以上。',
  },
  { key: 'specificGoal', label: '本次目的', placeholder: '写清本次要解决的具体问题。', rows: 2 },
];

const teachingContextFields: WorkbenchField[] = [
  ...commonContextFields,
  {
    key: 'classType',
    label: '班型',
    placeholder: '请选择班型',
    rows: 1,
    options: ['一对一', '小班', '中班', '大班', '临时拼班', '不确定'],
    control: 'combo',
    companionKey: 'classSize',
    companionLabel: '班型备注',
    companionPlaceholder: '可选：人数、学生差异、是否临时拼班，例如 6-8 人。',
  },
  {
    key: 'teachingVenue',
    label: '教学场景',
    placeholder: '请选择教学场景',
    rows: 1,
    options: ['学校课堂', '培训机构', '晚托班', '线上课', '公开课/展示课', '社团/讲座', '家庭辅导', '不确定'],
    control: 'combo',
    companionKey: 'lessonDuration',
    companionLabel: '场景备注',
    companionPlaceholder: '可选：课时、是否连堂、是否需要交付给家长，例如 90 分钟。',
  },
];

type SubCopy = {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  extraFields: WorkbenchField[];
  outputStructure: string;
};

const outputField = (options: string[]): WorkbenchField => ({
  key: 'output',
  label: '期望产出',
  placeholder: '请选择期望产出',
  rows: 1,
  options,
});

function getDraftRoundNumber(sub: string): number | null {
  if (sub === 'first-draft') return 1;
  if (sub === 'second-draft') return 2;
  if (sub === 'third-draft') return 3;

  const match = sub.match(/^draft-round-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function grade(sub: string): SubCopy {
  const essayPromptField: WorkbenchField = {
    key: 'prompt',
    label: '作文题 / 题干 / 材料',
    placeholder: '粘贴作文题或材料。没有题目也可留空，我会在批改里说明假设。',
    rows: 3,
  };
  const essayTextField: WorkbenchField = {
    key: 'text',
    label: '学生作文正文',
    placeholder: '粘贴学生作文原文。请保留原段落与口吻，不要替学生改写。',
    rows: 10,
  };

  const draftRound = getDraftRoundNumber(sub);
  if (draftRound && draftRound >= 2) {
    const isClosingRound = draftRound >= 3;
    const roundLabel = `第 ${draftRound} 稿`;
    return {
      title: `${roundLabel}反馈`,
      intro: `${roundLabel}不按固定套路处理。先对照上一轮任务，再根据老师写下的批改方法判断这一轮要推进、核查、收口还是继续训练。`,
      button: `生成${roundLabel}反馈`,
      prompt: `${roundLabel}反馈：先核对上一轮任务是否完成，再依据“本次目的/我的批改方法”执行。不要默认只有三稿；如果老师的方法要求继续多轮训练，就按该方法推进。`,
      extraFields: [
        {
          key: 'prompt',
          label: '上一稿布置的任务（可选）',
          placeholder: '例如：1) 开头删大词换成一个近景；2) 材料词"窗外"至少回环两次；3) 结尾收回到"我这一次"。',
          rows: 4,
        },
        {
          key: 'text',
          label: '本稿正文',
          placeholder: '粘贴学生这一稿的完整正文。',
          rows: 10,
        },
        outputField(['三份反馈（学生 + 老师 + 家长）', '只给学生看的那份', '只给老师看的那份（核查用）']),
      ],
      outputStructure: [
        '## 学生版',
        isClosingRound
          ? '（对照上一稿任务逐条看一遍；写一处本稿比上稿进步的地方；下一稿只挑最影响阅读的那一处，不再列第二件）'
          : '（对照上一稿任务逐条看一遍；写一处本稿比上稿进步的地方；下一稿只做一件事）',
        '',
        '## 教师版',
        '（按"任务 / 是否做到 / 证据在正文哪里"三列的形式给；说明为什么下一步只处理这一处）',
        '',
        '## 家长版',
        '（今晚能直接发家长的三段话：事实、进步、一件配合；≤150 字）',
      ].join('\n'),
    };
  }

  return {
    title: '批一篇作文（初稿）',
    intro: '把作文题和学生正文都贴进来。我会先把题目读通，再找亮点和最大问题，给学生、老师、家长三份可以直接用的反馈。',
    button: '开始批改',
    prompt: '请完整批改本次作文：先读通题目，再找亮点，再指出最大问题，输出学生 / 老师 / 家长三份反馈，再加"文学改进 / 应试得分"两行小结。',
    extraFields: [
      essayPromptField,
      essayTextField,
      outputField([
        '三份反馈（学生 + 老师 + 家长）',
        '只给学生看的那份',
        '只给老师看的那份',
        '只给家长看的那份',
      ]),
    ],
    outputStructure: [
      '请严格按以下四个二级标题的顺序输出，每段标题必须独占一行，前后各空一行：',
      '## 学生版',
      '（给学生看的旁批 + 总评三件套「我读到了什么 → 挡住阅读的是什么 → 下一稿只做一件事」+ 3 条以内修改任务，至少 1 条 10 分钟可完成）',
      '',
      '## 教师版',
      '（给老师的批改说明：题目的限制点、最能支撑立意的那句或几句、最需要动的一处、其他次要问题清单、旁批不超过 6 条、讲评用的一句板书金句）',
      '',
      '## 家长版',
      '（家长可直接读的三段短话：事实、进步、一件家庭配合；不超过 150 字，不制造焦虑）',
      '',
      '## 小结',
      '（【文学改进】与【应试得分】分两行，各一句；不承诺官方分数）',
    ].join('\n'),
  };
}

function parentTalk(sub: string): SubCopy {
  const sharedOutput = outputField([
    '按场景默认输出',
    '加一句可对孩子说的话',
    '加两条备选回复',
  ]);

  if (sub === 'consult-reply') {
    return {
      title: '回家长的咨询',
      intro: '把家长原话贴进来，再补一句老师自己这边的情况。我给一段得体、不焦虑、有分寸的回复。',
      button: '生成回应话术',
      prompt: '回复家长咨询：先接住情绪、再讲事实、再给一件可以配合的小事。不许诺、不堆术语。',
      extraFields: [
        { key: 'prompt', label: '家长原话（可选）', placeholder: '粘贴家长发来的微信/群消息原文。', rows: 4 },
        { key: 'text', label: '老师自己情况 / 背景补充', placeholder: '例如：这孩子最近哪次作文、课堂上什么样、想让家长配合什么。', rows: 5 },
        sharedOutput,
      ],
      outputStructure: [
        '请直接输出回复正文（不加二级标题）：',
        '第 1 段：接住家长情绪，一句话。',
        '第 2 段：说事实（孩子当前作文的真实状态，不夸大、不贬低）。',
        '第 3 段：说一件家里可配合的小事，只一件，具体到动作。',
        '（若用户选择"附加回应备选 2 条"，在最后给"备选话术 A / B"两版，各 ≤80 字）',
      ].join('\n'),
    };
  }

  if (sub === 'parent-meeting') {
    return {
      title: '家长会发言稿',
      intro: '3-5 分钟班级发言：本次作文的亮点、共性问题、下阶段家长可以配合的事。',
      button: '生成发言稿',
      prompt: '写一段家长会发言：只讲班级作文的事实和趋势，不点名、不贴标签。',
      extraFields: [
        { key: 'text', label: '本次作文的班级情况', placeholder: '例如：写了什么题、整体表现、Top3 共性问题、几位同学的进步方向。', rows: 6 },
        sharedOutput,
      ],
      outputStructure: [
        '请按 3-5 分钟口头发言节奏输出（可直接照着念）：',
        '1. 开场 · 30 秒',
        '2. 本次作文亮点 · 1 分钟',
        '3. 共性问题（不点名）· 1-2 分钟',
        '4. 下阶段家长可配合的 1-2 件具体事 · 1 分钟',
        '5. 结尾 · 一句话',
      ].join('\n'),
    };
  }

  if (sub === 'home-visit') {
    return {
      title: '家访谈话要点',
      intro: '登门前的提纲：先听什么、中间说什么、最后留下什么。',
      button: '生成家访要点',
      prompt: '生成家访谈话提纲：先倾听、再讲事实、最后给一件配合的小事。不做诊断、不贴标签。',
      extraFields: [
        { key: 'text', label: '学生情况 / 本次家访目的', placeholder: '孩子是谁、最近写作上的事实、家访想了解/想说的是什么。', rows: 6 },
        sharedOutput,
      ],
      outputStructure: [
        '## 倾听点（先问再说）',
        '3-5 个开放式问题，按顺序排列。',
        '',
        '## 要说的三件事',
        '只三件：事实 / 一处进步 / 一件家庭配合。',
        '',
        '## 留给家长的',
        '一句温和的、可转述给孩子的话。',
      ].join('\n'),
    };
  }

  if (sub === 'term-comment') {
    return {
      title: '期末评语',
      intro: '100-200 字的期末评语。温厚、具体，不贴标签。',
      button: '生成期末评语',
      prompt: '写 100-200 字期末评语：只讲可观察到的事实和一条往后能做的小事。不评定人格、不做横向对比。',
      extraFields: [
        { key: 'text', label: '学生本学期情况', placeholder: '姓名（可匿名）、课堂与作文上的事实、家长关心的点。', rows: 6 },
        sharedOutput,
      ],
      outputStructure: [
        '请直接输出 100-200 字评语（单段，不加小标题）：',
        '先写一个具体可观察的亮点，再写一处正在生长的变化，最后给一条下学期可做的小事。',
        '避免："聪明 / 懂事 / 有潜力 / 要加油"等抽象评价词。',
      ].join('\n'),
    };
  }

  if (sub === 'teaching-review') {
    return {
      title: '教研复盘',
      intro: '把一次课、一次批改或一轮训练复盘成事实、问题、证据和下一轮改进点。',
      button: '生成教研复盘',
      prompt: '生成教研复盘：只依据用户提供的教学事实，不空泛表扬，不写宣传话术；按问题、证据、下一步改进输出。',
      extraFields: [
        { key: 'background', label: '教学事实', placeholder: '本次课或本次批改做了什么：主题、材料、人数、课堂表现、完成情况。', rows: 6 },
        { key: 'text', label: '需要复盘的重点', placeholder: '例如：课堂节奏、学生不会写细节、讲评后任务完成度、家长反馈等。', rows: 4 },
        sharedOutput,
      ],
      outputStructure: [
        '## 本次完成了什么',
        '只写可观察事实。',
        '',
        '## 主要问题',
        '列 2-4 条，每条都说明证据。',
        '',
        '## 下一轮改进',
        '给 3 条以内具体动作，能直接安排到下一次课或下一次批改。',
      ].join('\n'),
    };
  }

  if (sub === 'course-report') {
    return {
      title: '课程交付说明',
      intro: '给校区、家长或教研负责人看的说明：本次做了什么、学生有什么变化、下一步做什么。',
      button: '生成交付说明',
      prompt: '生成课程交付说明：客观说明教学事实、学生表现和下一步安排；不夸大效果，不使用营销黑话。',
      extraFields: [
        { key: 'background', label: '本次交付事实', placeholder: '本次课/批改/训练完成了什么，使用了什么材料，学生完成情况如何。', rows: 6 },
        { key: 'text', label: '需要说明给谁看', placeholder: '例如：家长、校区负责人、课程顾问、教研组。可补充对方最关心的问题。', rows: 3 },
        sharedOutput,
      ],
      outputStructure: [
        '## 本次交付内容',
        '按事实列出做了什么。',
        '',
        '## 学生表现',
        '只写可观察变化和仍需处理的问题。',
        '',
        '## 下一步安排',
        '给清楚、可执行的后续动作。',
      ].join('\n'),
    };
  }

  return {
    title: '写给家长的话',
    intro: '生成家长可以直接看的三段话：事实、进步、一件配合。总字数 ≤150。',
    button: '生成家长反馈',
    prompt: '按三段话结构写家长反馈：事实、进步、一件配合；总字数 ≤150；不焦虑。',
    extraFields: [
      {
        key: 'text',
        label: '本次事实 / 作文亮点 / 需要家长配合的事',
        placeholder: '用几句话描述：孩子这次写了什么、有哪一处进步、希望家里配合什么（只做一件小事）。',
        rows: 6,
      },
      sharedOutput,
    ],
    outputStructure: [
      '请直接输出三段话（不加二级标题），每段不超过 50 字：',
      '第 1 段｜事实：孩子这次写了什么',
      '第 2 段｜进步：哪一处可观察的变化',
      '第 3 段｜配合：家里只做一件小事',
      '（若选择"附加一句可对孩子说的话"，在最后一行加一句温和肯定）',
    ].join('\n'),
  };
}

function homeworkFeedback(sub: string): SubCopy {
  const sharedOutput = outputField([
    '学生可读反馈',
    '课堂汇总',
    '学生反馈 + 教师汇总',
  ]);

  const meta: Record<string, { title: string; intro: string; button: string; prompt: string; targetHint: string; materialLabel: string; materialHint: string; structure: string }> = {
    'diary-feedback': {
      title: '检查日记 / 周记',
      intro: '看学生这次写了什么，先保护真实表达，再只钉一个具体问题。',
      button: '生成作业反馈',
      prompt: '检查日记或周记：先复述学生写的核心内容，再指出一枚主钉子，最后给 10 分钟能完成的小任务。',
      targetHint: '例如：只看是否有一个具体镜头；只看有没有把情绪写成场面。',
      materialLabel: '学生作业内容',
      materialHint: '粘贴学生日记、周记或一批作业摘录。保留学生原话，不要提前润色。',
      structure: [
        '## 学生反馈',
        '按“看见 / 一枚钉子 / 一小步”三段输出。',
        '',
        '## 教师记录',
        '说明本次只看了什么，其他问题暂不处理。',
      ].join('\n'),
    },
    'micro-writing-feedback': {
      title: '检查片段练笔',
      intro: '只按本次技法目标检查，不把立意、结构、语言全部混在一起改。',
      button: '生成练笔反馈',
      prompt: '检查片段练笔：必须围绕本次技法目标判断是否做到；只指出一个最需要改的动作。',
      targetHint: '例如：对话是否像人说话；描写是否有两种感官；开头是否从近景进入。',
      materialLabel: '练笔题目与学生片段',
      materialHint: '先写本次练笔要求，再粘贴学生片段。若是一批作业，可贴 3-5 个典型片段。',
      structure: [
        '## 目标核查',
        '判断本次练笔目标是否做到。',
        '',
        '## 学生反馈',
        '一句肯定 + 一个具体问题 + 一个 10 分钟微任务。',
        '',
        '## 教师汇总',
        '可用于课堂反馈的一句话。',
      ].join('\n'),
    },
    'excerpt-feedback': {
      title: '检查摘抄作业',
      intro: '不只看摘了没有，而是看学生能否说出一个字、一个词为什么好。',
      button: '生成摘抄反馈',
      prompt: '检查摘抄作业：围绕“好在哪里”和“能否接一句自己的话”反馈，不写空泛赞美。',
      targetHint: '例如：看学生是否能解释一个关键词；是否能仿写一句自己的话。',
      materialLabel: '摘抄内容与学生说明',
      materialHint: '粘贴摘抄句、篇名以及学生写的理由或仿写句。',
      structure: [
        '## 学生反馈',
        '指出摘抄选择是否有效，并追问一个字或一个词。',
        '',
        '## 下一步',
        '给一句仿写或接句任务。',
      ].join('\n'),
    },
    'reading-note-feedback': {
      title: '检查阅读札记',
      intro: '看短引、生活对应小事、判断或疑问三件事是否成立。',
      button: '生成札记反馈',
      prompt: '检查阅读札记：核查是否有短引原文、生活对应小事和一句判断或疑问。',
      targetHint: '例如：只看是否有短引；只看生活小事是否有画面。',
      materialLabel: '阅读札记内容',
      materialHint: '粘贴学生札记，最好包含原文短引和学生自己的感想。',
      structure: [
        '## 札记核查',
        '短引 / 小事 / 判断或疑问，逐项说明。',
        '',
        '## 修改任务',
        '只给一个可补写的小任务。',
      ].join('\n'),
    },
    'class-summary-feedback': {
      title: '全班作业汇总',
      intro: '把一批作业整理成课堂可反馈的三行：亮点、共性问题、下周小目标。',
      button: '生成作业汇总',
      prompt: '生成全班作业汇总：只依据样本，提炼本周亮点、共性问题和下周一个小目标。',
      targetHint: '例如：整理 5 份样本，看本周共性问题；给下周一个训练目标。',
      materialLabel: '作业样本 / 摘录',
      materialHint: '粘贴 3-8 份典型作业摘录，或先写你观察到的共性情况。',
      structure: [
        '## 本周亮点',
        '一行，具体到表现。',
        '',
        '## 共性问题',
        '最多 3 条，每条配证据。',
        '',
        '## 下周一个小目标',
        '只定一个可训练目标。',
      ].join('\n'),
    },
  };

  const pick = meta[sub] || meta['diary-feedback'];
  return {
    title: pick.title,
    intro: pick.intro,
    button: pick.button,
    prompt: pick.prompt,
    extraFields: [
      {
        key: 'specificGoal',
        label: '本次检查重点',
        placeholder: pick.targetHint,
        rows: 2,
      },
      {
        key: 'text',
        label: pick.materialLabel,
        placeholder: pick.materialHint,
        rows: 8,
      },
      sharedOutput,
    ],
    outputStructure: pick.structure,
  };
}

function teachPrompt(sub: string): SubCopy {
  const sharedOutput = outputField([
    '默认输出',
    '加板书金句',
    '加学生训练任务',
  ]);

  if (sub === 'teach-writing') {
    return {
      title: '教一道作文题',
      intro: '把作文题或训练目标贴进来。我给审题路径、示范片段、给学生的训练任务，不代写整篇。',
      button: '生成写作指导方案',
      prompt: '按"拆题 → 审题路径 → 示范片段 → 训练任务"四步给写作指导。示范单段 ≤200 字。',
      extraFields: [
        {
          key: 'prompt',
          label: '作文题 / 训练目标',
          placeholder: '粘贴作文题原文，或用一句话说明本次训练目标（例如：练好材料作文首段的材料回环）。',
          rows: 4,
        },
        sharedOutput,
      ],
      outputStructure: [
        '## 审题路径',
        '（标出题目里的限制、任务、关键词；给 1-3 条可讲的审题路径，每条标注风险）',
        '',
        '## 示范片段',
        '（老师用片段，单段不超过 200 字，开头加〔示范〕标签；可给 2-3 个不同方向的开头或过渡）',
        '',
        '## 训练任务',
        '（3 条以内学生训练任务，至少 1 条 10 分钟可完成；每条写明怎么评）',
      ].join('\n'),
    };
  }

  if (sub === 'review-class') {
    return {
      title: '上一节讲评课',
      intro: '把共性问题或几份典型作文贴进来。我给讲评流程、板书金句、课堂小练、课后作业闭环。',
      button: '生成讲评方案',
      prompt: '按"共性问题诊断 → 课堂流程 → 板书金句 → 小练 → 课后作业"生成讲评方案。',
      extraFields: [
        {
          key: 'prompt',
          label: '作文题 / 本次训练材料（可选）',
          placeholder: '若本节讲评围绕某一道题或某一类材料，粘贴在这里。',
          rows: 3,
        },
        {
          key: 'text',
          label: '共性问题 / 典型作文摘录',
          placeholder: '用几句话说明本次作文的 Top3 共性问题，或粘贴 2-3 段典型作文片段。',
          rows: 8,
        },
        sharedOutput,
      ],
      outputStructure: [
        '## 学生版',
        '（给学生看的 Top3 问题 + 每条问题对应一句"下一步怎么改"的动作）',
        '',
        '## 教师版',
        '（讲评流程：开场 → 读原文片段 → 指出问题 → 小练 → 课后作业；含时间分配与板书要点；5-8 句可投影的板书金句单独列出）',
        '',
        '## 家长版',
        '（一段给家长的简报：本次讲评做了什么、孩子下一步要做什么；≤150 字）',
        '',
        '## 课堂活动闭环',
        '（小练题目 + 课后作业 + 下一稿任务）',
      ].join('\n'),
    };
  }

  return {
    title: '拆一道作文题',
    intro: '只有作文题或材料，没有学生作文。我把题目的限制、任务、关键词理清楚，给可讲的审题路径。',
    button: '拆题并给审题路径',
    prompt: '拆题：列出限制、任务、关键词；给 1-3 条可讲的审题路径；再给方向级的素材提示。',
    extraFields: [
      {
        key: 'prompt',
        label: '作文题 / 材料',
        placeholder: '粘贴作文题原文或材料（含引导语）。',
        rows: 6,
      },
      sharedOutput,
    ],
    outputStructure: [
      '## 题目拆解',
      '（限制、任务、关键词，逐项列出并引用原文）',
      '',
      '## 审题路径',
      '（1-3 条可讲的路径，每条标注风险与典型跑偏方式）',
      '',
      '## 素材方向',
      '（按方向给 3-5 组，每组一句话说明为何可用；不代写具体事例）',
    ].join('\n'),
  };
}

function prepareLesson(sub: string): SubCopy {
  const sharedOutput = outputField(['完整版', '精简版（只给核心结构）']);
  const commonExtras: WorkbenchField[] = [
    {
      key: 'prompt',
      label: '作文题 / 本次训练材料（可选）',
      placeholder: '如果这次备课围绕一道题，粘贴在这里；否则留空。',
      rows: 3,
    },
  ];
  const textField = (hint: string): WorkbenchField => ({
    key: 'text',
    label: '本次素材',
    placeholder: hint,
    rows: 8,
  });

  if (sub === 'make-lesson-plan') {
    return {
      title: '写一份教案',
      intro: '按一线语文教案格式交付：目标、重难点、环节时长、板书、作业、反思留白。',
      button: '生成教案',
      prompt: '按一线语文教案格式直出：目标、重难点、环节、板书、作业、反思。环节时长合计约 40 分钟。不反问背景。',
      extraFields: [
        ...commonExtras,
        textField('贴上本课的共性问题或讲评内容。如果只是写指导课，告诉我训练目标即可。'),
        sharedOutput,
      ],
      outputStructure: [
        '## 讲评教案',
        '按以下结构输出（标题 + 行，不用 Markdown 表格）：',
        '【教学目标】3 条以内，行为动词开头',
        '【教学重点/难点】各 1 条',
        '【教学准备】材料清单',
        '【教学过程】按环节列出：环节名 / 时长 / 师生活动 / 设计意图',
        '【板书设计】分栏说明',
        '【作业布置】学生修改任务（3 条以内，至少 1 条 10 分钟可完成）',
        '【教学反思】留 2-3 行空白',
      ].join('\n'),
    };
  }

  if (sub === 'make-handout') {
    return {
      title: '印一份讲义',
      intro: '学生手里的讲义：审题提示 + 示范片段 + 练笔小任务 + 修改自评。留出动笔空位。',
      button: '生成学生讲义',
      prompt: '按学生讲义格式直出：审题提示、示范片段、练笔、修改自评；示范段加〔示范〕标签并留动笔空位。',
      extraFields: [
        ...commonExtras,
        textField('贴上作文题，必要时加一段你想演示的典型片段。'),
        sharedOutput,
      ],
      outputStructure: [
        '## 学生讲义',
        '【今天我们要做什么】一句话',
        '【作文题回顾】完整引用题干',
        '【审题提示】限制、任务、关键词三行',
        '【示范片段 · 老师批注】最多 2 段示范，每段 ≤200 字，注〔示范〕',
        '【动手练一练】2-3 道小练笔，每道留 5-8 行写作空位',
        '【下一稿任务】3 条以内',
      ].join('\n'),
    };
  }

  if (sub === 'make-script') {
    return {
      title: '写一段逐字稿',
      intro: '按分钟段落输出课堂逐字稿，含过渡语、提问、停顿与投影话术。老师第一人称。',
      button: '生成逐字稿',
      prompt: '按老师第一人称输出课堂逐字稿：含过渡、提问、停顿标记（……）；不编造学生回答。',
      extraFields: [
        ...commonExtras,
        textField('告诉我这一段要讲什么：共性问题、示范修改，还是课堂小练。'),
        sharedOutput,
      ],
      outputStructure: [
        '## 课堂逐字稿',
        '按时间段分块输出 10-15 分钟：',
        '【0-2 分】开场导入',
        '【2-6 分】读原文选段 + 找亮点 + 指出最大问题',
        '【6-10 分】小练（给指令 + 巡场话术 + 示范修改）',
        '【10-14 分】讲评总结 + 板书金句',
        '【14-15 分】布置下一稿任务',
      ].join('\n'),
    };
  }

  if (sub === 'make-worksheet') {
    return {
      title: '随堂学案',
      intro: '导学问题 + 课堂任务 + 自评 + 反思，一张纸用到底。',
      button: '生成学案',
      prompt: '按随堂学案格式直出：导学问题、课堂任务、自评清单、反思留白。',
      extraFields: [
        ...commonExtras,
        textField('告诉我这节课的训练目标与关键材料。'),
        sharedOutput,
      ],
      outputStructure: [
        '## 随堂学案',
        '【导学问题】3-5 问，指向本课核心',
        '【课堂任务】2-3 项，含指令与时间',
        '【自评清单】3 条以内，可打勾',
        '【今日反思】留 3-5 行空白',
      ].join('\n'),
    };
  }

  return {
    title: '做一份课件',
    intro: '告诉我这节课要教什么，我给 8-12 页 PPT 骨架，每页可以直接抄到 PPT。',
    button: '生成课件骨架',
    prompt: '按 PPT 骨架格式直出：每页标题 + 要点 + 板书提示 + 过渡语。不反问背景。',
    extraFields: [
      ...commonExtras,
      textField('写下这节课的 Top3 问题、几段典型学生作文、或你想讲的几个要点。'),
      sharedOutput,
    ],
    outputStructure: [
      '## 课件 PPT 骨架',
      '输出 8-12 页 PPT 骨架，每页格式：',
      'Page N｜页面标题',
      '- 要点 1',
      '- 要点 2',
      '【板书提示】一行',
      '【过渡到下一页】一句',
      '（首页：导入；2-3 页：共性问题；4-6 页：示范与修改；7-9 页：小练；末页：课后作业）',
    ].join('\n'),
  };
}

function makePaper(sub: string): SubCopy {
  const sharedOutput = outputField([
    '题目 + 命题说明 + 评分参考',
    '只出题目',
    '题目 + 评分参考 + 常见失分点',
  ]);

  const meta: Record<string, { title: string; intro: string; button: string; hint: string; structure: string }> = {
    'monthly-exam': {
      title: '月考作文',
      intro: '一篇大作文题：原题 + 命题说明 + 评分参考。可附学情约束。',
      button: '生成月考作文卷',
      hint: '写下你希望考的写作能力、主题方向，或参考题、已知学情限制。',
      structure: [
        '## 作文题',
        '【题目 / 材料】完整呈现',
        '【要求】字数、文体、禁区',
        '',
        '## 命题说明（给老师看）',
        '考查能力 / 预设难点 / 命题意图 / 避开的套路',
        '',
        '## 评分参考',
        '分层描述（优 / 良 / 中 / 基础），每层给 2-3 条可观察特征；不给官方分值细则',
      ].join('\n'),
    },
    'weekly-quiz': {
      title: '周测小作文',
      intro: '一道微写作 200-400 字 + 要点提示。',
      button: '生成周测微写作',
      hint: '本周你想测的写作能力点或情境。',
      structure: [
        '## 微写作题',
        '【情境 / 要求】一段',
        '【字数】200-400 字',
        '',
        '## 要点提示（给老师参考）',
        '3 条以内，每条 ≤20 字',
      ].join('\n'),
    },
    'daily-homework': {
      title: '日常作业',
      intro: '一个当日作业：题目 + 写作提示 + 交付要求。',
      button: '生成日常作业',
      hint: '今天/本周你在讲什么，学生需要练哪一点。',
      structure: [
        '## 今日作业',
        '【题目】一句话',
        '【写作提示】2-3 条具体动作',
        '【交付要求】字数 / 截止 / 提交方式',
      ].join('\n'),
    },
    'focused-drill': {
      title: '专项训练',
      intro: '围绕一个写作技能的 3-5 题小练习。',
      button: '生成专项训练',
      hint: '要练哪一项技能：如细节描写、材料回环、议论段起承等。',
      structure: [
        '## 专项训练',
        '围绕一个技能点，出 3-5 道小练笔：',
        '每题：【题干】+【要求】+【评改指引】',
      ].join('\n'),
    },
    'in-class-drill': {
      title: '随堂小练',
      intro: '10 分钟课堂小练 + 评改指引。',
      button: '生成随堂小练',
      hint: '这 10 分钟你想让学生练什么。',
      structure: [
        '## 随堂 10 分钟小练',
        '【题干】一段',
        '【要求】字数 / 限制条件',
        '【巡场话术】2-3 句',
        '【评改指引】3 条以内',
      ].join('\n'),
    },
    'exam-improve': {
      title: '中高考提分训练',
      intro: '面向有一定基础的学生，围绕审题、结构、材料使用和语言稳定性设计提分任务。',
      button: '生成提分训练',
      hint: '写清考试类型、当前分数段、最容易丢分的环节和目标分数段。',
      structure: [
        '## 训练目标',
        '说明本轮训练解决哪一个得分问题，不超过 3 条。',
        '',
        '## 题目与任务',
        '给 2-4 个训练任务，按由易到难排列。',
        '',
        '## 评分参考',
        '列出可观察的得分表现和常见失分点，不承诺官方分数。',
        '',
        '## 课堂使用建议',
        '说明适合课上讲、课后练还是一对一订正。',
      ].join('\n'),
    },
    'remedial-support': {
      title: '中高考补差训练',
      intro: '面向基础薄弱学生，把任务拆小，先解决能写完、能扣题、结构清楚的问题。',
      button: '生成补差训练',
      hint: '写清学生最困难的地方，例如写不满、审题偏、段落混乱、语言病句多。',
      structure: [
        '## 保底目标',
        '写清本次只保哪几个底线动作。',
        '',
        '## 分步任务',
        '给 3-5 个低门槛任务，每一步都能在 10-15 分钟内完成。',
        '',
        '## 老师检查点',
        '列出课堂上最容易检查的证据。',
        '',
        '## 家庭配合',
        '只给一件家庭可配合的小事。',
      ].join('\n'),
    },
  };

  const pick = meta[sub] || meta['monthly-exam'];
  return {
    title: pick.title,
    intro: pick.intro,
    button: pick.button,
    prompt: '请按所选卷子类型直接出题；不预测官方阅卷口径；不假称课标原文。',
    extraFields: [
      {
        key: 'goal',
        label: '考查目的 / 训练点',
        placeholder: '例如：叙事中加入细节；议论段起承；材料作文回环。',
        rows: 2,
      },
      {
        key: 'text',
        label: '命题参考材料（可选）',
        placeholder: pick.hint,
        rows: 5,
      },
      sharedOutput,
    ],
    outputStructure: pick.structure,
  };
}

function makeMaterial(sub: string): SubCopy {
  const sharedOutput = outputField([
    '分类清单',
    '分类清单 + 示范句',
    '主题卡片（可发学生）',
  ]);

  const meta: Record<string, { title: string; intro: string; button: string; structure: string }> = {
    'figure-examples': {
      title: '人物事例库',
      intro: '围绕一个主题给 5-8 位可用人物，含一句话点评与可用角度。',
      button: '生成事例库',
      structure: [
        '## 人物事例库',
        '按顺序给 5-8 位：',
        '【人物】一句话标签',
        '【事实一句】',
        '【可用角度】记叙/议论分别怎么用',
      ].join('\n'),
    },
    'imagery-bank': {
      title: '意象 / 细节库',
      intro: '记叙文常用意象、感官细节、场面调度模板。',
      button: '生成意象库',
      structure: [
        '## 意象 / 细节库',
        '【视觉】5 条',
        '【听觉】5 条',
        '【嗅觉/味觉】3-5 条',
        '【触觉 / 体感】3-5 条',
        '【场面调度】3-5 个句式模板',
      ].join('\n'),
    },
    'quote-bank': {
      title: '金句 / 过渡句',
      intro: '开头、过渡、升华句式模板，分文体给。',
      button: '生成金句库',
      structure: [
        '## 句式模板',
        '【开头句】5-8 条 · 分记叙/议论',
        '【过渡句】5-8 条',
        '【升华句】3-5 条',
        '每条附一句示例',
      ].join('\n'),
    },
    'theme-pack': {
      title: '主题素材包',
      intro: '围绕一个主题给"事例+意象+金句"三件套。',
      button: '生成主题包',
      structure: [
        '## 主题素材包',
        '围绕用户给定主题输出：',
        '【核心立意】2-3 种角度',
        '【人物事例】3-5 位',
        '【意象 / 细节】5-8 条',
        '【金句模板】3-5 条',
      ].join('\n'),
    },
    'news-material': {
      title: '时事素材',
      intro: '按主题提取近年可引用的时事方向（方向级，不编造细节）。',
      button: '生成时事方向',
      structure: [
        '## 时事方向清单',
        '只到方向级，不编造具体人物台词或时间细节。',
        '每条：【方向】+【可用角度】+【风险提示】',
      ].join('\n'),
    },
  };

  const pick = meta[sub] || meta['figure-examples'];
  return {
    title: pick.title,
    intro: pick.intro,
    button: pick.button,
    prompt: '请按素材清单格式输出；不编造具体事实细节；时事到方向级即可。',
    extraFields: [
      {
        key: 'prompt',
        label: '主题 / 关键词（可选）',
        placeholder: '例如：坚持、故乡、科技与人、一张旧照片……',
        rows: 2,
      },
      {
        key: 'text',
        label: '文体 / 使用场景（可选）',
        placeholder: '例如：初三记叙文开头可用；高中议论文事例。',
        rows: 2,
      },
      sharedOutput,
    ],
    outputStructure: pick.structure,
  };
}

function dispatchSub(taskId: QingheWritingTaskId, sub: string): SubCopy {
  switch (taskId) {
    case 'grade-essay':
      return grade(sub);
    case 'homework-feedback':
      return homeworkFeedback(sub);
    case 'teach-prompt':
      return teachPrompt(sub);
    case 'lesson-delivery':
      return prepareLesson(sub);
    case 'make-paper':
      return makePaper(sub);
    case 'make-material':
      return makeMaterial(sub);
    case 'teaching-operations':
      return parentTalk(sub);
  }
}

export function getQingheWritingWorkbenchCopy(taskId: QingheWritingTaskId, sub: string): WorkbenchCopy {
  const task = getQingheWritingTask(taskId);
  const c = dispatchSub(taskId, sub);
  const needsTeachingContext = taskId === 'lesson-delivery' || (taskId === 'teach-prompt' && sub === 'review-class');
  const contextFields = taskId === 'teaching-operations'
    ? []
    : needsTeachingContext
      ? teachingContextFields
      : commonContextFields;
  return {
    title: c.title,
    intro: c.intro,
    button: c.button,
    prompt: c.prompt,
    outputFallback: task.outputOptions[0],
    fields: [...contextFields, ...c.extraFields.filter(f => f.key !== 'output')],
  };
}

export function buildQingheWritingMessage(
  taskId: QingheWritingTaskId,
  sub: string,
  workbench: WorkbenchValues,
  userText: string,
  methodNote: string,
  outputFallback: string,
): string {
  void outputFallback;
  const c = dispatchSub(taskId, sub);
  const task = getQingheWritingTask(taskId);
  const subDef = task.subOptions?.find(s => s.id === sub);
  const draftRound = taskId === 'grade-essay' ? getDraftRoundNumber(sub) : null;
  const subLabel = subDef?.label || (draftRound ? `第 ${draftRound} 稿` : '');
  const contextLines = [
    `沟通对象：${workbench.clientName || '未填写'}`,
    `年级：${workbench.grade || '未填写'}`,
    `地区：${workbench.region || '未填写'}`,
    `教材版本：${workbench.textbook || '未填写'}`,
    `文体：${workbench.materialType || '未填写'}`,
    `学生水平：${workbench.studentLevel || '未填写'}`,
    `学生具体情况：${workbench.studentLevelNote || '未填写'}`,
    `目标：${workbench.examPurpose || '未填写'}`,
    `目标补充：${workbench.examPurposeNote || '未填写'}`,
    `本次目的：${workbench.specificGoal || '未填写'}`,
    `教学事实：${workbench.background || '未填写'}`,
    `班型：${workbench.classType || '未填写'}`,
    `人数与差异：${workbench.classSize || '未填写'}`,
    `教学场景：${workbench.teachingVenue || '未填写'}`,
    `课时与交付要求：${workbench.lessonDuration || '未填写'}`,
  ];

  const customMethod = methodNote.trim();
  if (customMethod) {
    contextLines.push(`老师自定义方法：${customMethod}`);
  }

  const fieldBlocks: string[] = [];
  for (const f of c.extraFields) {
    if (f.key === 'output') continue;
    const val = (workbench[f.key] || '').trim();
    fieldBlocks.push(`【${f.label}】`);
    fieldBlocks.push(val || '（未填写，可直接留空）');
    fieldBlocks.push('');
  }

  return [
    userText.trim(),
    '',
    `【青禾工作台 · ${task.label}${subLabel ? ' · ' + subLabel : ''}】`,
    ...contextLines,
    '',
    ...fieldBlocks,
    '【指令】',
    c.prompt,
    '',
    '【边界要求】',
    '表单字段都可留空；如果上传了附件，请优先读附件并把它当成核心材料；只做作文批改与写作教学相关工作；不冒充官方阅卷组；不编造事实细节；不代写整篇可提交作文。',
    '',
    '【输出结构 · 严格遵守】',
    c.outputStructure,
  ].join('\n');
}

export function validateQingheWritingInput(
  taskId: QingheWritingTaskId,
  sub: string,
  workbench: WorkbenchValues,
): string | null {
  void taskId;
  void sub;
  void workbench;
  return null;
}
