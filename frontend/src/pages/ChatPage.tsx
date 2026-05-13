import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { getConversation, getMessages, sendMessageStream, uploadAttachments, type Attachment } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface Props {
  token: string;
  conversationId: string;
  expertId: string;
  expertName: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
}

const TEMP_ID_PREFIX = 'temp-';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'aibrain';
}

function downloadWordDocument(title: string, content: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.7;"><h1 style="font-size:18pt;margin:0 0 16px;">${escapeHtml(title)}</h1><div style="white-space:pre-wrap;">${escapeHtml(content)}</div></body></html>`;
  const blob = new Blob([`\ufeff${html}`], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(title)}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const QUICK_QUESTIONS = [
  '先帮我判断这个问题的关键变量。',
  '根据我上传的材料，给我一份行动清单。',
  '请把结论用表格整理出来。',
];

const MINDFULNESS_QUESTIONS = [
  '我现在很焦虑，先带我做一个 3 分钟呼吸练习。',
  '我脑子停不下来，帮我做睡前安顿。',
  '我很烦躁，帮我把身体和情绪慢慢放下来。',
];

const WANGDINGJUN_QUESTIONS = [
  '请按“题干限制、种籽句、主钉子、下一刀”帮我快批这篇作文。',
  '请把这些共性问题变成一节可上课的讲评课。',
  '请按鼎公法生成素材包、讲义和说课稿。',
  '请诊断我上传的资料，并给一版可用改稿。',
];

type TeacherBoardId = 'correction' | 'preparation';
type TeacherWorkflowId =
  | 'essay-correction'
  | 'lesson-review'
  | 'after-class-note'
  | 'lesson-organize'
  | 'ai-generate'
  | 'polish-material';

const TEACHER_BOARDS: Array<{ id: TeacherBoardId; label: string; hint: string }> = [
  { id: 'correction', label: '批改评讲', hint: '批改、讲评、课后沟通都先过鼎公法' },
  { id: 'preparation', label: '写作教学', hint: '素材、讲义、说课稿、教案与资料诊改' },
];

const WORKFLOWS_BY_BOARD: Record<TeacherBoardId, TeacherWorkflowId[]> = {
  correction: ['essay-correction', 'lesson-review', 'after-class-note'],
  preparation: ['lesson-organize', 'ai-generate', 'polish-material'],
};

const TEACHER_WORKFLOWS: Record<TeacherWorkflowId, {
  board: TeacherBoardId;
  label: string;
  title: string;
  intro: string;
  button: string;
  materialLabel: string;
  materialPlaceholder: string;
  directionLabel: string;
  directionPlaceholder: string;
  outputLabel: string;
  outputPlaceholder: string;
  prompt: string;
  outputStructure: string[];
}> = {
  'essay-correction': {
    board: 'correction',
    label: '鼎公快批',
    title: '一篇作文，先找种籽句，再落下一刀',
    intro: '批改不是通用纠错。先用鼎公法判断题干、种籽句和主钉子，再生成学生能改、老师能讲、家长能懂的批改稿。',
    button: '用鼎公法快批',
    materialLabel: '学生作文 / 题目 / 上一轮任务（可选）',
    materialPlaceholder: '粘贴学生作文、作文题、上一稿修改任务。也可以只上传 Word、PDF、TXT、Markdown。',
    directionLabel: '本次想盯住什么（可选）',
    directionPlaceholder: '例如：只看审题；重点看细节；二稿只核查上一刀；也可留空让系统判断。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：学生包 + 老师包 + 家长短话；或只要老师讲评要点。',
    prompt: '请按鼎公作文分身完成快批：先判题干限制词、任务词和材料关键词；再从原文找 25 字以内的种籽句；只钉一枚主钉子；旁批必须是动作，不是情绪评价；给学生下一刀，3 条以内，至少 1 条 10 分钟能完成；最后分开写【文学改进】与【应试得分】。不要默认只有一二三稿，老师要求几轮就支持几轮。',
    outputStructure: ['题干限制', '种籽句', '一枚主钉子', '动作型旁批', '下一刀修改任务', '文学/应试双轨'],
  },
  'lesson-review': {
    board: 'correction',
    label: '讲评课',
    title: '把共性问题讲成一节能落地的课',
    intro: '从作文样本里提炼 Top3 共性错因，给投影短句、微练和作业闭环。',
    button: '生成讲评课',
    materialLabel: '作文样本 / 共性问题 / 批改记录（可选）',
    materialPlaceholder: '粘贴几段学生原文、共性问题、批改记录，或直接上传资料。',
    directionLabel: '讲评目标（可选）',
    directionPlaceholder: '例如：40 分钟讲评课；只讲开头；围绕细节描写做课堂训练。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：讲评流程 + 板书 + 小练 + 作业。',
    prompt: '请按鼎公作文讲评课协议处理：先从材料提取共性错因 Top3；每个错因必须指向学生原文或材料信号；给一条可投影短句；设计一段原文细读或模拟片段；给当堂微练；最后形成课后下一刀。不要把讲评课写成泛泛教案。',
    outputStructure: ['共性错因 Top3', '可投影短句', '原文细读或模拟片段', '当堂微练', '课后下一刀'],
  },
  'after-class-note': {
    board: 'correction',
    label: '课后沟通',
    title: '把批改结果整理成家长和学生看得懂的话',
    intro: '课后沟通也是作文教学的一部分。用事实、进步、一件配合和下一刀，把机械文案变成有分寸的教学交付。',
    button: '生成沟通文案',
    materialLabel: '批改结果 / 课堂事实 / 学生表现（可选）',
    materialPlaceholder: '粘贴本次作文批改要点、课堂情况、孩子进步或问题。也可以只上传资料。',
    directionLabel: '沟通对象与语气（可选）',
    directionPlaceholder: '例如：发家长私聊；发班级群；给学生本人；语气温和、具体、不焦虑营销。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：家长三段话 + 学生下一刀 + 老师内部提醒。',
    prompt: '请按鼎公家长反馈协议处理：先把批改结果转成家长或学生能读懂的事实；只讲一个可观察进步、一件家庭配合和一个学生下一刀；语气克制，不羞辱、不制造焦虑、不夸大提分承诺。输出要能直接复制发送，也要保留鼎公判断依据。',
    outputStructure: ['鼎公判断依据', '事实', '进步', '一件配合', '学生下一刀', '老师内部提醒'],
  },
  'lesson-organize': {
    board: 'preparation',
    label: '整理教案',
    title: '把零散备课材料整理成可上课版本',
    intro: '老师已有想法时，不必从零生成。工具先用鼎公法做取舍，再把零散材料整理成教案、板书、课堂任务和作业闭环。',
    button: '整理成教案',
    materialLabel: '已有教案 / 课堂想法 / 讲义草稿（可选）',
    materialPlaceholder: '粘贴零散备课笔记、讲义草稿、PPT 文案、训练目标，或上传文件。',
    directionLabel: '整理要求（可选）',
    directionPlaceholder: '例如：40 分钟；要有板书；要有学生动笔任务；要适合小班。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：教案 + 板书 + 讲义留白 + 作业闭环。',
    prompt: '请把老师已有材料整理成可上课教案：保留原意，补齐教学目标、课堂流程、板书提示、学生动笔任务和作业闭环；同时标出其中的鼎公判断支点，如题干限制、种籽句、主钉子或下一刀。',
    outputStructure: ['整理后的教案', '板书提示', '学生任务', '作业闭环', '鼎公判断支点'],
  },
  'ai-generate': {
    board: 'preparation',
    label: '素材讲义说课',
    title: '素材、讲义、说课稿，一次生成可交付版本',
    intro: '素材包、讲义、说课稿不是漂亮文案。先定本课一刀、材料抓手和学生动作，再生成老师能上课、能提交、能发出的版本。',
    button: '生成教学成品',
    materialLabel: '题目 / 方向 / 现有素材 / 课程要求（可选）',
    materialPlaceholder: '例如：训练“细节描写”；要一份讲义；准备说课稿；需要成长主题素材包；也可以上传已有资料。',
    directionLabel: '使用场景（可选）',
    directionPlaceholder: '例如：40 分钟课；赛课说课；机构小班；校内公开课；课后练习包。',
    outputLabel: '想要的成品（可选）',
    outputPlaceholder: '例如：素材包 + 讲义 + 说课稿；PPT 骨架；作业单；课堂逐字稿。',
    prompt: '请按鼎公写作教学成品协议生成：先判断用户要交付的成品类型，如素材包、讲义、说课稿、PPT 骨架、课堂逐字稿、作业单或组合包；再把训练目标压成一刀，说明启用的写作模型（种籽句、七巧、六要、化读转写或文学/应试双轨）；所有素材必须说明课堂用法；讲义必须有学生动笔位置；说课稿必须有教学目标、重难点、过程、评价与作业闭环；不要替学生生成整篇可提交作文，只给片段级示范。',
    outputStructure: ['成品清单', '本课一刀', '启用模型', '素材与用法', '讲义或说课稿正文', '学生任务', '作业闭环'],
  },
  'polish-material': {
    board: 'preparation',
    label: '资料诊改',
    title: '上传老师自己的资料，让鼎公指出不足并改稿',
    intro: '反向工作流：老师先给自己的教案、讲义、说课稿或素材包，鼎公先诊断哪里空、哪里散、哪里不能落到学生动作，再给修改稿。',
    button: '诊改这份资料',
    materialLabel: '老师已有资料（可选）',
    materialPlaceholder: '粘贴教案、讲义、逐字稿、PPT 文案、题目说明。也可以只上传 Word、PDF、TXT、Markdown。',
    directionLabel: '希望提升哪里（可选）',
    directionPlaceholder: '例如：减少空话；补学生任务；增加投影短句；改成更像一线课堂。',
    outputLabel: '希望产出（可选）',
    outputPlaceholder: '例如：不足清单 + 修改意见 + 可直接使用版本；或只要老师内部诊断。',
    prompt: '请按鼎公资料诊改协议处理：先肯定这份资料可用处；再指出最影响课堂使用的 1-3 个不足；说明它缺少题干限制、种籽句、主钉子、动作型任务、素材用法或下一刀中的哪几项；最后输出一版可直接使用的改稿。不要只润色语言，要提升教学判断和课堂效果。',
    outputStructure: ['可用处', '不足诊断', '补上的鼎公判断', '修改意见', '可直接使用版本', '还需补充的事实'],
  },
};

type WorkbenchFieldKey =
  | 'clientName'
  | 'clientBackground'
  | 'background'
  | 'goal'
  | 'material'
  | 'output'
  | 'grade'
  | 'region'
  | 'textbook'
  | 'materialType'
  | 'studentLevel';

interface WorkbenchField {
  key: WorkbenchFieldKey;
  label: string;
  placeholder: string;
  rows?: number;
  options?: string[];
}

type WorkbenchValues = Record<WorkbenchFieldKey, string>;

interface WorkbenchCopy {
  title: string;
  intro: string;
  button: string;
  prompt: string;
  outputFallback: string;
  fields: WorkbenchField[];
}

const DEFAULT_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '判断结论 + 行动清单',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const MINDFULNESS_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '先稳定下来',
  material: '',
  output: '安抚语言 + 正念练习步骤',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

const WANGDINGJUN_WORKBENCH: WorkbenchValues = {
  clientName: '',
  clientBackground: '',
  background: '',
  goal: '',
  material: '',
  output: '',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '',
};

function getInitialWorkbench(expertId: string) {
  if (expertId === 'wangdingjun') return { ...WANGDINGJUN_WORKBENCH };
  return expertId === 'thich-nhat-hanh' ? { ...MINDFULNESS_WORKBENCH } : { ...DEFAULT_WORKBENCH };
}

function getWorkbenchCopy(expertId: string): WorkbenchCopy {
  if (expertId === 'wangdingjun') {
    return {
      title: '作文批改与写作教学工作台',
      intro: '请先粘贴作文、题目、教案、讲义、说课稿或老师已有资料，也可以直接上传 Word、PDF、文本等可读取资料。鼎公只处理作文批改、写作教学、讲评课、教学成品生成和资料诊改。',
      button: '开始处理',
      prompt: '请根据作文批改与写作教学工作台信息，先按鼎公法判断，再完成本次老师需要交付的成品或资料诊改。',
      outputFallback: '可直接使用成品 + 鼎公判断依据',
      fields: [
        { key: 'grade', label: '年级', placeholder: '请选择年级', rows: 1, options: ['三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'] },
        { key: 'region', label: '地区', placeholder: '省份或城市，例如：江苏南京', rows: 1 },
        { key: 'textbook', label: '教材版本', placeholder: '请选择教材版本', rows: 1, options: ['统编版', '人教版', '苏教版', '沪教版', '其他', '不确定'] },
        { key: 'materialType', label: '材料类型', placeholder: '请选择材料类型', rows: 1, options: ['作文', '试卷', '日常作业', '小练笔', '阅读理解', '其他'] },
        { key: 'goal', label: '批改目标', placeholder: '请选择批改目标', rows: 1, options: ['提升表达', '应试提分', '课堂讲评', '家长反馈', '学生修改任务'] },
        { key: 'studentLevel', label: '学生水平', placeholder: '请选择学生水平', rows: 1, options: ['基础薄弱', '中等', '较好', '尖子生', '不确定'] },
        { key: 'material', label: '作文或材料内容', placeholder: '请粘贴作文正文、题目要求、试卷题干或日常作业内容。暂不支持图片识别。', rows: 8 },
        { key: 'output', label: '期望产出', placeholder: '请选择期望产出', rows: 1, options: ['作文批改 + 修改建议', '试卷讲评提纲', '日常作业反馈', '家长可读反馈', '学生修改任务'] },
      ] satisfies WorkbenchField[],
    };
  }

  const isMindfulness = expertId === 'thich-nhat-hanh';
  if (isMindfulness) {
    return {
      title: '正念舒缓工作台',
      intro: '把咨询者、背景、压力来源和身体感受先放进来，附件可以在底部上传。',
      button: '用工作台开始安顿',
      prompt: '请根据正念舒缓工作台信息，先安抚咨询者，再给出可跟做的正念练习。',
      outputFallback: '安抚语言 + 正念练习步骤',
      fields: [
        { key: 'clientName', label: '咨询者姓名', placeholder: '姓名 / 称呼，例如：小林、王老师、孩子妈妈', rows: 1 },
        { key: 'clientBackground', label: '咨询者背景', placeholder: '身份、年龄段、职业/学习状态、最近处境。例如：初三学生，最近考试压力大；创业者，连续失眠。', rows: 3 },
        { key: 'background', label: '当前困扰', placeholder: '现在发生了什么？主要压力、情绪或睡眠问题是什么？', rows: 3 },
        { key: 'material', label: '身体感受与触发点', placeholder: '例如：胸口紧、头很胀、肩颈硬、刚和人吵完、睡前脑子停不下来。', rows: 3 },
        { key: 'goal', label: '希望状态', placeholder: '希望结束时达到什么状态？例如：能睡、缓下来、先不崩、能继续做事。', rows: 2 },
        { key: 'output', label: '希望产出', placeholder: '例如：安抚语言 + 3分钟呼吸练习 / 睡前安顿步骤 / 步行禅引导词', rows: 1 },
      ] satisfies WorkbenchField[],
    };
  }

  return {
    title: '专家工作台',
    intro: '把背景、目标和材料先放进来，附件可以在底部上传。',
    button: '用工作台开始判断',
    prompt: '请根据专家工作台信息先判断关键问题，再给建议。',
    outputFallback: '判断结论 + 行动清单',
    fields: [
      { key: 'background', label: '背景', placeholder: '发生了什么？现在卡在哪里？', rows: 3 },
      { key: 'goal', label: '目标', placeholder: '你想得到什么判断或结果？', rows: 3 },
      { key: 'material', label: '材料要点', placeholder: '把附件里的重点、限制条件或已知事实写几句。', rows: 3 },
      { key: 'output', label: '希望产出', placeholder: '判断结论 + 行动清单', rows: 1 },
    ] satisfies WorkbenchField[],
  };
}

function resolveAssetUrl(url: string) {
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:')) return url;
  return `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || ''}${url}`;
}

function MessageText({ content, dark = false }: { content: string; dark?: boolean }) {
  return (
    <div className={`message-rich ${dark ? 'message-rich-dark' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => <a href={href || '#'} target="_blank" rel="noreferrer">{children}</a>,
          img: ({ src, alt }) => <img src={resolveAssetUrl(String(src || ''))} alt={alt || ''} loading="lazy" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AttachmentList({ attachments, dark = false }: { attachments?: Attachment[]; dark?: boolean }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {attachments.map(item => {
        const href = resolveAssetUrl(item.url);
        const isImage = item.mimeType.startsWith('image/');
        return (
          <a
            key={item.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className={`block overflow-hidden rounded-2xl border text-left ${dark ? 'border-white/20 bg-white/10' : 'border-stone-200 bg-stone-50'}`}
          >
            {isImage ? (
              <img src={href} alt={item.name} className="max-h-60 w-full object-cover" />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold">{item.name}</div>
            )}
          </a>
        );
      })}
    </div>
  );
}

export default function ChatPage({ token, conversationId, expertId, expertName, onBack, onOpenCredits, onOpenHome }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [conversationExpert, setConversationExpert] = useState({ conversationId, expertId });
  const [creditBlocked, setCreditBlocked] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [activeTeacherBoard, setActiveTeacherBoard] = useState<TeacherBoardId>('correction');
  const [activeTeacherWorkflow, setActiveTeacherWorkflow] = useState<TeacherWorkflowId>('essay-correction');
  const [teacherLibraryOpen, setTeacherLibraryOpen] = useState(true);

  const activeExpertId = conversationExpert.conversationId === conversationId ? conversationExpert.expertId : expertId;
  const [workbenchState, setWorkbenchState] = useState(() => ({
    expertId: activeExpertId,
    values: getInitialWorkbench(activeExpertId),
  }));

  const meta = useMemo(() => getExpertDisplay(activeExpertId), [activeExpertId]);
  const displayExpertName = activeExpertId === expertId ? expertName : meta.alias;
  const isMindfulness = activeExpertId === 'thich-nhat-hanh';
  const isWangdingjun = activeExpertId === 'wangdingjun';
  const workbenchCopy = useMemo(() => getWorkbenchCopy(activeExpertId), [activeExpertId]);
  const workbench = workbenchState.expertId === activeExpertId ? workbenchState.values : getInitialWorkbench(activeExpertId);
  const teacherWorkflow = TEACHER_WORKFLOWS[activeTeacherWorkflow];
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setMessagesLoading(true);
      setMessagesError(false);
      try {
        const [msgs, conv] = await Promise.all([
          getMessages(token, conversationId),
          getConversation(token, conversationId),
        ]);
        if (!active) return;
        setMessages(msgs);
        setConversationTitle(conv.title);
        if (typeof conv.expertId === 'string' && conv.expertId) {
          setConversationExpert({ conversationId, expertId: conv.expertId });
        }
      } catch {
        if (!active) return;
        setMessagesError(true);
        showToast('消息加载失败');
      } finally {
        if (active) setMessagesLoading(false);
      }
    })();
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [conversationId, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const updateWorkbenchValue = (key: WorkbenchFieldKey, value: string) => {
    setWorkbenchState(prev => ({
      expertId: activeExpertId,
      values: {
        ...(prev.expertId === activeExpertId ? prev.values : getInitialWorkbench(activeExpertId)),
        [key]: value,
      },
    }));
  };

  const switchTeacherBoard = (board: TeacherBoardId) => {
    setActiveTeacherBoard(board);
    setActiveTeacherWorkflow(WORKFLOWS_BY_BOARD[board][0]);
  };

  const buildUserMessage = (text: string) => {
    if (isWangdingjun) {
      return [
        text.trim(),
        '',
        `【鼎公工作台 · ${TEACHER_BOARDS.find(item => item.id === teacherWorkflow.board)?.label} · ${teacherWorkflow.label}】`,
        `年级：${workbench.grade || '未填写'}`,
        `地区：${workbench.region || '未填写'}`,
        `教材版本：${workbench.textbook || '未填写'}`,
        `学生水平：${workbench.studentLevel || '未填写'}`,
        `工作流：${teacherWorkflow.title}`,
        `公共背景：${workbench.background || '未填写'}`,
        `本次要求：${workbench.goal || '未填写'}`,
        `希望产出：${workbench.output || '未填写'}`,
        '',
        `【${teacherWorkflow.materialLabel}】`,
        workbench.material || '未填写',
        '',
        '【工作流指令】',
        teacherWorkflow.prompt,
        '',
        '【输出结构】',
        ...teacherWorkflow.outputStructure.map((item, index) => `${index + 1}. ${item}`),
        '',
        '【产品定位】',
        '这个工具服务一线老师、教培老师和需要独立完成写作教学交付的人。核心不是通用代写，而是让批改、素材、讲义、说课稿、教案整理、课后沟通、资料诊改这些看似机械的工作，先经过鼎公作文分身的判断，再变成老师能直接使用的成品。优秀老师可把重复成稿劳动交出去，一般老师可借专家框架提升取舍、结构和课堂落地能力。',
        '',
        '【边界要求】',
        '所有字段都可留空；如果用户上传了附件，请优先阅读附件，把附件当成本次工作流核心材料。只做作文批改、作文讲评、写作教学、素材包、讲义、说课稿、教案整理、课后沟通、教师资料诊改相关工作；不要定位为语文全科专家，不要冒充各省官方阅卷标准；材料不足时先基于已给材料产出可用版本，再标注需要老师补充的事实。',
      ].join('\n');
    }

    if (isMindfulness) {
      return [
        text.trim(),
        '',
        `【${workbenchCopy.title}】`,
        `咨询者姓名：${workbench.clientName || '未填写'}`,
        `咨询者背景：${workbench.clientBackground || '未填写'}`,
        `当前困扰：${workbench.background || '未填写'}`,
        `希望状态：${workbench.goal || '先稳定下来'}`,
        `身体感受与触发点：${workbench.material || '未填写'}`,
        `希望产出：${workbench.output || workbenchCopy.outputFallback}`,
        '',
        '【输出要求】',
        '请先安抚，再给一个可跟做的正念练习。不要诊断，不要说教，不要给太多道理。',
      ].join('\n');
    }

    const parts = [
      text.trim(),
      '',
      '【专家工作台】',
      `背景：${workbench.background || '未填写'}`,
      `目标：${workbench.goal || '未填写'}`,
      `材料要点：${workbench.material || '未填写'}`,
      `希望产出：${workbench.output || workbenchCopy.outputFallback}`,
      '',
      '【输出要求】',
      '可以使用 Markdown 表格、图片、公式。公式请用 LaTeX：行内 $...$，独立公式 $$...$$。',
    ];
    return parts.join('\n');
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files);
    if (isWangdingjun && incoming.some(file => file.type.startsWith('image/'))) {
      showToast('图片扫描批改将在 2.0 向 SVIP 用户开放。当前可先粘贴文字或上传可读取文档。');
    }
    const readableFiles = isWangdingjun ? incoming.filter(file => !file.type.startsWith('image/')) : incoming;
    const next = [...pendingFiles, ...readableFiles].slice(0, 6);
    setPendingFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendText = async (text: string) => {
    if ((!text.trim() && pendingFiles.length === 0) || sending) return;

    abortRef.current?.abort();
    setCreditBlocked(false);
    setSending(true);
    setInput('');
    setStreamingContent('');
    streamingRef.current = '';

    const filesToSend = [...pendingFiles];
    const tempId = `${TEMP_ID_PREFIX}${Date.now()}`;
    const tempAttachments = filesToSend.map((file, index) => ({
      id: `${tempId}-${index}`,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      url: URL.createObjectURL(file),
    }));

    setPendingFiles([]);
    setMessages(prev => [
      ...prev,
      {
        id: tempId,
        role: 'user',
        content: text.trim() || '请查看附件并给出判断。',
        attachments: tempAttachments,
        createdAt: new Date().toISOString(),
      },
    ]);

    let uploaded: Attachment[] = [];
    try {
      uploaded = filesToSend.length > 0 ? await uploadAttachments(token, conversationId, filesToSend) : [];
    } catch (err) {
      showToast(err instanceof Error ? err.message : '附件上传失败');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setPendingFiles(filesToSend);
      setSending(false);
      return;
    }

    abortRef.current = sendMessageStream(
      token,
      conversationId,
      buildUserMessage(text),
      uploaded.map(item => item.id),
      chunk => {
        streamingRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      messageId => {
        const finalContent = streamingRef.current;
        setMessages(prev => [
          ...prev.map(m => (m.id === tempId ? { ...m, id: `${Date.now()}-sent`, attachments: uploaded } : m)),
          { id: messageId, role: 'assistant', content: finalContent, attachments: [], createdAt: new Date().toISOString() },
        ]);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
      err => {
        if (err.includes('积分不足') || err.includes('credits')) setCreditBlocked(true);
        showToast(err);
        setStreamingContent('');
        setSending(false);
        inputRef.current?.focus();
      },
    );
  };

  if (isWangdingjun) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#f7f4ee] text-stone-950">
        <header className="shrink-0 border-b border-stone-200/70 bg-[#fffaf2]/82 px-4 py-2.5 shadow-[0_1px_20px_rgba(80,64,42,0.05)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <button onClick={onBack} className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white/85 text-lg text-stone-600 shadow-sm transition hover:bg-white" title="返回">
              ←
            </button>
            <button onClick={onOpenHome} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-sm font-black text-stone-700 shadow-sm transition hover:bg-white">
              首页
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold text-stone-950">鼎公写作教学工作台</h1>
              <p className="truncate text-xs text-stone-500">任务树定方向，材料库供依据，中间生成成品与鼎公意见。</p>
            </div>
            <button onClick={() => setTeacherLibraryOpen(prev => !prev)} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm transition hover:bg-white">
              {teacherLibraryOpen ? '收起材料库' : '展开材料库'}
            </button>
            <button onClick={onOpenCredits} className="rounded-full border border-stone-200 bg-white/85 px-4 py-2 text-xs font-black text-stone-600 shadow-sm">
              积分
            </button>
          </div>
        </header>

        <main className={`mx-auto grid min-h-0 w-full max-w-[1440px] flex-1 gap-3 p-3 transition-[grid-template-columns] duration-300 ${teacherLibraryOpen ? 'grid-cols-[292px_minmax(0,1fr)_292px]' : 'grid-cols-[292px_minmax(0,1fr)_52px]'}`}>
          <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200/80 p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-2xl bg-[#f0e9dd]">
                  <img src={meta.avatar} alt={meta.alias} className="h-full w-full object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-stone-950">任务树</p>
                  <p className="mt-0.5 truncate text-xs leading-5 text-stone-500">{teacherWorkflow.title}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              <div className="space-y-2">
                {TEACHER_BOARDS.map(board => (
                  <div key={board.id} className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white p-2">
                    <button
                      type="button"
                      onClick={() => switchTeacherBoard(board.id)}
                      className={`w-full rounded-xl px-2.5 py-2 text-left transition ${activeTeacherBoard === board.id ? 'bg-[#2f251d] text-white' : 'bg-[#f8f4ed] text-stone-800 hover:bg-[#f2eadf]'}`}
                    >
                      <span className="block text-[13px] font-semibold">{board.label}</span>
                      <span className={`mt-1 block whitespace-normal break-words text-[11px] leading-4 ${activeTeacherBoard === board.id ? 'text-white/70' : 'text-stone-500'}`}>{board.hint}</span>
                    </button>
                    <div className="mt-2 grid gap-1.5">
                      {WORKFLOWS_BY_BOARD[board.id].map(workflowId => {
                        const workflow = TEACHER_WORKFLOWS[workflowId];
                        const active = activeTeacherWorkflow === workflowId;
                        return (
                          <button
                            key={workflowId}
                            type="button"
                            onClick={() => {
                              setActiveTeacherBoard(board.id);
                              setActiveTeacherWorkflow(workflowId);
                            }}
                            className={`min-w-0 rounded-xl px-2.5 py-1.5 text-left text-xs transition ${active ? 'bg-[#f0e4d3] text-[#5c3d24]' : 'text-stone-600 hover:bg-[#faf7f2]'}`}
                          >
                            <span className="font-semibold">{workflow.label}</span>
                            <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-4 opacity-75">{workflow.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-2xl border border-[#eadfce] bg-white px-3 py-3 text-left shadow-sm transition hover:border-[#d8c5aa] hover:bg-[#fffdf8]"
              >
                <span className="block text-[13px] font-semibold text-stone-950">上传资料</span>
                <span className="mt-1 block text-xs leading-5 text-stone-500">作文、教案、讲义、说课稿、素材包都可以。</span>
              </button>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-black text-stone-500">待发送资料</p>
                  {pendingFiles.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-700">
                      <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                    </div>
                  ))}
                </div>
              )}

              <label className="block">
                <span className="mb-1.5 block text-xs font-black text-stone-700">公共背景（可选）</span>
                <textarea
                  value={workbench.background}
                  onChange={event => updateWorkbenchValue('background', event.target.value)}
                  placeholder="例如：初二小班、最近在训练细节描写、学生普遍结构松散。也可以留空。"
                  rows={4}
                  className="w-full rounded-xl border border-[#eadfce] bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">年级</span>
                  <select value={workbench.grade} onChange={event => updateWorkbenchValue('grade', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    <option value="三年级">三年级</option>
                    <option value="四年级">四年级</option>
                    <option value="五年级">五年级</option>
                    <option value="六年级">六年级</option>
                    <option value="初一">初一</option>
                    <option value="初二">初二</option>
                    <option value="初三">初三</option>
                    <option value="高一">高一</option>
                    <option value="高二">高二</option>
                    <option value="高三">高三</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-stone-700">水平</span>
                  <select value={workbench.studentLevel} onChange={event => updateWorkbenchValue('studentLevel', event.target.value)} className="h-9 w-full rounded-xl border border-[#eadfce] bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]">
                    <option value="">可不选</option>
                    <option value="基础薄弱">基础薄弱</option>
                    <option value="中等">中等</option>
                    <option value="较好">较好</option>
                    <option value="不确定">不确定</option>
                  </select>
                </label>
              </div>

              <div className="rounded-2xl border border-[#eadfce] bg-[#fbf6ee] px-3 py-2.5 text-xs leading-5 text-stone-600">
                <p className="font-semibold text-stone-800">使用方式</p>
                <p className="mt-1">左侧选任务，中间出成品和意见，右侧按需展开材料库。</p>
              </div>
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_14px_36px_rgba(80,64,42,0.06)]">
            <div className="border-b border-stone-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#8a5a35]">{TEACHER_BOARDS.find(item => item.id === teacherWorkflow.board)?.label} / {teacherWorkflow.label}</p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-950">{teacherWorkflow.title}</h2>
                  <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-500">{teacherWorkflow.intro}</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#f3eadc] px-2.5 py-1 text-[11px] font-semibold text-[#7a4c2c]">字段可空</span>
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto bg-[#fbf8f2] p-3">
              {creditBlocked && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-black">积分不足，暂时不能继续提问</p>
                  <button type="button" onClick={onOpenCredits} className="mt-2 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">去积分中心</button>
                </div>
              )}
              {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
              {messagesError && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
              {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
                <div className="flex h-full min-h-[420px] flex-col">
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#eadfce] bg-white/55 px-6 py-10">
                    <div className="max-w-md text-center">
                      <p className="text-[13px] font-semibold text-stone-500">工作区空白</p>
                      <p className="mt-2 text-xs leading-6 text-stone-400">在左侧选择任务，在右侧放入作文、教案、讲义、说课稿或素材。开始后，这里会显示鼎公生成的成品和修改意见。</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        {WANGDINGJUN_QUESTIONS.map(question => (
                          <button key={question} type="button" onClick={() => sendText(question)} className="rounded-full border border-[#eadfce] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-stone-500 transition hover:border-[#d8c5aa] hover:text-stone-700">
                            {question}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => sendText(teacherWorkflow.prompt)} disabled={sending} className="mt-4 rounded-full bg-[#2f251d] px-4 py-2 text-xs font-semibold text-white shadow-sm disabled:opacity-40">
                        {teacherWorkflow.button}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map(msg => {
                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 shadow-sm ${isUser ? 'rounded-br-sm bg-[#2f251d] text-white' : 'rounded-bl-sm border border-[#eadfce] bg-white text-stone-800'}`}>
                      <MessageText content={msg.content} dark={isUser} />
                      <AttachmentList attachments={msg.attachments} dark={isUser} />
                      {!isUser && (
                        <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                          <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white">
                            复制
                          </button>
                          <button onClick={() => downloadWordDocument(conversationTitle || teacherWorkflow.title || 'AI 回答', msg.content)} className="rounded-lg border border-[#eadfce] bg-[#fbf6ee] px-3 py-1.5 text-xs font-black text-[#7a4c2c] transition hover:bg-white">
                            下载 Word
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {streamingContent && (
                <div className="mb-4 flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-[#eadfce] bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800 shadow-sm">
                    <MessageText content={streamingContent} />
                    <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#8a5a35] align-middle" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-stone-200 bg-white p-2.5">
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-stone-300 bg-white text-lg text-stone-700 shadow-sm transition hover:border-[#8a5a35] hover:text-[#8a5a35] disabled:opacity-40" title="上传附件">
                  +
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={event => setInput(event.target.value)}
                  onKeyDown={event => event.key === 'Enter' && sendText(input)}
                  placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                  className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35] focus:ring-1 focus:ring-[#8a5a35]/20"
                />
                <button onClick={() => sendText(teacherWorkflow.prompt)} disabled={sending} className="shrink-0 rounded-xl bg-[#2f251d] px-4 py-2 text-[13px] font-semibold text-white shadow transition hover:bg-[#4a3728] disabled:opacity-40">
                  {teacherWorkflow.button}
                </button>
                <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                  →
                </button>
              </div>
            </div>
          </section>

          <aside className={`min-h-0 overflow-hidden rounded-[22px] border border-stone-200/80 bg-[#fffaf2]/86 shadow-[0_14px_36px_rgba(80,64,42,0.06)] transition-all ${teacherLibraryOpen ? 'opacity-100' : 'opacity-100'}`}>
            {teacherLibraryOpen ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex items-center justify-between border-b border-stone-200/80 p-3">
                  <div>
                    <p className="text-[13px] font-semibold text-stone-950">材料库</p>
                    <p className="text-xs text-stone-500">按业务场景随时收起</p>
                  </div>
                  <button type="button" onClick={() => setTeacherLibraryOpen(false)} className="rounded-full border border-[#eadfce] bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600">收起</button>
                </div>
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full rounded-2xl border border-dashed border-[#d8c5aa] bg-white px-3 py-3 text-left transition hover:bg-[#fffdf8]">
                    <span className="block text-[13px] font-semibold text-stone-950">添加材料</span>
                    <span className="mt-1 block text-xs leading-5 text-stone-500">作文、教案、讲义、说课稿、素材包</span>
                  </button>
                  <div className="rounded-2xl border border-[#eadfce] bg-white p-3">
                    <p className="text-xs font-semibold text-[#8a5a35]">本次材料</p>
                    <p className="mt-2 text-xs leading-5 text-stone-600">{workbench.material ? '已填写材料内容，发送后将作为核心依据。' : '还没有粘贴材料，可直接上传文件或在下方输入。'}</p>
                  </div>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{teacherWorkflow.materialLabel}</span>
                    <textarea
                      value={workbench.material}
                      onChange={event => updateWorkbenchValue('material', event.target.value)}
                      placeholder={teacherWorkflow.materialPlaceholder}
                      rows={5}
                      className="w-full resize-none rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                    />
                  </label>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{teacherWorkflow.directionLabel}</span>
                    <input value={workbench.goal} onChange={event => updateWorkbenchValue('goal', event.target.value)} placeholder={teacherWorkflow.directionPlaceholder} className="h-9 w-full rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <label className="block rounded-2xl border border-[#eadfce] bg-white p-3">
                    <span className="mb-2 block text-xs font-semibold text-stone-700">{teacherWorkflow.outputLabel}</span>
                    <input value={workbench.output} onChange={event => updateWorkbenchValue('output', event.target.value)} placeholder={teacherWorkflow.outputPlaceholder} className="h-9 w-full rounded-xl border border-[#eadfce] bg-[#fffdf8] px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  {pendingFiles.length > 0 && (
                    <div className="rounded-2xl border border-[#eadfce] bg-white p-4">
                      <p className="mb-2 text-xs font-black text-stone-700">待发送附件</p>
                      <div className="grid gap-2">
                        {pendingFiles.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-xl bg-[#fbf6ee] px-3 py-2 text-xs text-stone-700">
                            <span className="min-w-0 flex-1 truncate font-semibold">{file.name}</span>
                            <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setTeacherLibraryOpen(true)} className="flex h-full w-full items-center justify-center bg-[#fffaf2] text-xs font-black text-stone-600 [writing-mode:vertical-rl]">
                展开材料库
              </button>
            )}
          </aside>
        </main>
      </div>
    );
  }

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
            <h1 className="truncate text-base font-black text-emerald-950">{displayExpertName || meta.alias}</h1>
            <p className="truncate text-xs text-stone-500">{conversationTitle || meta.title}</p>
          </div>
        </div>
      </header>

      <div className={isWangdingjun ? 'flex-1 overflow-hidden px-4 py-5' : 'flex-1 overflow-y-auto px-4 py-5'}>
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

            <div className={`rounded-3xl border bg-white/85 p-4 shadow-sm ${isMindfulness ? 'border-indigo-100' : 'border-stone-200'}`}>
              <h2 className="text-base font-black text-stone-900">{isWangdingjun ? '公共资料区' : workbenchCopy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{isWangdingjun ? '这里放每次都会影响鼎公判断的背景。具体成品靠右侧工作流和下方问答补充。' : workbenchCopy.intro}</p>
              {isWangdingjun && (
                <div className="mt-3 grid gap-2 text-xs leading-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                    <p className="font-black">资料和成品优先</p>
                    <p>上传作文、素材、教案、讲义、说课稿或老师自己的资料即可开始。</p>
                    <p>答案生成后可直接下载 Word。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left text-stone-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                  >
                    <span className="block font-black">上传资料</span>
                    <span>支持 Word、PDF、TXT、Markdown。可让鼎公诊断不足并改稿。</span>
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {(isWangdingjun ? workbenchCopy.fields.filter(field => ['grade', 'region', 'textbook', 'studentLevel'].includes(field.key)) : workbenchCopy.fields).map(field => (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">{field.label}（可选）</span>
                    {field.options ? (
                      <select
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.rows === 1 ? (
                      <input
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    ) : (
                      <textarea
                        value={workbench[field.key]}
                        onChange={event => updateWorkbenchValue(field.key, event.target.value)}
                        placeholder={field.placeholder}
                        rows={field.rows || 3}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    )}
                  </label>
                ))}
                {!isWangdingjun && (
                  <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className={`w-full rounded-2xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-50 ${isMindfulness ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-emerald-900 hover:bg-emerald-800'}`}>
                    {workbenchCopy.button}
                  </button>
                )}
              </div>
            </div>
          </aside>

          <section className={isWangdingjun ? 'flex h-[calc(100vh-104px)] min-h-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/85 shadow-sm' : 'space-y-4'}>
            {isWangdingjun && (
              <div className="shrink-0 border-b border-stone-200 p-4">
                <div className="flex flex-wrap gap-2">
                  {TEACHER_BOARDS.map(board => (
                    <button
                      key={board.id}
                      type="button"
                      onClick={() => switchTeacherBoard(board.id)}
                      className={`rounded-xl border px-3 py-2 text-left transition ${activeTeacherBoard === board.id ? 'border-emerald-900 bg-emerald-900 text-white' : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-emerald-300'}`}
                    >
                      <span className="block text-sm font-black">{board.label}</span>
                      <span className={`block text-[11px] ${activeTeacherBoard === board.id ? 'text-white/70' : 'text-stone-500'}`}>{board.hint}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {WORKFLOWS_BY_BOARD[activeTeacherBoard].map(workflowId => {
                    const workflow = TEACHER_WORKFLOWS[workflowId];
                    return (
                      <button
                        key={workflowId}
                        type="button"
                        onClick={() => setActiveTeacherWorkflow(workflowId)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${activeTeacherWorkflow === workflowId ? 'border-stone-800 bg-stone-900 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-stone-400'}`}
                      >
                        <span className="font-black">{workflow.label}</span>
                        <span className={`mt-1 block text-xs leading-5 ${activeTeacherWorkflow === workflowId ? 'text-white/70' : 'text-stone-500'}`}>{workflow.title}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.materialLabel}</span>
                    <textarea
                      value={workbench.material}
                      onChange={event => updateWorkbenchValue('material', event.target.value)}
                      placeholder={teacherWorkflow.materialPlaceholder}
                      rows={4}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.directionLabel}</span>
                      <input
                        value={workbench.goal}
                        onChange={event => updateWorkbenchValue('goal', event.target.value)}
                        placeholder={teacherWorkflow.directionPlaceholder}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-black text-stone-700">{teacherWorkflow.outputLabel}</span>
                      <input
                        value={workbench.output}
                        onChange={event => updateWorkbenchValue('output', event.target.value)}
                        placeholder={teacherWorkflow.outputPlaceholder}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none placeholder:text-stone-400 focus:border-emerald-700"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
            <div className={isWangdingjun ? 'min-h-0 flex-1 space-y-4 overflow-y-auto p-4' : 'space-y-4'}>
            {messagesLoading && <div className="py-12 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
            {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
              <div className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-900">{isWangdingjun ? '先说要交付什么，或上传资料让鼎公诊改' : isMindfulness ? '可以先做一个很小的安顿' : '可以直接问，也可以先上传材料'}</h3>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {(isWangdingjun ? WANGDINGJUN_QUESTIONS : isMindfulness ? MINDFULNESS_QUESTIONS : QUICK_QUESTIONS).map(question => (
                    <button key={question} type="button" onClick={() => sendText(question)} className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-left text-sm font-semibold leading-5 text-stone-700 transition hover:border-emerald-700 hover:bg-white hover:text-emerald-800">
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`group relative max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? 'rounded-tr-sm bg-emerald-900 text-white' : 'rounded-tl-sm border border-stone-200 bg-white text-stone-800'}`}>
                    <MessageText content={msg.content} dark={isUser} />
                    <AttachmentList attachments={msg.attachments} dark={isUser} />
                    {!isUser && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                        <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-black text-stone-600 transition hover:bg-white" title="复制">
                          复制
                        </button>
                        <button onClick={() => downloadWordDocument(conversationTitle || teacherWorkflow.title || 'AI 回答', msg.content)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 transition hover:bg-white" title="下载 Word">
                          下载 Word
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[86%] rounded-3xl rounded-tl-sm border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-800 shadow-sm">
                  <MessageText content={streamingContent} />
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-700 align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
            </div>
            {isWangdingjun && (
              <div className="shrink-0 border-t border-stone-200 bg-[#fbfaf7] p-3">
                {pendingFiles.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {pendingFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700">
                        <span className="max-w-48 truncate font-semibold">{file.name}</span>
                        <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.doc,.docx" onChange={event => chooseFiles(event.target.files)} className="hidden" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-stone-300 bg-white text-xl text-stone-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-40" title="上传附件">
                    +
                  </button>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && sendText(input)}
                    placeholder={sending ? '等待 AI 回复中...' : '补充要求，也可以只发附件'}
                    className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
                  />
                  <button onClick={() => sendText(teacherWorkflow.prompt)} disabled={sending} className="shrink-0 rounded-xl bg-emerald-900 px-4 py-2.5 text-sm font-black text-white shadow transition hover:bg-emerald-800 disabled:opacity-40">
                    {teacherWorkflow.button}
                  </button>
                  <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-900 text-white shadow transition hover:bg-stone-800 disabled:opacity-40" title="发送补充">
                    →
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      {!isWangdingjun && (
      <div className="border-t border-emerald-900/10 bg-[#f7f2e8]/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto max-w-5xl">
          {creditBlocked && (
            <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-black">积分不足，暂时不能继续提问</p>
              <button type="button" onClick={onOpenCredits} className="mt-3 rounded-full bg-red-700 px-3 py-1.5 text-xs font-black text-white hover:bg-red-600">
                去积分中心
              </button>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {pendingFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex max-w-full items-center gap-2 rounded-2xl border border-stone-200 bg-white/85 px-3 py-2 text-xs text-stone-700 shadow-sm">
                  <span className="max-w-48 truncate font-semibold">{file.name}</span>
                  <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== index))} className="text-stone-400 hover:text-red-600" title="移除">x</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" multiple accept={isWangdingjun ? '.pdf,.txt,.md,.doc,.docx' : 'image/*,.pdf,.txt,.md,.doc,.docx'} onChange={event => chooseFiles(event.target.files)} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-300 bg-white/80 text-stone-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 disabled:opacity-40" title="上传附件">
              +
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && sendText(input)}
              placeholder={sending ? '等待 AI 回复中...' : '输入问题，也可以只发附件'}
              className="flex-1 rounded-2xl border border-stone-300 bg-white/80 px-4 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700/20"
            />
            <button onClick={() => sendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-white shadow transition hover:bg-emerald-800 disabled:opacity-40" title="发送">
              →
            </button>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
