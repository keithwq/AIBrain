export interface ExpertCategory {
  id: string;
  name: string;
  description: string;
  expertIds: string[];
}

export const EXPERT_CATEGORIES: ExpertCategory[] = [
  {
    id: 'education',
    name: '教培机构',
    description: '语文 / 升学 / 教研 / 校区',
    expertIds: ['wangdingjun', 'zhangxuefeng'],
  },
  {
    id: 'business',
    name: '商业增长',
    description: '战略 / 营销 / 组织',
    expertIds: ['wangzhigang', 'yemaozhong', 'mayun'],
  },
  {
    id: 'product',
    name: '产品创业',
    description: '产品 / 表达 / 实验',
    expertIds: ['steve-jobs', 'luoyonghao', 'masike'],
  },
  {
    id: 'legal',
    name: '法律风控',
    description: '合同 / 证据 / 合规',
    expertIds: ['luoxiang'],
  },
  {
    id: 'health',
    name: '健康医疗',
    description: '肠道 / 磁医学 / 医学沟通',
    expertIds: ['xuehuashi', 'zhanqimin'],
  },
  {
    id: 'structure',
    name: '结构分析',
    description: '制度 / 城乡 / 产业',
    expertIds: ['wentiejun'],
  },
  {
    id: 'knowledge',
    name: '知识表达',
    description: '读书 / 课程 / 表达',
    expertIds: ['fandeng'],
  },
];

export const EXPERT_CATEGORY_BY_ID = new Map(
  EXPERT_CATEGORIES.flatMap(category => category.expertIds.map(expertId => [expertId, category] as const)),
);
