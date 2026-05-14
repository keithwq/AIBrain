export type SongbaiXianshengTaskId =
  | 'consultation'
  | 'daily-discovery'
  | 'classic-formula'
  | 'learn-tcm'
  | 'flash-quiz'
  | 'weekly-menu'
  | 'constitution';

export interface SongbaiXianshengTask {
  id: SongbaiXianshengTaskId;
  label: string;
  hint: string;
  title: string;
  intro: string;
  button: string;
  prompt: string;
  mode: 'core' | 'grid' | 'formula' | 'course' | 'quiz' | 'menu' | 'profile';
  placeholder?: string;
}

export type DailyDiscoveryType = 'herb' | 'food' | 'recipe' | 'doctor';

export interface DailyDiscoveryItem {
  id: DailyDiscoveryType;
  label: string;
  desc: string;
  prompt: string;
}

export const DAILY_DISCOVERY_ITEMS: DailyDiscoveryItem[] = [
  {
    id: 'herb',
    label: '每日一药',
    desc: '认识一味中药材',
    prompt: '请介绍一味中药材。包括名称、性味归经、功效、常见配伍、用量范围、使用注意事项。语言通俗，适合非专业人士。每次介绍不同的药材。不给具体方剂剂量，不建议自行用药。',
  },
  {
    id: 'food',
    label: '每日一食',
    desc: '认识一种药食同源食材',
    prompt: '请介绍一种药食同源食材。包括名称、性味归经、日常理解、适合场景、家常做法（含克数）、不适合人群。不把食材说成能治病。每次介绍不同的食材。',
  },
  {
    id: 'recipe',
    label: '每日一谱',
    desc: '学一道养生家常菜',
    prompt: '请推荐一道家常养生菜。给出菜名、食材与克数、详细做法步骤、烹饪时间、适合人群、中医视角说明和注意事项。不把菜说成能治病。每次推荐不同的菜。',
  },
  {
    id: 'doctor',
    label: '每日一医',
    desc: '认识一位中医名家',
    prompt: '请介绍一位已故中医名家（古今中外皆可，必须是已经去世的）。包括生平简介、所处时代、核心学术贡献、代表著作或方剂、对后世的影响，以及一句话总结其特色。每次介绍不同的人物。',
  },
];

export const CLASSIC_FORMULAS = [
  '四君子汤', '六味地黄丸', '逍遥散', '补中益气汤', '归脾汤',
  '小柴胡汤', '桂枝汤', '麻黄汤', '白虎汤', '理中丸',
  '四物汤', '八珍汤', '十全大补汤', '玉屏风散', '二陈汤',
  '半夏泻心汤', '五苓散', '真武汤', '血府逐瘀汤', '温胆汤',
];

export const DEFAULT_SONGBAI_XIANSHENG_TASK: SongbaiXianshengTaskId = 'consultation';

export const SONGBAI_XIANSHENG_TASKS: SongbaiXianshengTask[] = [
  {
    id: 'consultation',
    label: '中医咨询',
    hint: '症状梳理、就医沟通',
    title: '中医健康咨询',
    intro: '把症状、时间、已知诊断或家庭饮食限制说清楚，系统会先做信息梳理和边界提醒。不诊断，不开方，不替代医生。',
    button: '开始咨询',
    prompt: '请按中医健康咨询工作流处理。先梳理症状、持续时间、已知诊断、正在用药、基础疾病和危险信号；再给一般健康教育、居家观察和就医沟通建议。必须保持客观克制，不做诊断，不开药方，不给剂量，不承诺疗效，不建议用户自行停药或替代正规就医。',
    mode: 'core',
    placeholder: '描述你的症状、持续时间、已知诊断或想咨询的问题...',
  },
  {
    id: 'daily-discovery',
    label: '每日新知',
    hint: '一药 · 一食 · 一谱 · 一医',
    title: '每日新知',
    intro: '每天四个方向的中医知识卡片。',
    button: '换一个',
    prompt: '',
    mode: 'grid',
  },
  {
    id: 'classic-formula',
    label: '经方解读',
    hint: '经典方剂通俗讲解',
    title: '经方解读',
    intro: '了解经典方剂的组成、功效和适用场景。支持随机、选择或自由输入。',
    button: '随机一方',
    prompt: '请解读这个经典方剂。包括：方剂出处、组成药物、君臣佐使分析、功效主治、适用场景的通俗描述、现代常见加减化裁方向、使用注意事项。强调不建议自行用药，具体用药需咨询医师。',
    mode: 'formula',
    placeholder: '输入方剂名称，或从下拉框选择...',
  },
  {
    id: 'learn-tcm',
    label: '跟我学',
    hint: '中医基础系列课程',
    title: '跟我学中医',
    intro: '选择学习体系，系统学习中医知识。',
    button: '继续学习',
    prompt: '',
    mode: 'course',
  },
  {
    id: 'flash-quiz',
    label: '中医闪考',
    hint: '百词斩式自测',
    title: '中医闪考',
    intro: '测试你的中医药知识水平。选择难度和题数，开始挑战。',
    button: '开始闪考',
    prompt: '请出一组中医药知识测试题。',
    mode: 'quiz',
  },
  {
    id: 'weekly-menu',
    label: '菜谱定制',
    hint: '定制一周菜谱',
    title: '一周菜谱定制',
    intro: '根据家庭情况、体质偏好和季节，定制一周三餐菜谱。',
    button: '定制周菜谱',
    prompt: '请根据家庭情况和要求，定制一周三餐菜谱。每餐给出具体菜名和主要食材；附带一周采购清单和备餐建议。菜品要家常可执行，不夸大养生功效，不按疾病开菜单。',
    mode: 'menu',
    placeholder: '描述家庭情况：几口人、饮食偏好、限制条件...',
  },
  {
    id: 'constitution',
    label: '体质辨识',
    hint: '体质辨识与档案管理',
    title: '体质辨识与档案管理',
    intro: '通过问卷整理日常状态，建立和更新个人体质档案。',
    button: '提交自查',
    prompt: '请根据我提供的日常状态信息，按中医体质辨识框架整理体质倾向。区分气虚、阳虚、阴虚、痰湿、湿热、血瘀、气郁、特禀、平和九种体质，给出倾向判断、日常观察建议和需要就医的信号。强调这不是诊断，不给药方和剂量。',
    mode: 'profile',
  },
];

export function getSongbaiXianshengTask(id: SongbaiXianshengTaskId): SongbaiXianshengTask {
  return SONGBAI_XIANSHENG_TASKS.find(task => task.id === id) || SONGBAI_XIANSHENG_TASKS[0];
}
