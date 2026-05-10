import { useEffect, useMemo, useRef, useState } from 'react';
import { getConversation, getMessages, sendMessageStream } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Props {
  userId: string;
  conversationId: string;
  expertId: string;
  expertName: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
}

type InputType = 'text' | 'textarea' | 'select';
type ReplyLength = '短一点' | '正常' | '详细';
type AskStyle = '多追问' | '边问边判' | '直接给建议';
type OutputStyle = '先聊清楚' | '给路线表' | '给行动清单';

interface FieldConfig {
  key: string;
  label: string;
  type: InputType;
  placeholder?: string;
  options?: string[];
}

interface PanelConfig {
  title: string;
  intro: string;
  quickQuestions: string[];
  fields: FieldConfig[];
  defaults: Record<string, string>;
}

const TEMP_ID_PREFIX = '\x00temp\x00';

const PANEL_CONFIGS: Record<string, PanelConfig> = {
  wangdingjun: {
    title: '语文教培任务单',
    intro: '把作文课、批改、续班和家长沟通做成能交付的材料。',
    quickQuestions: [
      '帮我设计一节初中作文公开课，目标是转化试听家长',
      '这篇学生作文怎么批，既指出问题又让家长觉得值',
      '给我一套寒假作文班的大纲和续班话术',
    ],
    defaults: {
      institutionType: '素养/作文机构',
      grade: '初中',
      taskType: '作文课设计',
      deliverable: '课堂流程+讲义要点',
      painPoint: '',
      sourceMaterial: '',
    },
    fields: [
      { key: 'institutionType', label: '机构类型', type: 'select', options: ['素养/作文机构', 'K12 学科机构', '托管晚辅', '线上小班', '校区教研'] },
      { key: 'grade', label: '学生年级', type: 'select', options: ['小学低段', '小学高段', '初中', '高中'] },
      { key: 'taskType', label: '本次任务', type: 'select', options: ['作文课设计', '作文批改', '讲义教案', '家长沟通', '续班转化', '老师培训'] },
      { key: 'deliverable', label: '需要产物', type: 'select', options: ['课堂流程+讲义要点', '逐字稿', '作文批改意见', '家长反馈话术', '课程大纲', '老师培训手册'] },
      { key: 'painPoint', label: '当前卡点', type: 'textarea', placeholder: '例如：学生没素材、课堂不活跃、家长只看分数、老师不会讲方法' },
      { key: 'sourceMaterial', label: '作文/教材/案例', type: 'textarea', placeholder: '把学生作文、课题、教材片段或机构要求贴在这里' },
    ],
  },
  zhangxuefeng: {
    title: '升学就业判断单',
    intro: '先看分数、地区、投入和目标，再判断路径胜率。',
    quickQuestions: ['中考成绩不上不下，怎么选路线', '普通二本计算机，考研还是就业', '家里条件一般，专业要不要转'],
    defaults: { stage: '高考', province: '', level: '中等', scoreRank: '', familyBudget: '一般', goal: '还没想清' },
    fields: [
      { key: 'stage', label: '阶段', type: 'select', options: ['中考', '高考', '考研', '就业', '转专业'] },
      { key: 'province', label: '地区', type: 'text', placeholder: '例如：河南 / 北京 / 江苏' },
      { key: 'level', label: '当前水平', type: 'select', options: ['偏弱', '中等', '中上', '前列', '不清楚'] },
      { key: 'scoreRank', label: '分数或排名', type: 'text', placeholder: '例如：年级前30% / 560分' },
      { key: 'familyBudget', label: '家庭投入', type: 'select', options: ['紧张', '一般', '能投入'] },
      { key: 'goal', label: '目标', type: 'select', options: ['还没想清', '保底升学', '冲好学校', '尽快就业'] },
    ],
  },
  wangzhigang: {
    title: '战略定位研判单',
    intro: '先找项目的魂，再看资源、抓手和破局路径。',
    quickQuestions: ['这个项目真正的战略抓手是什么', '我这件事该先做品牌、渠道还是产品', '帮我把城市/园区项目讲成一个清楚的战略故事'],
    defaults: { projectType: '企业项目', currentStage: '起步期', coreResource: '', targetStakeholder: '', bottleneck: '', desiredOutcome: '定位判断+破局路径' },
    fields: [
      { key: 'projectType', label: '项目类型', type: 'select', options: ['企业项目', '区域/城市项目', '园区项目', '文旅项目', '教育项目', '个人事业'] },
      { key: 'currentStage', label: '当前阶段', type: 'select', options: ['想法期', '起步期', '增长期', '转型期', '停滞期'] },
      { key: 'coreResource', label: '手里资源', type: 'textarea', placeholder: '资金、人、渠道、政策、内容、技术、存量用户等' },
      { key: 'targetStakeholder', label: '关键对象', type: 'text', placeholder: '客户、政府、投资人、合作方、团队等' },
      { key: 'bottleneck', label: '最大卡点', type: 'textarea', placeholder: '现在为什么推不动，缺钱、缺信任、缺入口还是缺叙事？' },
      { key: 'desiredOutcome', label: '需要产物', type: 'select', options: ['定位判断+破局路径', '战略叙事', '资源盘点', '三步行动方案', '对外汇报提纲'] },
    ],
  },
  'steve-jobs': {
    title: '产品取舍工作台',
    intro: '先说用户、目标和卡点，再砍掉不必要的功能。',
    quickQuestions: ['这个首页怎么砍', '功能太多，怎么做 MVP', '这个流程哪里不顺'],
    defaults: { productName: '', user: '', goal: '', currentStage: 'MVP', painPoint: '', features: '' },
    fields: [
      { key: 'productName', label: '产品名称', type: 'text', placeholder: '例如：某 App / 小程序 / 工具' },
      { key: 'user', label: '目标用户', type: 'text', placeholder: '例如：家长 / 学生 / 商家' },
      { key: 'goal', label: '核心目标', type: 'text', placeholder: '例如：注册 / 留存 / 转化' },
      { key: 'currentStage', label: '产品阶段', type: 'select', options: ['探索期', 'MVP', '成长期', '成熟期'] },
      { key: 'painPoint', label: '最大卡点', type: 'textarea', placeholder: '现在最不顺的地方是什么？' },
      { key: 'features', label: '现有功能', type: 'textarea', placeholder: '当前已经有哪些功能？' },
    ],
  },
  luoxiang: {
    title: '法律边界事实单',
    intro: '先拆事实、证据和角色，再判断能做、慎做、别碰。',
    quickQuestions: ['这件事有没有法律风险', '合同里这条能不能签', '别人这样做我该怎么留证据'],
    defaults: { matterType: '合同/合作', role: '', timeline: '', evidence: '', concern: '', expectedResult: '风险分级+下一步' },
    fields: [
      { key: 'matterType', label: '事情类型', type: 'select', options: ['合同/合作', '劳动用工', '消费纠纷', '知识产权', '名誉/隐私', '平台纠纷', '其他'] },
      { key: 'role', label: '你的角色', type: 'text', placeholder: '例如：甲方、乙方、员工、商家、消费者、被投诉方' },
      { key: 'timeline', label: '发生经过', type: 'textarea', placeholder: '按时间顺序写，谁在什么时候做了什么' },
      { key: 'evidence', label: '已有材料', type: 'textarea', placeholder: '合同、聊天记录、付款记录、录音、截图、邮件等' },
      { key: 'concern', label: '最担心什么', type: 'textarea', placeholder: '赔钱、违约、被起诉、影响声誉、无法举证等' },
      { key: 'expectedResult', label: '需要产物', type: 'select', options: ['风险分级+下一步', '证据清单', '沟通话术', '合同条款提醒', '处理路线'] },
    ],
  },
  yemaozhong: {
    title: '冲突营销策划单',
    intro: '找消费者心里的矛盾，把它钉成一句话和一个画面。',
    quickQuestions: ['这个品牌冲突点是什么', '帮我写一句有记忆点的广告语', '新品上市怎么打第一波传播'],
    defaults: { category: '', targetUser: '', purchaseConflict: '', competitor: '', productAdvantage: '', outputNeed: '一句话钩子+传播画面' },
    fields: [
      { key: 'category', label: '品类/产品', type: 'text', placeholder: '例如：作文课、咖啡、健身房、企业服务' },
      { key: 'targetUser', label: '目标人群', type: 'text', placeholder: '谁会买，谁会犹豫，谁会传播？' },
      { key: 'purchaseConflict', label: '购买冲突', type: 'textarea', placeholder: '用户一边想要什么，一边害怕什么？' },
      { key: 'competitor', label: '竞品/替代品', type: 'textarea', placeholder: '用户不买你时，会买谁，或干脆不买？' },
      { key: 'productAdvantage', label: '真实优势', type: 'textarea', placeholder: '不能吹，必须能被产品、服务或体验撑住' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['一句话钩子+传播画面', '广告语备选', '卖点结构', '短视频脚本', '活动主题'] },
    ],
  },
  luoyonghao: {
    title: '产品表达打磨单',
    intro: '把卖点讲成人话，把质疑接住，让表达有梗也有底。',
    quickQuestions: ['这个产品怎么讲得更有说服力', '用户质疑贵，我该怎么回应', '帮我写一段发布会式介绍'],
    defaults: { product: '', audience: '', scene: '销售介绍', mainSellingPoint: '', objections: '', tone: '真诚直接' },
    fields: [
      { key: 'product', label: '产品/服务', type: 'text', placeholder: '你要介绍的东西是什么？' },
      { key: 'audience', label: '听众是谁', type: 'text', placeholder: '客户、投资人、用户、员工、网友等' },
      { key: 'scene', label: '表达场景', type: 'select', options: ['销售介绍', '发布会', '直播间', '危机回应', '融资路演', '短视频口播'] },
      { key: 'mainSellingPoint', label: '核心卖点', type: 'textarea', placeholder: '最好用事实写，不要只写形容词' },
      { key: 'objections', label: '用户质疑', type: 'textarea', placeholder: '贵、不信、没必要、太复杂、和竞品差不多等' },
      { key: 'tone', label: '语气', type: 'select', options: ['真诚直接', '锋利一点', '幽默一点', '克制专业', '发布会感'] },
    ],
  },
  fandeng: {
    title: '知识拆解教学单',
    intro: '把复杂概念拆成能复述、能教学、能迁移的结构。',
    quickQuestions: ['这本书怎么讲给普通人听', '帮我把一个复杂概念讲简单', '这节课怎么设计更容易吸收'],
    defaults: { materialType: '一本书/文章', audience: '', concept: '', useScene: '课程讲解', difficulty: '', outputNeed: '知识卡片+讲述结构' },
    fields: [
      { key: 'materialType', label: '材料类型', type: 'select', options: ['一本书/文章', '课程内容', '行业知识', '管理方法', '亲子/心理主题', '演讲稿'] },
      { key: 'audience', label: '听众对象', type: 'text', placeholder: '普通家长、老师、管理者、学生、创业者等' },
      { key: 'concept', label: '核心内容', type: 'textarea', placeholder: '把要拆解的观点、段落或目录贴进来' },
      { key: 'useScene', label: '使用场景', type: 'select', options: ['课程讲解', '读书分享', '短视频脚本', '社群分享', '内部培训'] },
      { key: 'difficulty', label: '听众难点', type: 'textarea', placeholder: '听不懂、记不住、不愿意听、不会用、容易误解等' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['知识卡片+讲述结构', '三段式讲稿', '课程大纲', '案例库', '练习题'] },
    ],
  },
  mayun: {
    title: '商业格局判断单',
    intro: '从长期趋势、生态位置和组织能力看这件事值不值得做。',
    quickQuestions: ['这个生意未来有没有空间', '我该怎么搭合作生态', '团队现在最大的问题是什么'],
    defaults: { businessType: '新业务', market: '', customerValue: '', ecosystemRole: '', organization: '', outputNeed: '格局判断+关键动作' },
    fields: [
      { key: 'businessType', label: '业务类型', type: 'select', options: ['新业务', '传统业务转型', '平台/生态', '本地服务', '教育培训', '企业服务'] },
      { key: 'market', label: '市场变化', type: 'textarea', placeholder: '行业正在变大的原因，或正在变难的原因' },
      { key: 'customerValue', label: '客户价值', type: 'textarea', placeholder: '你到底帮客户解决什么长期问题？' },
      { key: 'ecosystemRole', label: '生态位置', type: 'text', placeholder: '入口、工具、平台、服务商、内容方、渠道方等' },
      { key: 'organization', label: '组织能力', type: 'textarea', placeholder: '团队、文化、执行、现金流、合作伙伴等真实情况' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['格局判断+关键动作', '商业模式梳理', '合作生态图', '组织问题清单', '长期路线'] },
    ],
  },
  masike: {
    title: '第一性原理实验单',
    intro: '把目标、物理约束和成本拆到底，先找最快验证办法。',
    quickQuestions: ['这件事能不能用第一性原理重拆', '怎么设计一个最小实验', '成本为什么降不下来'],
    defaults: { goal: '', constraint: '', currentMethod: '', costDriver: '', experiment: '', outputNeed: '最小实验+瓶颈判断' },
    fields: [
      { key: 'goal', label: '终局目标', type: 'textarea', placeholder: '如果不考虑惯例，你真正想达到什么？' },
      { key: 'constraint', label: '硬约束', type: 'textarea', placeholder: '时间、成本、物理条件、技术能力、供应链、人力等' },
      { key: 'currentMethod', label: '现在做法', type: 'textarea', placeholder: '当前流程或方案是什么，哪里像是沿用惯例？' },
      { key: 'costDriver', label: '主要成本', type: 'textarea', placeholder: '钱、时间、沟通、材料、算力、失败代价等' },
      { key: 'experiment', label: '可做实验', type: 'textarea', placeholder: '手里现在能最快验证什么？' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['最小实验+瓶颈判断', '成本拆解', '技术路线', '反常识方案', '验证计划'] },
    ],
  },
  wentiejun: {
    title: '结构问题分析单',
    intro: '把表面问题放进制度成本、历史周期和利益结构里看。',
    quickQuestions: ['这个问题背后的结构原因是什么', '城乡关系该怎么理解', '帮我分析一个政策/产业变化'],
    defaults: { topic: '', level: '行业/产业', visibleProblem: '', stakeholders: '', history: '', outputNeed: '结构图+判断' },
    fields: [
      { key: 'topic', label: '议题', type: 'text', placeholder: '例如：乡村教育、社区商业、农业项目、区域发展' },
      { key: 'level', label: '分析层级', type: 'select', options: ['个人处境', '组织/企业', '行业/产业', '城乡区域', '制度政策'] },
      { key: 'visibleProblem', label: '表面问题', type: 'textarea', placeholder: '现在看起来最突出的矛盾是什么？' },
      { key: 'stakeholders', label: '相关角色', type: 'textarea', placeholder: '政府、企业、农户、学校、平台、资本、消费者等' },
      { key: 'history', label: '历史/周期背景', type: 'textarea', placeholder: '这个问题是最近出现，还是长期积累？经历过什么变化？' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['结构图+判断', '利益关系梳理', '风险提醒', '政策解读', '行动建议'] },
    ],
  },
  xuehuashi: {
    title: '磁医学研判单',
    intro: '围绕磁医学的机理、证据和边界，判断下一步怎么验证。',
    quickQuestions: ['这个磁医学观点怎么判断可信度', '这个方案缺哪类证据', '如何设计一个更稳妥的验证路径'],
    defaults: { topic: '', mechanism: '', evidence: '', applicationScene: '研究讨论', boundary: '', outputNeed: '证据分层+验证建议' },
    fields: [
      { key: 'topic', label: '研究/应用主题', type: 'text', placeholder: '例如：磁场干预、康复场景、疼痛管理、睡眠等' },
      { key: 'mechanism', label: '机理假设', type: 'textarea', placeholder: '它声称通过什么机制发生作用？' },
      { key: 'evidence', label: '已有证据', type: 'textarea', placeholder: '论文、实验、病例、设备参数、观察记录等' },
      { key: 'applicationScene', label: '使用场景', type: 'select', options: ['研究讨论', '产品验证', '科普表达', '临床沟通', '产业判断'] },
      { key: 'boundary', label: '边界和风险', type: 'textarea', placeholder: '不能替代什么？哪些说法可能过度？' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['证据分层+验证建议', '机理梳理', '研究问题清单', '科普表达', '风险边界'] },
    ],
  },
  zhanqimin: {
    title: '肠道健康沟通单',
    intro: '从症状、检查和就医边界看肠道问题，给出可沟通清单。',
    quickQuestions: ['这些肠道症状该怎么整理给医生', '益生菌/饮食调整怎么判断是否适合', '哪些情况需要尽快就医'],
    defaults: { symptom: '', duration: '', checkResult: '', lifestyle: '', redFlag: '', outputNeed: '就医沟通清单' },
    fields: [
      { key: 'symptom', label: '主要表现', type: 'textarea', placeholder: '腹痛、腹胀、腹泻、便秘、便血、体重变化等' },
      { key: 'duration', label: '持续时间', type: 'text', placeholder: '例如：两周、半年、反复多年' },
      { key: 'checkResult', label: '检查/诊断', type: 'textarea', placeholder: '肠镜、粪便检查、血检、医生诊断、用药记录等' },
      { key: 'lifestyle', label: '饮食和生活', type: 'textarea', placeholder: '饮食结构、睡眠、压力、运动、饮酒、外卖等' },
      { key: 'redFlag', label: '警示情况', type: 'textarea', placeholder: '发热、便血、黑便、消瘦、夜间痛、家族史等' },
      { key: 'outputNeed', label: '需要产物', type: 'select', options: ['就医沟通清单', '检查问题清单', '生活调整建议', '风险分级', '长期记录表'] },
    ],
  },
  default: {
    title: '信息判断单',
    intro: '把背景、目标和约束先讲清楚，AI 再追问关键变量。',
    quickQuestions: ['帮我拆一下这个问题', '我现在卡住了怎么办', '给我一个可执行方案'],
    defaults: { background: '', target: '', constraints: '', currentAction: '' },
    fields: [
      { key: 'background', label: '背景', type: 'textarea', placeholder: '先说发生了什么' },
      { key: 'target', label: '目标', type: 'text', placeholder: '你想达成什么？' },
      { key: 'constraints', label: '约束', type: 'textarea', placeholder: '时间、预算、资源、风险' },
      { key: 'currentAction', label: '已有动作', type: 'textarea', placeholder: '你已经做过什么？' },
    ],
  },
};

function getPanel(expertId: string) {
  return PANEL_CONFIGS[expertId] || PANEL_CONFIGS.default;
}

function MessageText({ content }: { content: string }) {
  return <div className="whitespace-pre-wrap">{content.replace(/\*\*/g, '')}</div>;
}

function Segment<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black text-stone-700">{label}</p>
      <div className="flex flex-wrap gap-1.5 rounded-2xl bg-stone-100 p-1">
        {options.map(option => (
          <button
            type="button"
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-xl px-2.5 py-1.5 text-xs font-semibold transition ${
              option === value ? 'bg-white text-emerald-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldConfig; value: string; onChange: (value: string) => void }) {
  if (field.type === 'select') {
    return <Segment label={field.label} value={value || field.options?.[0] || ''} options={field.options || []} onChange={onChange} />;
  }

  const className = 'w-full rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700';
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-stone-700">{field.label}</span>
      {field.type === 'textarea' ? (
        <textarea value={value} onChange={event => onChange(event.target.value)} placeholder={field.placeholder || ''} rows={3} className={`${className} py-2`} />
      ) : (
        <input value={value} onChange={event => onChange(event.target.value)} placeholder={field.placeholder || ''} className={`${className} h-9`} />
      )}
    </label>
  );
}

export default function ChatPage({ userId, conversationId, expertId, expertName, onBack, onOpenCredits, onOpenHome }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [creditBlocked, setCreditBlocked] = useState(false);
  const [replyLength, setReplyLength] = useState<ReplyLength>('正常');
  const [askStyle, setAskStyle] = useState<AskStyle>('边问边判');
  const [outputStyle, setOutputStyle] = useState<OutputStyle>('给行动清单');
  const panel = useMemo(() => getPanel(expertId), [expertId]);
  const meta = useMemo(() => getExpertDisplay(expertId), [expertId]);
  const [formState, setFormState] = useState<{ expertId: string; values: Record<string, string> }>(() => ({
    expertId,
    values: { ...panel.defaults },
  }));
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);

  const formValues = formState.expertId === expertId ? formState.values : panel.defaults;

  useEffect(() => {
    getMessages(conversationId).then(setMessages).catch(() => showToast('加载消息失败'));
    getConversation(conversationId).then(c => setConversationTitle(c.title)).catch(() => {});
    return () => {
      abortRef.current?.abort();
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const buildUserMessage = (text: string) => {
    const parts = [
      text.trim(),
      '',
      '【本次 AI 判断设置】',
      `回复长度：${replyLength}`,
      `沟通方式：${askStyle}`,
      `希望产出：${outputStyle}`,
      '',
      `【${panel.title}】`,
    ];

    for (const field of panel.fields) {
      const value = formValues[field.key]?.trim();
      if (value) parts.push(`${field.label}：${value}`);
    }

    return parts.join('\n');
  };

  const sendText = (text: string) => {
    if (!text.trim() || sending) return;

    abortRef.current?.abort();
    setCreditBlocked(false);
    setSending(true);
    setInput('');
    setStreamingContent('');
    streamingRef.current = '';

    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: text.trim(), createdAt: new Date().toISOString() }]);

    abortRef.current = sendMessageStream(
      conversationId,
      userId,
      buildUserMessage(text),
      chunk => {
        streamingRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      messageId => {
        const finalContent = streamingRef.current;
        setMessages(prev => [
          ...prev.filter(m => !m.id.startsWith(TEMP_ID_PREFIX)),
          { id: messageId, role: 'assistant', content: finalContent, createdAt: new Date().toISOString() },
        ]);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
      err => {
        if (err.includes('积分不足')) {
          setCreditBlocked(true);
        }
        showToast(err);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
    );
  };

  const updateField = (key: string, value: string) => {
    setFormState(prev => {
      const values = prev.expertId === expertId ? prev.values : panel.defaults;
      return { expertId, values: { ...values, [key]: value } };
    });
  };

  return (
    <div className="flex h-screen flex-col bg-[#f7f2e8]">
      <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-[#f7f2e8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-300 bg-white/70 text-stone-600 transition hover:border-stone-500" title="返回">
            ←
          </button>
          <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-emerald-300 hover:text-emerald-800">
            首页
          </button>
          <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-emerald-950">{expertName || meta.alias}</h1>
            <p className="truncate text-xs text-stone-500">{conversationTitle || meta.title}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className={`rounded-3xl border border-stone-200 ${meta.soft} p-4 shadow-sm`}>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-sm">
                  <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <div>
                  <p className="text-lg font-black text-stone-950">{meta.alias}</p>
                  <p className="text-xs text-stone-500">{meta.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-stone-700">{meta.promise}</p>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white/85 p-4 shadow-sm">
                <h2 className="text-base font-black text-stone-900">{panel.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{panel.intro}</p>
              <div className="mt-4 space-y-4">
                {panel.fields.map(field => (
                  <Field key={field.key} field={field} value={formValues[field.key] || ''} onChange={next => updateField(field.key, next)} />
                ))}
                <button onClick={() => sendText(`请根据我填写的【${panel.title}】先判断，还缺什么关键信息，再开始给建议。`)} disabled={sending} className="w-full rounded-2xl bg-emerald-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50">
                  用这些信息开始判断
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white/85 p-4 shadow-sm">
              <h2 className="text-base font-black text-stone-900">判断设置</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">不用懂专业词，只调整你想要的沟通方式。</p>
              <div className="mt-4 space-y-4">
                <Segment label="回复长度" value={replyLength} options={['短一点', '正常', '详细']} onChange={setReplyLength} />
                <Segment label="追问节奏" value={askStyle} options={['多追问', '边问边判', '直接给建议']} onChange={setAskStyle} />
                <Segment label="最后想要" value={outputStyle} options={['先聊清楚', '给路线表', '给行动清单']} onChange={setOutputStyle} />
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {messages.length === 0 && !sending && (
              <>
                <div className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
                  <h3 className="text-lg font-black text-stone-900">你可以直接问</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {panel.quickQuestions.map(question => (
                      <button key={question} type="button" onClick={() => sendText(question)} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-left text-sm font-semibold leading-5 text-stone-700 transition hover:border-emerald-700 hover:bg-white hover:text-emerald-800">
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-dashed border-stone-300 bg-white/55 p-5 text-sm leading-6 text-stone-500">
                  左侧信息填得越像真实任务，系统越能少追问、直接判断。没把握的地方可以空着，先用自己的话讲也可以。
                </div>
              </>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${msg.role === 'user' ? 'rounded-tr-sm bg-emerald-900 text-white' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'}`}>
                  <MessageText content={msg.content} />
                  {msg.role === 'assistant' && (
                    <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-xs opacity-0 shadow-sm transition hover:bg-stone-50 group-hover:opacity-100" title="复制">
                      ⧉
                    </button>
                  )}
                </div>
              </div>
            ))}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-3xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                  <MessageText content={streamingContent} />
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-700 align-middle" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </section>
        </div>
      </div>

      <div className="border-t border-emerald-900/10 bg-[#f7f2e8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl">
{creditBlocked && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-black">积分不足，暂时不能继续提问</p>
              <p className="mt-1 text-xs leading-5 text-red-700">本次没有扣分。请返回 AI 外脑查看余额，补充积分后再继续使用。</p>
              <button type="button" onClick={onOpenCredits} className="mt-3 rounded-full bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">
                去积分中心
              </button>
            </div>
          )}
          <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && sendText(input)}
            placeholder={sending ? '等 AI 追问或判断中...' : '先随便说，不清楚也没关系'}
            className="flex-1 rounded-2xl border border-stone-300 bg-white/80 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
          />
          <button onClick={() => sendText(input)} disabled={sending || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white shadow transition hover:bg-emerald-800 disabled:opacity-40" title="发送">
            →
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}
