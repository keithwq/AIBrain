import { Router } from 'express';
import { loadPersonaSkill } from '../services/personas';

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
    name: '王鼎钧',
    alias: '鼎公老师',
    avatar: '/experts/wangdingjun.png',
    description: '面向教培机构语文老师的作文教学、批改反馈、教研设计与家校沟通顾问。',
    tagline: '把作文课、批改、续班和家长沟通做成能直接交付的材料',
    expertise: ['作文课设计', '作文批改', '教研讲义', '家长沟通', '续班转化', '老师培训'],
    status: 'ready',
  },
  {
    id: 'zhangxuefeng',
    name: '张雪峰',
    alias: '冰山先生',
    avatar: '/experts/zhangxuefeng.png',
    description: '升学、专业选择和就业路径判断专家，擅长把家庭条件与现实回报放到同一张图里看。',
    tagline: '升学路径、专业选择和就业结果判断',
    expertise: ['教育规划', '职业规划', '考研指导', '高考志愿'],
    status: 'ready',
  },
  {
    id: 'wangzhigang',
    name: '王志纲',
    alias: '战略王子',
    avatar: '/experts/wangzhigang.svg',
    description: '战略策划顾问，适合项目定位、资源盘点、城市运营和文旅破局。',
    tagline: '项目战略定位、资源盘点和破局路径',
    expertise: ['战略策划', '城市运营', '文旅开发', '政商资源整合'],
    status: 'ready',
  },
  {
    id: 'steve-jobs',
    name: '乔布斯',
    alias: '乔大爷',
    avatar: '/experts/steve-jobs.png',
    description: '产品取舍与体验打磨视角，帮助把复杂产品砍到清晰、锋利、可用。',
    tagline: '产品取舍、体验打磨和最小可用版本',
    expertise: ['产品设计', '创新思维', '领导力', '科技美学'],
    status: 'ready',
  },
  {
    id: 'luoxiang',
    name: '狂徒张三',
    alias: '狂徒张三',
    avatar: '/experts/luoxiang.svg',
    description: '法律与边界感极强的卡通锣鼓形象，嘴快但逻辑稳，专拆事实、证据和风险。',
    tagline: '事实梳理、风险边界和合规判断',
    expertise: ['刑法学', '法治思想', '道德哲学', '社会正义'],
    status: 'ready',
  },
  {
    id: 'yemaozhong',
    name: '叶茂中',
    alias: '叶将军',
    avatar: '/experts/yemaozhong.png',
    description: '冲突营销视角，帮助找到消费者心里的矛盾、记忆点和传播钩子。',
    tagline: '品牌冲突、广告钩子和传播记忆点',
    expertise: ['品牌营销', '广告策划', '冲突营销', '市场定位'],
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
    name: '马云',
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
    name: '温铁军',
    alias: '铁军教授',
    avatar: '/experts/wentiejun.svg',
    description: '政治经济学与三农结构视角，适合制度成本、城乡关系和基层执行分析。',
    tagline: '制度结构、三农问题和城乡关系',
    expertise: ['三农政策', '政治经济学', '制度创新', '城乡发展'],
    status: 'ready',
  },
  {
    id: 'xuehuashi',
    name: '薛华石',
    alias: '磁医薛博',
    avatar: '/experts/xuehuashi.svg',
    description: '磁医学判断顾问，围绕机理、证据和现实边界看技术与产业路径。',
    tagline: '磁医学理解、证据分析和产业化判断',
    expertise: ['磁医学', '机理判断', '证据分析', '产业化验证'],
    status: 'ready',
  },
  {
    id: 'zhanqimin',
    name: '肠博士',
    alias: '肠博士',
    avatar: '/experts/zhanqimin.svg',
    description: '肠道健康判断外脑，适合症状梳理、检查沟通和长期调理边界。',
    tagline: '肠道健康、检查沟通和长期调理判断',
    expertise: ['肠道健康', '症状梳理', '检查沟通', '长期调理'],
    status: 'ready',
  },
];

function loadSkillContent(expertId: string): string | null {
  return loadPersonaSkill(expertId);
}

router.get('/', (_req, res) => {
  res.json(experts.map(expert => ({ ...expert, has_skill: loadSkillContent(expert.id) !== null })));
});

router.get('/:id', (req, res) => {
  const expert = experts.find(item => item.id === req.params.id);
  if (!expert) {
    return res.status(404).json({ error: 'expert not found' });
  }

  res.json({ ...expert, skill: loadSkillContent(expert.id) });
});

export default router;
