export interface ExpertCategory {
  id: string;
  name: string;
  description: string;
  expertIds: string[];
}

export const EXPERT_CATEGORIES: ExpertCategory[] = [
  {
    id: 'education',
    name: '教育学习',
    description: '作文 / 教学 / 升学 / 诗词',
    expertIds: ['qinghe-xiezuo', 'yunqiao-jiaoxue', 'songyue-shici', 'zhiyuan-laoshi'],
  },
  {
    id: 'family',
    name: '家庭关系',
    description: '家庭教育 / 关系 / 状态整理 / 沟通文本',
    expertIds: ['muhe-laoshi', 'anran-laoshi'],
  },
  {
    id: 'business',
    name: '商业职场',
    description: '战略 / 营销 / 产品 / 合规',
    expertIds: ['mingfeng-guwen', 'lishi-sir', 'mingheng-fawu'],
  },
  {
    id: 'health',
    name: '健康养生',
    description: '中医养生 / 健康信息整理 / 医学沟通',
    expertIds: ['songbai-xiansheng'],
  },
];

export const EXPERT_CATEGORY_BY_ID = new Map(
  EXPERT_CATEGORIES.flatMap(category => category.expertIds.map(expertId => [expertId, category] as const)),
);
