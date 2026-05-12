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
  '请先按作文批改模板帮我看这篇作文。',
  '请把这份材料整理成课堂讲评提纲。',
  '请生成学生下一步修改任务。',
];

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
  goal: '提升表达',
  material: '',
  output: '作文批改 + 修改建议',
  grade: '',
  region: '',
  textbook: '',
  materialType: '',
  studentLevel: '不确定',
};

function getInitialWorkbench(expertId: string) {
  if (expertId === 'wangdingjun') return { ...WANGDINGJUN_WORKBENCH };
  return expertId === 'thich-nhat-hanh' ? { ...MINDFULNESS_WORKBENCH } : { ...DEFAULT_WORKBENCH };
}

function getWorkbenchCopy(expertId: string): WorkbenchCopy {
  if (expertId === 'wangdingjun') {
    return {
      title: '作文批改与写作教学工作台',
      intro: '请先粘贴作文正文，或上传 Word、PDF、文本等可读取资料。王鼎钧只处理作文批改、写作教学、表达训练、作文讲评和日常写作作业反馈。',
      button: '开始批改',
      prompt: '请根据作文批改与写作教学工作台信息，完成本次作文批改或写作教学反馈。',
      outputFallback: '作文批改 + 修改建议',
      fields: [
        { key: 'grade', label: '年级', placeholder: '请选择年级', rows: 1, options: ['小学高年级', '初中', '高中'] },
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

  const buildUserMessage = (text: string) => {
    if (isWangdingjun) {
      return [
        text.trim(),
        '',
        '【作文批改与写作教学工作台】',
        `年级：${workbench.grade || '未填写'}`,
        `地区：${workbench.region || '未填写'}`,
        `教材版本：${workbench.textbook || '未填写'}`,
        `材料类型：${workbench.materialType || '未填写'}`,
        `批改目标：${workbench.goal || '未填写'}`,
        `学生水平：${workbench.studentLevel || '未填写'}`,
        `期望产出：${workbench.output || workbenchCopy.outputFallback}`,
        '',
        '【材料内容】',
        workbench.material || '未填写',
        '',
        '【边界要求】',
        '王鼎钧只负责作文批改、写作教学、表达训练、作文讲评、日常写作作业反馈；不要定位为语文全科专家，不要冒充各省官方阅卷标准。',
        '',
        '【输出模板】',
        '1. 总体判断',
        '2. 学生优点',
        '3. 主要问题',
        '4. 逐项修改建议',
        '5. 可直接给学生看的评语',
        '6. 老师讲评要点',
        '7. 学生下一步修改任务',
        '8. 如选择家长反馈，追加家长可读版本',
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
    if (isWangdingjun && (!workbench.grade || !workbench.region || !workbench.textbook || !workbench.materialType)) {
      showToast('年级、地区、教材版本、材料类型会影响批改口径，建议补充后再批改。', 'info');
    }

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

            <div className={`rounded-3xl border bg-white/85 p-4 shadow-sm ${isMindfulness ? 'border-indigo-100' : 'border-stone-200'}`}>
              <h2 className="text-base font-black text-stone-900">{workbenchCopy.title}</h2>
              <p className="mt-1 text-xs leading-5 text-stone-500">{workbenchCopy.intro}</p>
              {isWangdingjun && (
                <div className="mt-3 grid gap-2 text-xs leading-5">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-900">
                    <p className="font-black">当前可用</p>
                    <p>粘贴作文正文；上传 Word、PDF、文本资料；生成批改建议、讲评提纲、学生修改任务。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('图片扫描批改将在 2.0 向 SVIP 用户开放。当前可先粘贴文字或上传可读取文档。', 'info')}
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-amber-900 transition hover:border-amber-300 hover:bg-amber-100"
                  >
                    <span className="block font-black">SVIP 2.0</span>
                    <span>图片扫描批改、手写作文识别、试卷照片识别内测中</span>
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-3">
                {workbenchCopy.fields.map(field => (
                  <label key={field.key} className="block">
                    <span className="mb-1.5 block text-xs font-black text-stone-700">{field.label}</span>
                    {field.options ? (
                      <select
                        value={workbench[field.key]}
                        onChange={event => setWorkbenchState(prev => ({ expertId: activeExpertId, values: { ...(prev.expertId === activeExpertId ? prev.values : getInitialWorkbench(activeExpertId)), [field.key]: event.target.value } }))}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : field.rows === 1 ? (
                      <input
                        value={workbench[field.key]}
                        onChange={event => setWorkbenchState(prev => ({ expertId: activeExpertId, values: { ...(prev.expertId === activeExpertId ? prev.values : getInitialWorkbench(activeExpertId)), [field.key]: event.target.value } }))}
                        placeholder={field.placeholder}
                        className={`h-9 w-full rounded-xl border bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    ) : (
                      <textarea
                        value={workbench[field.key]}
                        onChange={event => setWorkbenchState(prev => ({ expertId: activeExpertId, values: { ...(prev.expertId === activeExpertId ? prev.values : getInitialWorkbench(activeExpertId)), [field.key]: event.target.value } }))}
                        placeholder={field.placeholder}
                        rows={field.rows || 3}
                        className={`w-full rounded-xl border bg-white px-3 py-2 text-xs text-stone-800 outline-none placeholder:text-stone-400 ${isMindfulness ? 'border-indigo-100 focus:border-indigo-500' : 'border-stone-200 focus:border-emerald-700'}`}
                      />
                    )}
                  </label>
                ))}
                <button onClick={() => sendText(workbenchCopy.prompt)} disabled={sending} className={`w-full rounded-2xl px-4 py-3 text-sm font-black text-white shadow-sm transition disabled:opacity-50 ${isMindfulness ? 'bg-indigo-700 hover:bg-indigo-600' : 'bg-emerald-900 hover:bg-emerald-800'}`}>
                  {workbenchCopy.button}
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            {messagesLoading && <div className="py-12 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
            {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
              <div className="rounded-3xl border border-stone-200 bg-white/85 p-5 shadow-sm">
                <h3 className="text-lg font-black text-stone-900">{isWangdingjun ? '先粘贴作文，或上传可读取资料' : isMindfulness ? '可以先做一个很小的安顿' : '可以直接问，也可以先上传材料'}</h3>
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
                      <button onClick={() => { navigator.clipboard.writeText(msg.content); showToast('已复制', 'info'); }} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-stone-200 bg-white text-xs opacity-0 shadow-sm transition hover:bg-stone-50 group-hover:opacity-100" title="复制">
                        ⧉
                      </button>
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
          </section>
        </div>
      </div>

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
    </div>
  );
}
