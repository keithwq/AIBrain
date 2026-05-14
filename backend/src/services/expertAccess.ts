const EDUCATION_EXPERT_IDS = [
  'qinghe-xiezuo',
  'yunqiao-jiaoxue',
  'songyue-shici',
  'zhiyuan-laoshi',
];

const FAMILY_EXPERT_IDS = ['muhe-laoshi', 'anran-laoshi'];

const BUSINESS_EXPERT_IDS = ['mingfeng-guwen', 'lishi-sir', 'mingheng-fawu'];

const HEALTH_EXPERT_IDS = ['songbai-xiansheng'];

const ACCESS_GROUPS = [
  { pattern: /^jy00[1-9]$/, expertIds: EDUCATION_EXPERT_IDS },
  { pattern: /^jt00[1-9]$/, expertIds: FAMILY_EXPERT_IDS },
  { pattern: /^sy00[1-9]$/, expertIds: BUSINESS_EXPERT_IDS },
  { pattern: /^jk00[1-9]$/, expertIds: HEALTH_EXPERT_IDS },
];

export function getAllowedExpertIdsForNickname(nickname: string) {
  const normalized = nickname.trim().toLowerCase();
  const group = ACCESS_GROUPS.find(item => item.pattern.test(normalized));
  return group ? new Set(group.expertIds) : null;
}

export function isExpertAllowedForNickname(nickname: string, expertId: string) {
  const allowedExpertIds = getAllowedExpertIdsForNickname(nickname);
  return !allowedExpertIds || allowedExpertIds.has(expertId);
}
