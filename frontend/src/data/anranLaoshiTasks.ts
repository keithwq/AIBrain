export type AnranLaoshiTaskId =
  | 'emotion-settle'
  | 'comfort-others'
  | 'conflict-cool'
  | 'relationship-repair'
  | 'sleep-settle'
  | 'mindful-practice';

export interface AnranLaoshiSubOption {
  id: string;
  label: string;
  hint: string;
}

export interface AnranLaoshiTaskDef {
  id: AnranLaoshiTaskId;
  label: string;
  headline: string;
  description: string;
  subOptions?: AnranLaoshiSubOption[];
  subOptionLabel?: string;
  quickQuestions: string[];
  outputOptions: string[];
  tip: string;
}

export const ANRAN_LAOSHI_TASKS: AnranLaoshiTaskDef[] = [
  {
    id: 'emotion-settle',
    label: '状态整理',
    headline: '当前反应、触发因素、处理步骤',
    description: '根据用户描述整理当前状态、短时处理步骤和后续注意事项。',
    subOptionLabel: '咨询事项',
    subOptions: [
      { id: 'anxiety', label: '持续担心', hint: '担心事项较多，注意力难以回到当前任务' },
      { id: 'anger', label: '反应强烈', hint: '对某件事反应明显，需要先降低表达升级风险' },
      { id: 'sadness', label: '低落反应', hint: '精力下降，表达意愿或行动意愿减弱' },
      { id: 'rumination', label: '反复回想', hint: '反复回看同一事件，难以形成下一步判断' },
    ],
    quickQuestions: ['请根据我现在的情况，整理一个短时处理步骤。', '我现在反应比较强烈，请帮我先做表达降温。', '我反复想着一件事，请帮我整理下一步。'],
    outputOptions: ['状态简述 + 处理步骤 + 后续动作', '简短版本', '可保存的说明文本'],
    tip: '填写当前情况即可，不需要一次写完整。',
  },
  {
    id: 'comfort-others',
    label: '陪伴话术',
    headline: '关系对象、沟通边界、可发送文本',
    description: '根据对方情况生成可发送文本、禁用表达和必要的风险边界。',
    subOptionLabel: '关系对象',
    subOptions: [
      { id: 'friend-depressed', label: '朋友状态低落', hint: '不知道如何陪伴' },
      { id: 'partner-upset', label: '伴侣情绪低落', hint: '表达容易失效，需要更克制的文本' },
      { id: 'family-stressed', label: '家人压力较大', hint: '需要避免说错话或增加负担' },
      { id: 'child-struggling', label: '孩子情绪失控', hint: '需要先处理安全和表达边界' },
    ],
    quickQuestions: ['请帮我生成一段适合发给朋友的陪伴文本。', '请把我想说的话改成更稳妥的表达。', '请列出这类情况不适合说的话。'],
    outputOptions: ['可发送文本（2-3 个版本）', '沟通文本 + 禁用表达', '增加风险边界提醒'],
    tip: '说明对方情况和关系即可，文本会按可直接发送的标准整理。',
  },
  {
    id: 'conflict-cool',
    label: '冲突沟通',
    headline: '原话分析、替代表达、暂停建议',
    description: '分析原话的沟通风险，生成更稳妥的替代表达。',
    subOptionLabel: '沟通类型',
    subOptions: [
      { id: 'want-to-retort', label: '想回应但担心升级', hint: '被激怒后想表达，需要控制关系损耗' },
      { id: 'said-something-hurtful', label: '已说出不当表达', hint: '已经说出口，需要补救文本' },
      { id: 'want-to-refuse', label: '需要拒绝', hint: '不想答应，但需要保留基本边界' },
      { id: 'being-misunderstood', label: '被误解', hint: '需要解释事实，同时避免继续扩大冲突' },
    ],
    quickQuestions: ['请把这句话改成更稳妥的表达。', '请分析这段话可能带来的沟通风险。', '请帮我写一段拒绝但不升级冲突的回复。'],
    outputOptions: ['风险点分析 + 2-3 个替代表达', '最简短版本', '增加暂停提醒'],
    tip: '把原话或情况贴进来，我会按沟通风险和替代表达整理。',
  },
  {
    id: 'relationship-repair',
    label: '关系沟通',
    headline: '开场文本、需求表达、沟通结构',
    description: '生成适合重新开启沟通的文本，并控制指责、翻旧账和升级风险。',
    subOptionLabel: '沟通场景',
    subOptions: [
      { id: 'cold-war', label: '长时间未沟通', hint: '需要打破僵局的第一句话' },
      { id: 'want-to-apologize', label: '需要道歉', hint: '承认具体问题，同时避免过度辩解' },
      { id: 'recurring-argument', label: '反复争执', hint: '同一问题反复出现，需要建立沟通结构' },
      { id: 'want-to-express-needs', label: '需要表达诉求', hint: '有明确需求，但担心对方抵触' },
    ],
    quickQuestions: ['请帮我写一段重新开启沟通的开场文本。', '请把道歉内容改得具体、克制一些。', '请帮我整理一次沟通结构。'],
    outputOptions: ['开场文本（2-3 个版本）', '需求表达话术', '增加沟通结构建议'],
    tip: '说明发生了什么和对方关系即可。',
  },
  {
    id: 'sleep-settle',
    label: '睡前整理',
    headline: '睡前状态、身体放松、念头处理',
    description: '整理睡前可执行的放松步骤和念头处理方式，不做医学判断。',
    subOptions: [],
    quickQuestions: ['我睡不着，脑子一直转。', '躺下来就开始想很多事。', '明天有重要的事，越想越睡不着。'],
    outputOptions: ['身体放松引导（5-10 分钟）', '短时呼吸步骤', '简短说明文本'],
    tip: '填写睡前状态即可。',
  },
  {
    id: 'mindful-practice',
    label: '短时练习',
    headline: '呼吸、行走、暂停、身体扫描',
    description: '提供具体可操作的短时练习步骤，不讲理论，不涉及宗教内容。',
    subOptionLabel: '练习类型',
    subOptions: [
      { id: 'breathing', label: '呼吸练习', hint: '3-5 分钟，随时可做' },
      { id: 'walking', label: '行走练习', hint: '放慢脚步，感受脚底' },
      { id: 'bell', label: '暂停练习', hint: '用一个日常声音作为暂停信号' },
      { id: 'body-scan', label: '身体扫描', hint: '从脚趾到头顶，逐步放松' },
    ],
    quickQuestions: ['请给我一个 5 分钟以内的呼吸步骤。', '请给我一个可在工作间隙使用的暂停方法。', '请整理一个可以立刻执行的短时练习。'],
    outputOptions: ['练习步骤（含用时）', '核心动作', '增加适用场景说明'],
    tip: '选择练习类型即可。',
  },
];

export const DEFAULT_ANRAN_LAOSHI_TASK: AnranLaoshiTaskId = 'emotion-settle';

export function getAnranLaoshiTask(id: AnranLaoshiTaskId): AnranLaoshiTaskDef {
  return ANRAN_LAOSHI_TASKS.find(task => task.id === id) || ANRAN_LAOSHI_TASKS[0];
}

export function getDefaultAnranLaoshiSubOption(task: AnranLaoshiTaskDef): string {
  return task.subOptions?.[0]?.id ?? '';
}
