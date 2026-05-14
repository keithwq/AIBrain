import { getAnranLaoshiTask, type AnranLaoshiTaskId } from './anranLaoshiTasks';

export type AnranLaoshiFieldKey = 'situation' | 'original_words' | 'output';

export interface WorkbenchField {
  key: AnranLaoshiFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
  options?: string[];
  control?: 'select' | 'combo' | 'textarea' | 'input';
}

export type AnranLaoshiWorkbenchValues = Record<AnranLaoshiFieldKey, string>;

export interface AnranLaoshiWorkbenchCopy {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  outputFallback: string;
  fields: WorkbenchField[];
  outputStructure: string;
}

type TaskCopy = {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  outputStructure: string;
};

const promptByTask: Record<AnranLaoshiTaskId, TaskCopy> = {
  'emotion-settle': {
    title: '状态整理',
    intro: '填写当前情况，系统会整理短时处理步骤和后续注意事项。',
    button: '生成处理步骤',
    prompt: '根据用户描述，客观整理当前状态；给一个 1-3 分钟的具体练习（步骤清晰，每步一行）；给一个当天可执行的后续动作。不使用口号化表达，不制造虚假积极，不承诺结果。',
    outputStructure: '当前状态简述（不做诊断）\n\n处理步骤（标题：可执行步骤）\n每步一行，用数字编号\n\n后续动作（标题：后续动作）\n一句话，具体到动作',
  },
  'comfort-others': {
    title: '陪伴话术',
    intro: '填写对方情况，系统会生成可发送文本、禁用表达和必要的风险边界。',
    button: '生成沟通文本',
    prompt: '给 2-3 个可直接发送的陪伴文本版本，标注“更简短/更温和/更有力量”的差异；给一个不该说的话清单（3 条以内，每条说明为什么不该说）；如有危机信号，加危机边界提醒和危机热线。',
    outputStructure: '可发送文本（标题，下面给 2-3 个版本，每个版本前标注“更简短/更温和/更有力量”）\n\n禁用表达（标题，3 条以内，每条说明原因）\n\n如有危机信号：风险边界（标题，给危机热线和建议）',
  },
  'conflict-cool': {
    title: '冲突沟通',
    intro: '填写原话或情况，系统会分析沟通风险并生成替代表达。',
    button: '生成替代表达',
    prompt: '先用 1-2 句分析原话哪里容易造成沟通风险；给 2-3 个替代表达，标注“更坚定/更柔和/更简短”；最后加一句暂停提醒（在情绪最高点不回应的建议）。',
    outputStructure: '这句话的沟通风险（标题，1-2 句分析）\n\n替代表达（标题，2-3 个版本，每个前标注“更坚定/更柔和/更简短”）\n\n暂停提醒（标题，一句话）',
  },
  'relationship-repair': {
    title: '关系沟通',
    intro: '填写事件和关系背景，系统会生成开场文本和下一步沟通结构。',
    button: '生成沟通文本',
    prompt: '给 2-3 个开场文本版本；给把指责句改成感受句的话术示例；给下一次沟通的一个小建议（只一个，具体到动作）。',
    outputStructure: '开场文本（标题，2-3 个版本）\n\n说感受不审判（标题，把指责句改成感受句的示例）\n\n下一步（标题，一个具体动作）',
  },
  'sleep-settle': {
    title: '睡前整理',
    intro: '填写睡前状态，系统会整理可执行的放松步骤。',
    button: '生成睡前步骤',
    prompt: '给一段可以跟着做的身体扫描引导，从脚趾开始逐步向上，每个部位一行；给处理睡前念头的一句话；语气要缓慢、温和，不要有任何压迫感。',
    outputStructure: '直接输出引导文字，不加标题，语气温和，每个身体部位一行，最后一句处理念头的话',
  },
  'mindful-practice': {
    title: '短时练习',
    intro: '选择一个可立即执行的练习类型。只给步骤，不讲理论。',
    button: '生成练习步骤',
    prompt: '给练习名称、适合场景、用时、具体步骤（每步一行，动作要具体）、不适合情况。不讲理论，不讲任何宗教内容，步骤要让人可以立刻跟着做。',
    outputStructure: '练习名称（标题）\n适合场景：一句话\n用时：X 分钟\n步骤：每步一行，数字编号\n不适合情况：一句话',
  },
};

const situationField: WorkbenchField = {
  key: 'situation',
  label: '情况描述',
  placeholder: '简要描述当前情况、触发事件或需要处理的问题。',
  rows: 6,
};

const originalWordsField: WorkbenchField = {
  key: 'original_words',
  label: '原话或情况',
  placeholder: '把原话、拟发送内容或已经发生的情况放在这里。没有原话也可以描述事实。',
  rows: 4,
};

const backgroundField: WorkbenchField = {
  key: 'situation',
  label: '补充背景（可选）',
  placeholder: '说明关系、场景和已经发生的关键事实即可。',
  rows: 3,
};

const outputField = (options: string[]): WorkbenchField => ({
  key: 'output',
  label: '交付类型',
  placeholder: '请选择交付类型',
  rows: 1,
  options,
});

export function getAnranLaoshiWorkbenchCopy(taskId: AnranLaoshiTaskId): AnranLaoshiWorkbenchCopy {
  const task = getAnranLaoshiTask(taskId);
  const copy = promptByTask[taskId];
  const fields = taskId === 'conflict-cool' || taskId === 'relationship-repair'
    ? [originalWordsField, backgroundField, outputField(task.outputOptions)]
    : [situationField, outputField(task.outputOptions)];

  return {
    title: copy.title,
    intro: copy.intro,
    button: copy.button,
    prompt: copy.prompt,
    outputFallback: task.outputOptions[0],
    fields,
    outputStructure: copy.outputStructure,
  };
}

export function buildAnranLaoshiMessage(
  taskId: AnranLaoshiTaskId,
  sub: string,
  workbench: AnranLaoshiWorkbenchValues,
  userText: string,
  _methodNote: string,
  _outputFallback: string,
): string {
  const task = getAnranLaoshiTask(taskId);
  const subDef = task.subOptions?.find(item => item.id === sub);
  const copy = promptByTask[taskId];

  return [
    userText.trim(),
    '',
    `【安然老师工作台 · ${task.label}${subDef ? ' · ' + subDef.label : ''}】`,
    `当前状态：${workbench.situation || '未填写'}`,
    `原话或情况：${workbench.original_words || '未填写'}`,
    `交付类型：${workbench.output || task.outputOptions[0]}`,
    '',
    '【指令】',
    copy.prompt,
    '',
    '【边界要求】',
    '只做状态整理、关系沟通、压力舒缓、冲突降温、短时练习相关工作；不做医学诊断；不替代心理治疗；遇到自伤、自杀、家暴等危机信号，先确认安全，给出危机资源，再停止练习建议；不用抽象口号掩盖现实危险；不输出鸡汤；不说教。',
    '',
    '【输出结构 · 严格遵守】',
    copy.outputStructure,
  ].join('\n');
}

export function validateAnranLaoshiInput(
  _taskId: AnranLaoshiTaskId,
  _sub: string,
  _workbench: AnranLaoshiWorkbenchValues,
): string | null {
  return null;
}
