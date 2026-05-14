export const FEATURED_EXPERT_ORDER = [
  'qinghe-xiezuo',
  'yunqiao-jiaoxue',
  'songyue-shici',
  'zhiyuan-laoshi',
  'mingheng-fawu',
  'mingfeng-guwen',
  'lishi-sir',
  'songbai-xiansheng',
  'muhe-laoshi',
  'anran-laoshi',
] as const;

export interface ExpertDisplayMeta {
  name: string;
  alias: string;
  title: string;
  cardIntro: string;
  shortTitle: string;
  tagline: string;
  promise: string;
  accent: string;
  soft: string;
  avatar: string;
}

export const EXPERT_DISPLAY: Record<string, ExpertDisplayMeta> = {
  'qinghe-xiezuo': {
    name: '青禾老师',
    alias: '青禾老师',
    title: '作文批改与写作教学工作台',
    cardIntro: '专注作文批改、表达训练和课堂讲评。',
    shortTitle: '作文批改',
    tagline: '面向 K12 语文老师，把作文批改、写作教学和作业反馈做成可交付材料',
    promise: '服务 K12 语文老师、教培机构语文老师和校区教研负责人：专注作文批改、写作教学、表达训练、作文讲评和日常写作作业反馈。',
    accent: 'emerald',
    soft: 'bg-emerald-50',
    avatar: '/experts/qinghe-xiezuo.svg',
  },
  'yunqiao-jiaoxue': {
    name: '云桥老师',
    alias: '云桥老师',
    title: '语文教学内容与课堂设计判断',
    cardIntro: '先钉教什么，再判活动服不服。',
    shortTitle: '教学内容',
    tagline: '教案、说课稿、逐字稿与目标—活动—评价一致性',
    promise:
      '服务一线语文老师与教研组：先判断单篇与单元的教学内容取舍，再生成教案、说课稿、逐字稿和评课诊断；学生作文升格请用青禾。',
    accent: 'teal',
    soft: 'bg-teal-50',
    avatar: '/experts/yunqiao-jiaoxue.svg',
  },
  'songyue-shici': {
    name: '松月先生',
    alias: '松月先生',
    title: '古典诗词讲读与鉴赏',
    cardIntro: '诵读入情，意象与典故点到为止，主问题能上课。',
    shortTitle: '诗词讲读',
    tagline: '古诗与词：声情、兴发感动、章法与用典提示',
    promise:
      '服务语文老师拓展课与自学带读：单首或组诗层次讲读、诵读与声情、意象脉络、典故可查方向、课堂主问题链；不做作文批改与现代文赋分模板。',
    accent: 'stone',
    soft: 'bg-[#fffaf2]',
    avatar: '/experts/songyue-shici.svg',
  },
  'zhiyuan-laoshi': {
    name: '知远老师',
    alias: '知远老师',
    title: '升学就业留学规划工作台',
    cardIntro: '先卡硬条件，再判冲稳保。',
    shortTitle: '规划判志愿',
    tagline: '高考冲稳保、考研择校、专业红黑榜、就业倒推和留学回本判断',
    promise: '按规划判断流程梳理省份位次、家庭现金流、目标城市、专业禁忌和就业底线，再把学校、专业、城市、读研、留学分成能冲、能保、该淘汰、千万别碰。',
    accent: 'sky',
    soft: 'bg-sky-50',
    avatar: '/experts/zhiyuan-laoshi.svg',
  },
  'mingheng-fawu': {
    name: '明衡顾问',
    alias: '明衡顾问',
    title: '法律风险预咨询工作台',
    cardIntro: '先明事实，再衡风险。',
    shortTitle: '法务预判',
    tagline: '把事实、证据、程序节点和风险边界整理清楚',
    promise: '你把事情讲清楚，明衡顾问帮你拆出风险层级、证据缺口、可沟通材料和更稳妥的下一步。',
    accent: 'blue',
    soft: 'bg-blue-50',
    avatar: '/experts/mingheng-fawu.svg',
  },
  'mingfeng-guwen': {
    name: '鸣锋顾问',
    alias: '鸣锋顾问',
    title: '冲突营销判断',
    cardIntro: '盯住矛盾和记忆点。',
    shortTitle: '冲突营销',
    tagline: '品牌冲突、广告钩子和传播记忆点',
    promise: '帮你找到消费者心里的冲突，再钉成一句话、一个画面、一个购买理由。',
    accent: 'red',
    soft: 'bg-red-50',
    avatar: '/experts/mingfeng-guwen.svg',
  },
  'lishi-sir': {
    name: '砺石Sir',
    alias: '砺石Sir',
    title: '产品与创业复盘',
    cardIntro: '卖点要打磨，承诺要兑现，质疑要接住。',
    shortTitle: '产品表达',
    tagline: '产品发布、创业复盘、用户异议和公共表达',
    promise: '把卖点讲成人话，把质疑接住，把承诺、成本、售后和信任放到同一张判断台上。',
    accent: 'orange',
    soft: 'bg-orange-50',
    avatar: '/experts/lishi-sir.svg',
  },
  'muhe-laoshi': {
    name: '木禾老师',
    alias: '木禾老师',
    title: '家庭教育判断',
    cardIntro: '盯住早年养育和性格底色。',
    shortTitle: '心理抚养',
    tagline: '心理抚养、未成年成长和家庭边界',
    promise: '把孩子行为、家庭方式和成长边界放在一张判断图里看清楚。',
    accent: 'rose',
    soft: 'bg-rose-50',
    avatar: '/experts/muhe-laoshi.svg',
  },
  'anran-laoshi': {
    name: '安然老师',
    alias: '安然老师',
    title: '状态整理与关系沟通',
    cardIntro: '整理情况、控制风险、生成可执行文本。',
    shortTitle: '关系沟通',
    tagline: '状态整理、沟通文本、冲突降温和短时练习',
    promise: '根据事实和关系场景整理处理步骤、可发送文本和必要边界。',
    accent: 'indigo',
    soft: 'bg-indigo-50',
    avatar: '/experts/anran-laoshi.svg',
  },
  'songbai-xiansheng': {
    name: '松柏先生',
    alias: '松柏先生',
    title: '中医养生与家庭食谱',
    cardIntro: '先做症状和体质信息梳理，再给克制的保健知识与食谱建议。',
    shortTitle: '养生学习',
    tagline: '体质自查、药食同源、健康食谱和中医咨询',
    promise: '只做健康教育、信息梳理和家庭保健建议，不诊断、不开方、不替代医生。',
    accent: 'green',
    soft: 'bg-[#fffaf2]',
    avatar: '/experts/songbai-xiansheng.svg',
  },
};

export function getExpertDisplay(id: string): ExpertDisplayMeta {
  return EXPERT_DISPLAY[id] || {
    name: '通用智脑',
    alias: '通用智脑',
    title: '专业判断辅助',
    cardIntro: '先追问关键变量，再把模糊问题整理成可执行判断。',
    shortTitle: '专业判断',
    tagline: '追问关键变量，再给可执行判断',
    promise: '先把背景和约束讲清楚，系统会把模糊问题变成可执行方案。',
    accent: 'emerald',
    soft: 'bg-emerald-50',
    avatar: '/experts/qinghe-xiezuo.svg',
  };
}
