import { Router } from 'express';
import { countPersonaSkillLines, getPersonaStatus, loadPersonaSkill, MIN_READY_SKILL_LINES } from '../services/personas';

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
    id: 'wangdingjun',
    name: '鼎公老师',
    alias: '鼎公老师',
    avatar: '/experts/wangdingjun.png',
    description: '面向教培机构语文老师的作文教学、批改反馈、教研设计与家校沟通顾问。',
    tagline: '把作文课、批改、续班和家长沟通做成能直接交付的材料',
    expertise: ['作文课设计', '作文批改', '教研讲义', '家长沟通', '续班转化', '老师培训'],
    status: 'ready',
  },
  {
    id: 'sunshaozhen',
    name: '绍振细读',
    alias: '绍振细读',
    avatar: '/experts/sunshaozhen.svg',
    description: '文学类文本细读与阅读教学工作台：层次阐释、讲读主问题链、板书层进与阅读题文学逻辑（不冒充官方阅卷标准）。',
    tagline: '把一篇课文读深一层、讲清一层',
    expertise: ['文本细读', '阅读教学设计', '课堂主问题', '文学类课文', '教研讲读'],
    status: 'ready',
  },
  {
    id: 'wangrongsheng',
    name: '绒绒老师',
    alias: '绒绒老师',
    avatar: '/experts/wangrongsheng.svg',
    description:
      '语文教学内容与课堂设计判断智脑：帮老师判断这一课教什么、不教什么，检查目标—内容—活动—评价是否一致；不主全文作文升格、不主纯文学审美独白。',
    tagline: '先钉这一课教什么，再判活动服不服',
    expertise: ['教学内容', '教案生成', '说课稿', '逐字稿', '评课诊断', '课型取舍'],
    status: 'ready',
  },
  {
    id: 'zhangxuefeng',
    name: '冰山先生',
    alias: '冰山先生',
    avatar: '/experts/zhangxuefeng.png',
    description: '升学、专业选择和就业路径判断智脑，擅长把家庭条件与现实回报放到同一张图里看。',
    tagline: '升学路径、专业选择和就业结果判断',
    expertise: ['教育规划', '职业规划', '考研指导', '高考志愿'],
    status: 'ready',
  },
  {
    id: 'wangzhigang',
    name: '战略王子',
    alias: '战略王子',
    avatar: '/experts/wangzhigang.svg',
    description: '战略策划顾问，适合项目定位、资源盘点、城市运营和文旅破局。',
    tagline: '项目战略定位、资源盘点和破局路径',
    expertise: ['战略策划', '城市运营', '文旅开发', '政商资源整合'],
    status: 'ready',
  },
  {
    id: 'steve-jobs',
    name: '乔大爷',
    alias: '乔大爷',
    avatar: '/experts/steve-jobs.png',
    description: '产品取舍与体验打磨视角，帮助把复杂产品砍到清晰、锋利、可用。',
    tagline: '产品取舍、体验打磨和最小可用版本',
    expertise: ['产品设计', '创新思维', '领导力', '科技美学'],
    status: 'ready',
  },
  {
    id: 'kuangtuzhangsan',
    name: '狂徒张三',
    alias: '狂徒张三',
    avatar: '/experts/kuangtuzhangsan.svg',
    description: '嘴快逻辑稳，帮你先看事实、证据和最容易踩的坑。',
    tagline: '把事情讲清楚，判断哪些能做、哪些慎做、哪些别碰',
    expertise: ['法律避坑', '证据梳理', '合同风险', '公开发言边界'],
    status: 'ready',
  },
  {
    id: 'yemaozhong',
    name: '叶将军',
    alias: '叶将军',
    avatar: '/experts/yemaozhong.png',
    description: '冲突营销视角，帮助找到消费者心里的矛盾、记忆点和传播钩子。',
    tagline: '品牌冲突、广告钩子和传播记忆点',
    expertise: ['品牌营销', '广告策划', '冲突营销', '市场定位'],
    status: 'ready',
  },
  {
    id: 'yejiaying',
    name: '迦陵先生',
    alias: '迦陵先生',
    avatar: '/experts/yejiaying.svg',
    description: '古典诗词讲读与鉴赏智脑：诵读声情、兴发感动、意象与典故提示、课堂主问题链；不做作文主台与现代文赋分模板。',
    tagline: '把古诗与词读深一层、讲清楚一层',
    expertise: ['古诗带读', '词学入门', '意象章法', '典故互文', '诵读与声情', '社团课设计'],
    status: 'ready',
  },
  {
    id: 'luoyonghao',
    name: '锤子',
    alias: '锤子',
    avatar: '/experts/luoyonghao.svg',
    description: '产品表达与危机回应顾问，擅长把复杂卖点讲成人话、把质疑接住。',
    tagline: '产品发布、用户异议和公共表达',
    expertise: ['创业', '产品设计', '营销传播', '危机公关'],
    status: 'ready',
  },
  {
    id: 'fandeng',
    name: '老登',
    alias: '老登',
    avatar: '/experts/fandeng.svg',
    description: '知识拆解和表达顾问，像一盏会读书的灯，讲结构讲得很明白。',
    tagline: '知识拆解、表达训练和读书方法',
    expertise: ['读书方法', '知识管理', '领导力', '家庭养育'],
    status: 'ready',
  },
  {
    id: 'mayun',
    name: '太极老总',
    alias: '太极老总',
    avatar: '/experts/mayun.png',
    description: '生态、组织与长期格局视角，适合商业趋势、组织能力和合作网络判断。',
    tagline: '商业格局、组织能力和生态打法',
    expertise: ['企业管理', '电子商务', '组织文化', '未来趋势'],
    status: 'ready',
  },
  {
    id: 'masike',
    name: '极客麻薯',
    alias: '极客麻薯',
    avatar: '/experts/masike.svg',
    description: '第一性原理与工程化视角，像一枚会冒火的火箭，专盯目标、成本和实验路径。',
    tagline: '第一性原理、工程瓶颈和快速实验',
    expertise: ['科技创新', '航天工程', '电动汽车', '人工智能'],
    status: 'ready',
  },
  {
    id: 'wentiejun',
    name: '铁军教授',
    alias: '铁军教授',
    avatar: '/experts/wentiejun.svg',
    description: '政治经济学与三农结构视角，适合制度成本、城乡关系和基层执行分析。',
    tagline: '制度结构、三农问题和城乡关系',
    expertise: ['三农政策', '政治经济学', '制度创新', '城乡发展'],
    status: 'ready',
  },
  {
    id: 'xuehuashi',
    name: '磁医薛博',
    alias: '磁医薛博',
    avatar: '/experts/xuehuashi.svg',
    description: '磁医学判断顾问，围绕机理、证据和现实边界看技术与产业路径。',
    tagline: '磁医学理解、证据分析和产业化判断',
    expertise: ['磁医学', '机理判断', '证据分析', '产业化验证'],
    status: 'ready',
  },
  {
    id: 'li-meijin',
    name: '李玫瑾',
    alias: '李玫瑾',
    avatar: '/experts/li-meijin.svg',
    description: '家庭教育与犯罪心理判断智脑，围绕心理抚养、早年养育和未成年成长边界给出判断。',
    tagline: '心理抚养、成长边界和家庭教育判断',
    expertise: ['心理抚养', '家庭教育', '青少年成长', '犯罪预防'],
    status: 'ready',
  },
  {
    id: 'yixingchanshi',
    name: '一行禅师',
    alias: '一行禅师',
    avatar: '/experts/yixingchanshi.svg',
    description: '正念舒缓与高情商回应智脑，帮助用户把压力、焦虑和关系冲突先安顿回呼吸和温和边界。',
    tagline: '呼吸练习、情绪安顿、安慰话术和关系降温',
    expertise: ['正念呼吸', '情绪安顿', '安慰话术', '关系修复'],
    status: 'ready',
  },
  {
    id: 'zhanqimin',
    name: '肠博士',
    alias: '肠博士',
    avatar: '/experts/zhanqimin.svg',
    description: '肠道健康判断智脑，适合症状梳理、检查沟通和长期调理边界。',
    tagline: '肠道健康、检查沟通和长期调理判断',
    expertise: ['肠道健康', '症状梳理', '检查沟通', '长期调理'],
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

router.get('/', (_req, res) => {
  res.json(experts.map(serializeExpert).filter(expert => expert.status === 'ready'));
});

router.get('/:id', (req, res) => {
  const expert = experts.find(item => item.id === req.params.id);
  if (!expert) {
    return res.status(404).json({ error: 'expert not found' });
  }
  const serialized = serializeExpert(expert);
  if (serialized.status !== 'ready') {
    return res.status(404).json({ error: 'expert not available' });
  }

  res.json({ ...serialized, skill: skillCache.get(expert.id) ?? null });
});

export default router;
