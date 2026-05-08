import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

const WIKI_BASE = process.env.WIKI_BASE_PATH || 'D:\\WIKI\\40_Knowledge 知识资产\\Personas 人物原型';

interface Expert {
  id: string;
  name: string;
  alias: string;
  avatar: string;
  description: string;
  expertise: string[];
  status: 'ready' | 'pending';
}

const experts: Expert[] = [
  { id: 'steve-jobs', name: '乔布斯', alias: '乔大爷', avatar: '', description: '苹果公司联合创始人，改变世界的产品大师', expertise: ['产品设计', '创新思维', '领导力', '科技美学'], status: 'ready' },
  { id: 'zhangxuefeng', name: '张雪峰', alias: '冰山老师', avatar: '', description: '知名教育博主、考研规划专家', expertise: ['教育规划', '职业规划', '考研指导', '高考志愿'], status: 'ready' },
  { id: 'yemaozhong', name: '叶茂中', alias: '叶将军', avatar: '', description: '中国营销策划领军人物', expertise: ['品牌营销', '广告策划', '冲突营销', '市场定位'], status: 'ready' },
  { id: 'luoyonghao', name: '罗永浩', alias: '罗胖子', avatar: '', description: '连续创业者、理想主义产品经理', expertise: ['创业', '产品设计', '营销传播', '危机公关'], status: 'ready' },
  { id: 'mayun', name: '马云', alias: '太极老总', avatar: '', description: '阿里巴巴集团创始人、商业思想家', expertise: ['企业管理', '电子商务', '组织文化', '未来趋势'], status: 'ready' },
  { id: 'masike', name: '马斯克', alias: '马斯克狂人', avatar: '', description: '特斯拉、SpaceX创始人，颠覆式创新者', expertise: ['科技创新', '航天工程', '电动汽车', '人工智能'], status: 'ready' },
  { id: 'luoxiang', name: '罗翔', alias: '罗翔老师', avatar: '', description: '中国政法大学教授、刑法学专家', expertise: ['刑法学', '法治思想', '道德哲学', '社会正义'], status: 'ready' },
  { id: 'fandeng', name: '樊登', alias: '樊老师', avatar: '', description: '樊登读书创始人、知识传播者', expertise: ['读书方法', '知识管理', '领导力', '家庭养育'], status: 'ready' },
];

function loadSkillContent(expertId: string): string | null {
  const dir = path.join(WIKI_BASE, `${expertId}-perspective`);
  const skillPath = path.join(dir, 'SKILL.md');
  try {
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf-8');
    }
  } catch { }
  return null;
}

router.get('/', (_req, res) => {
  const list = experts.map(e => ({
    ...e,
    has_skill: loadSkillContent(e.id) !== null,
  }));
  res.json(list);
});

router.get('/:id', (req, res) => {
  const expert = experts.find(e => e.id === req.params.id);
  if (!expert) {
    return res.status(404).json({ error: 'expert not found' });
  }
  const skill = loadSkillContent(expert.id);
  res.json({ ...expert, skill });
});

export default router;
