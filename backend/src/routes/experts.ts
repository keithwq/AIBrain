import { Router } from 'express';
import { countPersonaSkillLines, getPersonaStatus, loadPersonaSkill, MIN_READY_SKILL_LINES } from '../services/personas';
import { prisma } from '../services/prisma';
import { getAllowedExpertIdsForNickname, isExpertAllowedForNickname } from '../services/expertAccess';

const router = Router();

interface Expert {
  id: string;
  name: string;
  alias: string;
  avatar: string;
  description: string;
  tagline: string;
  expertise: string[];
  status: 'ready' | 'pending';
}

const experts: Expert[] = [
  {
    id: 'qinghe-xiezuo',
    name: '青禾老师',
    alias: '青禾老师',
    avatar: '/experts/qinghe-xiezuo.svg',
    description: '面向教培机构语文老师的作文教学、批改反馈、教研设计与家校沟通顾问。',
    tagline: '把作文课、批改、续班和家长沟通做成能直接交付的材料',
    expertise: ['作文课设计', '作文批改', '教研讲义', '家长沟通', '续班转化', '老师培训'],
    status: 'ready',
  },
  {
    id: 'yunqiao-jiaoxue',
    name: '云桥老师',
    alias: '云桥老师',
    avatar: '/experts/yunqiao-jiaoxue.svg',
    description:
      '语文教学内容与课堂设计判断智脑：帮老师判断这一课教什么、不教什么，检查目标—内容—活动—评价是否一致；不主全文作文升格、不主纯文学审美独白。',
    tagline: '先钉这一课教什么，再判活动服不服',
    expertise: ['教学内容', '教案生成', '说课稿', '逐字稿', '评课诊断', '课型取舍'],
    status: 'ready',
  },
  {
    id: 'zhiyuan-laoshi',
    name: '知远老师',
    alias: '知远老师',
    avatar: '/experts/zhiyuan-laoshi.svg',
    description: '升学、就业和留学规划工作台，擅长把省份位次、学校层级、专业壁垒、家庭现金流、目标城市、就业中位数和留学回本线放到同一张表里判断。',
    tagline: '高考冲稳保、考研择校、专业红黑榜、就业倒推和留学回本判断',
    expertise: ['冲稳保填报', '考研择校', '专业红黑榜', '就业倒推', '留学回本'],
    status: 'ready',
  },
  {
    id: 'mingheng-fawu',
    name: '明衡顾问',
    alias: '明衡顾问',
    avatar: '/experts/mingheng-fawu.svg',
    description: '法律风险预咨询与合规材料整理工作台，帮助用户梳理事实、证据、程序节点和可执行的下一步。',
    tagline: '先明事实，再衡风险，把能做、慎做、别碰讲清楚',
    expertise: ['法律风险', '证据梳理', '合同争议', '劳动纠纷', '公开表达边界'],
    status: 'ready',
  },
  {
    id: 'mingfeng-guwen',
    name: '鸣锋顾问',
    alias: '鸣锋顾问',
    avatar: '/experts/mingfeng-guwen.svg',
    description: '冲突营销与品牌定位工作台，帮助找到消费者心里的矛盾、记忆点和传播钩子。',
    tagline: '品牌冲突、广告钩子和传播记忆点',
    expertise: ['品牌营销', '广告策划', '冲突营销', '市场定位'],
    status: 'ready',
  },
  {
    id: 'songyue-shici',
    name: '松月先生',
    alias: '松月先生',
    avatar: '/experts/songyue-shici.svg',
    description: '古典诗词讲读与鉴赏智脑：诵读声情、兴发感动、意象与典故提示、课堂主问题链；不做作文主台与现代文赋分模板。',
    tagline: '把古诗与词读深一层、讲清楚一层',
    expertise: ['古诗带读', '词学入门', '意象章法', '典故互文', '诵读与声情', '社团课设计'],
    status: 'ready',
  },
  {
    id: 'lishi-sir',
    name: '砺石Sir',
    alias: '砺石Sir',
    avatar: '/experts/lishi-sir.svg',
    description: '产品、创业复盘与品牌信任顾问，擅长把卖点讲成人话、把质疑接住、把承诺落到兑现。',
    tagline: '产品发布、创业复盘、用户异议和公共表达',
    expertise: ['创业复盘', '产品判断', '营销传播', '危机回应'],
    status: 'ready',
  },
  {
    id: 'muhe-laoshi',
    name: '木禾老师',
    alias: '木禾老师',
    avatar: '/experts/muhe-laoshi.svg',
    description: '家庭教育与犯罪心理判断智脑，围绕心理抚养、早年养育和未成年成长边界给出判断。',
    tagline: '心理抚养、成长边界和家庭教育判断',
    expertise: ['心理抚养', '家庭教育', '青少年成长', '犯罪预防'],
    status: 'ready',
  },
  {
    id: 'anran-laoshi',
    name: '安然老师',
    alias: '安然老师',
    avatar: '/experts/anran-laoshi.svg',
    description: '状态整理与关系沟通智脑，帮助用户整理处理步骤、可发送文本和必要边界。',
    tagline: '状态整理、沟通文本、冲突降温和短时练习',
    expertise: ['状态整理', '沟通文本', '冲突降温', '关系沟通'],
    status: 'ready',
  },
  {
    id: 'songbai-xiansheng',
    name: '松柏先生',
    alias: '松柏先生',
    avatar: '/experts/songbai-xiansheng.svg',
    description: '中医养生与家庭食谱工作台，适合做体质自查、药食同源学习、健康食谱和中医咨询的信息梳理。',
    tagline: '体质自查、药食同源、健康食谱和中医咨询',
    expertise: ['中医咨询', '体质自查', '药食同源', '健康食谱', '家庭保健'],
    status: 'ready',
  },
];

// Load all skill files once at startup to avoid repeated disk reads per request.
const skillCache = new Map<string, string | null>(
  experts.map(e => [e.id, loadPersonaSkill(e.id)])
);
const skillLineCache = new Map<string, number>(
  experts.map(e => [e.id, countPersonaSkillLines(e.id)])
);

function serializeExpert(expert: Expert) {
  const skillLines = skillLineCache.get(expert.id) ?? 0;
  return {
    ...expert,
    status: getPersonaStatus(expert.id),
    has_skill: skillCache.get(expert.id) !== null,
    skill_lines: skillLines,
    min_ready_skill_lines: MIN_READY_SKILL_LINES,
  };
}

router.get('/', async (req, res) => {
  const token = req.headers['x-auth-token'] as string | undefined;
  const user = token ? await prisma.user.findUnique({ where: { token } }) : null;
  const allowedExpertIds = user ? getAllowedExpertIdsForNickname(user.nickname) : null;

  res.json(
    experts
      .map(serializeExpert)
      .filter(expert => expert.status === 'ready')
      .filter(expert => !allowedExpertIds || allowedExpertIds.has(expert.id)),
  );
});

router.get('/:id', async (req, res) => {
  const expert = experts.find(item => item.id === req.params.id);
  if (!expert) {
    return res.status(404).json({ error: 'expert not found' });
  }
  const token = req.headers['x-auth-token'] as string | undefined;
  const user = token ? await prisma.user.findUnique({ where: { token } }) : null;
  if (user && !isExpertAllowedForNickname(user.nickname, expert.id)) {
    return res.status(404).json({ error: 'expert not found' });
  }

  const serialized = serializeExpert(expert);
  if (serialized.status !== 'ready') {
    return res.status(404).json({ error: 'expert not available' });
  }

  res.json({ ...serialized, skill: skillCache.get(expert.id) ?? null });
});

export default router;
