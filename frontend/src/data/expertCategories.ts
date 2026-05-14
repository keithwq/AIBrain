export interface ExpertCategory {
  id: string;
  name: string;
  description: string;
  expertIds: string[];
}

export const EXPERT_CATEGORIES: ExpertCategory[] = [
  {
    id: 'education',
    name: '����ѧϰ',
    description: '���� / ��ѧ / ��ѧ / ���',
    expertIds: ['qinghe-xiezuo', 'yunqiao-jiaoxue', 'songyue-shici', 'zhiyuan-laoshi'],
  },
  {
    id: 'family',
    name: '��ͥ����',
    description: '��ͥ���� / ���� / ״̬���� / ��ͨ����',
    expertIds: ['muhe-laoshi', 'anran-laoshi'],
  },
  {
    id: 'business',
    name: '��ҵְ��',
    description: 'ս�� / Ӫ�� / ��Ʒ / �Ϲ�',
    expertIds: ['mingfeng-guwen', 'lishi-sir', 'mingheng-fawu'],
  },
  {
    id: 'health',
    name: '����',
    description: '��ҽ���� / ������Ϣ���� / ҽѧ��ͨ',
    expertIds: ['songbai-xiansheng'],
  },
];

export const EXPERT_CATEGORY_BY_ID = new Map(
  EXPERT_CATEGORIES.flatMap(category => category.expertIds.map(expertId => [expertId, category] as const)),
);
