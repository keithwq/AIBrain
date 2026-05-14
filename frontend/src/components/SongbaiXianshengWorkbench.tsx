import { useMemo, useState } from 'react';
import { SONGBAI_XIANSHENG_TASKS, DAILY_DISCOVERY_ITEMS, CLASSIC_FORMULAS, type SongbaiXianshengTask, type SongbaiXianshengTaskId, type DailyDiscoveryType } from '../data/songbaiXianshengTasks';
import type { Attachment } from '../services/api';
import { FormulaCard } from './jinlun/FormulaCard';
import { FlashQuiz } from './jinlun/FlashQuiz';
import { CourseView } from './jinlun/CourseView';
import { WeeklyMenuView } from './jinlun/WeeklyMenuView';

export interface SongbaiXianshengValues {
  ageStage: string;
  constitutionFocus: string;
  dietaryPreference: string;
  familyLimit: string;
  material: string;
  goal: string;
  output: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
}

interface Props {
  messages: Message[];
  messagesLoading: boolean;
  messagesError: boolean;
  sending: boolean;
  streamingContent: string;
  creditBlocked: boolean;
  input: string;
  values: SongbaiXianshengValues;
  activeTaskId: SongbaiXianshengTaskId;
  task: SongbaiXianshengTask;
  pendingFiles: File[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  conversationTitle: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
  onInputChange: (value: string) => void;
  onValueChange: (key: keyof SongbaiXianshengValues, value: string) => void;
  onTaskChange: (taskId: SongbaiXianshengTaskId) => void;
  onChooseFiles: (files: FileList | null) => void;
  onRemovePendingFile: (index: number) => void;
  onSendText: (text: string) => void;
  onCopy: (content: string) => void;
  onDownloadWord: (title: string, content: string) => void;
  renderMessageText: (content: string, dark?: boolean) => React.ReactNode;
  renderAttachments: (attachments?: Attachment[], dark?: boolean) => React.ReactNode;
}

type ImagingToolId = 'tongue' | 'fingerprint' | 'face';

const IMAGING_TOOLS: Array<{
  id: ImagingToolId;
  label: string;
  title: string;
  instruction: string;
  prompt: string;
}> = [
  {
    id: 'tongue',
    label: '舌头拍摄辨识',
    title: '舌头拍摄辨识',
    instruction: '上传清晰舌象照片，补充拍摄时间、饮食、睡眠和主要不适。',
    prompt: '请根据我上传的舌象照片做中医养生观察。只能做舌象特征描述和体质倾向提示，不能诊断疾病，不能单凭舌象下结论，不能开方、给药或替代就医。请结合我补充的日常状态，输出：照片可观察信息、可能相关的体质倾向、还需要补充的问题、日常观察建议、必须就医的信号。',
  },
  {
    id: 'fingerprint',
    label: '指纹拍摄辨识',
    title: '指纹拍摄辨识',
    instruction: '上传手指或掌纹照片，补充年龄段、手部状态和主要想了解的问题。',
    prompt: '请根据我上传的指纹或掌纹照片做谨慎的中医养生观察。只能做可见特征整理和生活方式提示，不能把指纹、掌纹当作诊断依据，不能承诺预测疾病，不能开方、给药或替代就医。请输出：照片可观察信息、信息可信度限制、可结合体质问卷继续确认的方向、日常观察建议、必须就医的信号。',
  },
  {
    id: 'face',
    label: '面容拍摄辨识',
    title: '面容拍摄辨识',
    instruction: '上传正面自然光照片，补充作息、饮食、精神状态和近期变化。',
    prompt: '请根据我上传的面容照片做中医养生观察。只能描述可见状态和体质倾向线索，不能做疾病诊断，不能凭面色断病，不能开方、给药或替代就医。请输出：照片可观察信息、可能相关的体质倾向、需要进一步询问的问题、日常调养观察建议、必须就医的信号。',
  },
];

export function SongbaiXianshengWorkbench({
  messages,
  messagesLoading,
  messagesError,
  sending,
  streamingContent,
  creditBlocked,
  input,
  values,
  activeTaskId,
  task,
  pendingFiles,
  bottomRef,
  inputRef,
  fileInputRef,
  conversationTitle,
  onBack,
  onOpenCredits,
  onOpenHome,
  onInputChange,
  onValueChange,
  onTaskChange,
  onChooseFiles,
  onRemovePendingFile,
  onSendText,
  onCopy,
  onDownloadWord,
  renderMessageText,
  renderAttachments,
}: Props) {
  const [formulaInput, setFormulaInput] = useState('');
  const [expandedDiscovery, setExpandedDiscovery] = useState<DailyDiscoveryType | null>(null);
  const [showConstitutionPrompt, setShowConstitutionPrompt] = useState(true);
  const [constitutionPromptSeen, setConstitutionPromptSeen] = useState(false);
  const [constitutionStarted, setConstitutionStarted] = useState(false);
  const [constitutionRecords, setConstitutionRecords] = useState<Array<{ id: string; createdAt: string; summary: string }>>([]);
  const [activeImagingTool, setActiveImagingTool] = useState<ImagingToolId | null>(null);
  const [weeklyMenuStarted, setWeeklyMenuStarted] = useState(false);
  const [workspacePrompts, setWorkspacePrompts] = useState<Set<string>>(() => new Set());

  const visibleTasks = useMemo(() => SONGBAI_XIANSHENG_TASKS.filter(item => item.id !== 'consultation'), []);
  const constitutionTask = SONGBAI_XIANSHENG_TASKS.find(item => item.id === 'constitution') || task;
  const constitutionQuestions = [
    { key: 'ageStage' as const, label: '基本情况', placeholder: '年龄段、性别、作息情况' },
    { key: 'constitutionFocus' as const, label: '主要感受', placeholder: '怕冷怕热、出汗、睡眠、精神、口渴等' },
    { key: 'dietaryPreference' as const, label: '饮食与排便', placeholder: '胃口、口味偏好、大便、小便、忌口' },
    { key: 'familyLimit' as const, label: '既往情况', placeholder: '已知疾病、正在用药、过敏史或特殊情况' },
    { key: 'material' as const, label: '补充观察', placeholder: '舌象、面色、情绪、运动、季节变化等' },
  ];

  const handleDailyDiscovery = (type: DailyDiscoveryType) => {
    setExpandedDiscovery(type);
    const item = DAILY_DISCOVERY_ITEMS.find(i => i.id === type);
    if (item) sendWorkspaceText(item.prompt);
  };

  const handleFormulaRandom = () => {
    const name = CLASSIC_FORMULAS[Math.floor(Math.random() * CLASSIC_FORMULAS.length)];
    sendWorkspaceText(`${task.prompt}\n\n方剂名称：${name}`);
  };

  const handleFormulaSubmit = (name: string) => {
    if (!name.trim()) return;
    sendWorkspaceText(`${task.prompt}\n\n方剂名称：${name.trim()}`);
    setFormulaInput('');
  };

  const postponeQuestionnaire = () => {
    setShowConstitutionPrompt(false);
    setConstitutionPromptSeen(true);
  };

  const startQuestionnaire = () => {
    setShowConstitutionPrompt(false);
    setConstitutionPromptSeen(true);
    setConstitutionStarted(true);
    onTaskChange('constitution');
  };

  const handleTaskClick = (taskId: SongbaiXianshengTaskId) => {
    onTaskChange(taskId);
    setActiveImagingTool(null);
    if (taskId === 'constitution') {
      setConstitutionStarted(true);
      setShowConstitutionPrompt(false);
      setConstitutionPromptSeen(true);
    }
  };

  const openImagingTool = (toolId: ImagingToolId) => {
    onTaskChange('constitution');
    setActiveImagingTool(toolId);
    setConstitutionStarted(false);
    setShowConstitutionPrompt(false);
    setConstitutionPromptSeen(true);
  };

  const submitConstitution = () => {
    const payload = constitutionQuestions.map(question => `${question.label}：${values[question.key] || '未填写'}`).join('\n');
    const summary = values.constitutionFocus || values.ageStage || '体质辨识记录';
    setConstitutionRecords(prev => [
      {
        id: `${Date.now()}`,
        createdAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        summary,
      },
      ...prev,
    ]);
    setConstitutionStarted(false);
    sendWorkspaceText(`${constitutionTask.prompt}\n\n${payload}`);
  };

  const submitWeeklyMenu = () => {
    setWeeklyMenuStarted(true);
    sendWorkspaceText(`${task.prompt}\n\n家庭情况：${values.ageStage}\n饮食偏好：${values.dietaryPreference}`);
  };

  const sendWorkspaceText = (text: string) => {
    setWorkspacePrompts(prev => new Set(prev).add(text.trim()));
    onSendText(text);
  };

  const workspaceMessageIds = useMemo(() => {
    const ids = new Set<string>();
    let nextAssistantBelongsToWorkspace = false;
    for (const message of messages) {
      if (message.role === 'user') {
        nextAssistantBelongsToWorkspace = workspacePrompts.has(message.content.trim());
        if (nextAssistantBelongsToWorkspace) ids.add(message.id);
        continue;
      }
      if (message.role === 'assistant' && nextAssistantBelongsToWorkspace) {
        ids.add(message.id);
        nextAssistantBelongsToWorkspace = false;
      }
    }
    return ids;
  }, [messages, workspacePrompts]);
  const workspaceMessages = messages.filter(message => workspaceMessageIds.has(message.id));
  const latestAiContent = streamingContent || workspaceMessages.filter(m => m.role === 'assistant').pop()?.content || '';
  const isStreaming = !!streamingContent || sending;
  const showAiInChat = task.mode === 'core' || task.mode === 'profile';
  const chatMessages = (showAiInChat ? messages : messages.filter(m => m.role === 'user')).filter(message => !workspaceMessageIds.has(message.id));
  const lastUserMessage = [...messages].reverse().find(message => message.role === 'user');
  const workspaceStreaming = !!lastUserMessage && workspacePrompts.has(lastUserMessage.content.trim());
  const shouldShowConstitutionPrompt = showConstitutionPrompt && !constitutionPromptSeen && activeTaskId !== 'constitution' && constitutionRecords.length === 0;
  const imagingTool = IMAGING_TOOLS.find(item => item.id === activeImagingTool);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-stone-950">
      <header className="shrink-0 border-b border-black/10 bg-white/95 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-3">
          <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-md border border-black/10 bg-white text-stone-600 transition hover:bg-[#faf8f4]" title="返回" aria-label="返回">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={onOpenHome} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#faf8f4]">首页</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-stone-950">松柏先生养生工作台</h1>
            <p className="truncate text-xs text-stone-500">中医咨询 · 药食同源 · 每日养生</p>
          </div>
          <button onClick={onOpenCredits} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-600">积分</button>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-[200px_minmax(0,1.5fr)_380px] gap-3 p-3">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {visibleTasks.map(item => {
              const active = item.id === activeTaskId;
              return (
                <div key={item.id} className={item.id === 'classic-formula' ? 'border-t border-stone-200/80 pt-2' : undefined}>
                  <button
                    type="button"
                    onClick={() => handleTaskClick(item.id)}
                    className={`w-full rounded border px-3 py-2 text-left transition ${active ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-transparent text-stone-800 hover:border-black/10 hover:bg-[#faf8f4]'}`}
                  >
                    <span className="block text-[13px] font-semibold leading-5">{item.label}</span>
                    <span className={`mt-0.5 block text-[11px] leading-4 ${active ? 'text-white/70' : 'text-stone-500'}`}>{item.hint}</span>
                  </button>
                  {item.id === 'constitution' && (
                    <div className="mt-2 border-t border-stone-200/80 pt-2">
                      <p className="px-3 py-1 text-[11px] font-semibold text-stone-400">试验区</p>
                      {IMAGING_TOOLS.map(tool => (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => openImagingTool(tool.id)}
                          className={`mt-1 w-full rounded border px-3 py-2 text-left text-[12px] transition ${activeImagingTool === tool.id ? 'border-[#2f251d] bg-white text-stone-800' : 'border-transparent text-stone-400 hover:border-black/10 hover:bg-[#faf8f4]'}`}
                        >
                          {tool.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-y-auto rounded-md border border-black/10 bg-white p-4">
          {task.mode === 'core' && (
            <div className="flex h-full items-center justify-center text-center">
              <div className="max-w-sm">
                <p className="text-sm font-semibold text-stone-700">松柏先生</p>
                <p className="mt-2 text-xs leading-6 text-stone-500">{task.intro}</p>
              </div>
            </div>
          )}

          {task.mode === 'grid' && (
            <div className="flex h-full items-center justify-center p-4">
              <div className="grid w-full max-w-md grid-cols-2 gap-3" style={{ maxHeight: '360px' }}>
                {DAILY_DISCOVERY_ITEMS.map(item => {
                  const isExpanded = expandedDiscovery === item.id;
                  const lastAiMsg = isExpanded ? messages.filter(m => m.role === 'assistant').pop() : null;
                  const content = isExpanded ? (streamingContent || lastAiMsg?.content || '') : '';
                  const isLoading = isExpanded && sending && !content;
                  return (
                    <div key={item.id} className={`relative flex flex-col overflow-hidden rounded-md border transition-all duration-300 ${isExpanded ? 'col-span-2 border-[#2f251d]/30 bg-white' : 'border-black/10 bg-[var(--bg)] hover:border-[#2f251d]/40 hover:bg-[#faf8f4] cursor-pointer'}`}>
                      <button type="button" onClick={() => handleDailyDiscovery(item.id)} disabled={sending} className="shrink-0 px-4 py-4 text-center disabled:opacity-40">
                        <span className="block text-sm font-semibold text-stone-950">{item.label}</span>
                        {!isExpanded && <span className="mt-1 block text-[11px] text-stone-500">{item.desc}</span>}
                        {isExpanded && !isLoading && <span className="mt-1 block text-[11px] text-[#8a5a35]">点击换一个</span>}
                      </button>
                      {isExpanded && (
                        <div className="min-h-0 flex-1 overflow-y-auto border-t border-black/8 px-3 py-2 text-xs leading-5 text-stone-700" style={{ maxHeight: '200px' }}>
                          {isLoading && <p className="text-stone-400 animate-pulse">生成中...</p>}
                          {content && renderMessageText(content)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {task.mode === 'formula' && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 space-y-2 border-b border-black/8 p-3">
                <div className="flex gap-2">
                  <button onClick={handleFormulaRandom} disabled={sending} className="rounded-md bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">随机一方</button>
                  <select onChange={e => { if (e.target.value) handleFormulaSubmit(e.target.value); e.target.value = ''; }} className="h-8 flex-1 rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]" defaultValue="">
                    <option value="" disabled>选择经方...</option>
                    {CLASSIC_FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" value={formulaInput} onChange={e => setFormulaInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleFormulaSubmit(formulaInput)} placeholder={task.placeholder} className="h-8 flex-1 rounded-md border border-black/10 bg-white px-2 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  <button onClick={() => handleFormulaSubmit(formulaInput)} disabled={!formulaInput.trim() || sending} className="rounded-md bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">解读</button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <FormulaCard content={latestAiContent} streaming={isStreaming} renderMessageText={content => renderMessageText(content)} />
              </div>
            </div>
          )}

          {task.mode === 'course' && <div className="min-h-0 flex-1"><CourseView /></div>}
          {task.mode === 'quiz' && <div className="min-h-0 flex-1"><FlashQuiz /></div>}

          {task.mode === 'menu' && (
            <div className="flex h-full flex-col">
              {!weeklyMenuStarted && (
                <div className="space-y-3 p-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">家庭情况</span>
                    <input value={values.ageStage} onChange={e => onValueChange('ageStage', e.target.value)} placeholder="几口人、年龄段、特殊情况" className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">饮食偏好与限制</span>
                    <input value={values.dietaryPreference} onChange={e => onValueChange('dietaryPreference', e.target.value)} placeholder="少糖、不吃辣、老人牙口一般..." className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <button onClick={submitWeeklyMenu} disabled={sending} className="w-full rounded-md bg-[#2f251d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">{task.button}</button>
                </div>
              )}
              {weeklyMenuStarted && <div className="min-h-0 flex-1"><WeeklyMenuView content={latestAiContent} streaming={isStreaming} renderMessageText={content => renderMessageText(content)} /></div>}
            </div>
          )}

          {task.mode === 'profile' && activeImagingTool && imagingTool && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-black/8 pb-3">
                <p className="text-sm font-semibold text-stone-800">{imagingTool.title}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">该能力正在准备中，正式开放后会支持拍摄、上传和辨识记录。</p>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                <div className="w-full max-w-md rounded-md border border-black/10 bg-[#faf8f4] p-5 text-center">
                  <p className="text-[11px] font-semibold text-[#8a5a35]">即将上线</p>
                  <h2 className="mt-2 text-lg font-semibold text-stone-950">{imagingTool.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    这项功能需要更稳定的图片格式处理和安全边界提示。当前先保留入口，正式开放后可在这里完成拍摄、上传、辨识和历史记录更新。
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveImagingTool(null)}
                    className="mt-5 rounded-md border border-black/10 bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#fffdf8]"
                  >
                    返回体质辨识
                  </button>
                </div>
              </div>
            </div>
          )}

          {task.mode === 'profile' && !activeImagingTool && (
            <div className="flex h-full flex-col">
              <div className="shrink-0 border-b border-black/8 pb-3">
                <p className="text-sm font-semibold text-stone-800">体质辨识</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">通过问卷整理日常状态，不做诊断，不替代就医。</p>
              </div>
              {constitutionRecords.length > 0 && !constitutionStarted && (
                <div className="min-h-0 flex-1 overflow-y-auto py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold text-stone-600">更新记录</p>
                    <button type="button" onClick={() => setConstitutionStarted(true)} className="rounded-md bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728]">新增记录</button>
                  </div>
                  <div className="space-y-2">
                    {constitutionRecords.map(record => (
                      <div key={record.id} className="rounded-md border border-black/10 bg-[#faf8f4] px-3 py-2">
                        <p className="text-xs font-semibold text-stone-800">{record.createdAt}</p>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{record.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(constitutionStarted || constitutionRecords.length === 0) && (
                <div className="min-h-0 flex-1 overflow-y-auto py-4">
                  <div className="grid gap-3">
                    {constitutionQuestions.map(question => (
                      <label key={question.key} className="block">
                        <span className="mb-1.5 block text-xs font-semibold text-stone-700">{question.label}</span>
                        <textarea value={values[question.key]} onChange={e => onValueChange(question.key, e.target.value)} placeholder={question.placeholder} rows={2} className="w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                      </label>
                    ))}
                    <button type="button" onClick={submitConstitution} disabled={sending} className="rounded-md bg-[#2f251d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">保存并生成辨识建议</button>
                  </div>
                </div>
              )}
              {constitutionRecords.length > 0 && constitutionStarted && (
                <button type="button" onClick={() => setConstitutionStarted(false)} className="shrink-0 border-t border-black/8 pt-3 text-xs font-semibold text-stone-500 hover:text-stone-800">返回记录</button>
              )}
            </div>
          )}
        </div>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--bg)] p-3">
            {creditBlocked && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">积分不足</p>
                <button type="button" onClick={onOpenCredits} className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">去积分中心</button>
              </div>
            )}
            {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}
            {!messagesLoading && !messagesError && chatMessages.length === 0 && !sending && (
              <div className="flex h-full items-center justify-center">
                <p className="text-xs text-stone-400">对话内容会显示在这里</p>
              </div>
            )}
            {chatMessages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-md px-3.5 py-2.5 text-[13px] leading-6 ${isUser ? 'rounded-br-sm bg-[#2f251d] text-white' : 'rounded-bl-sm border border-black/10 bg-white text-stone-800'}`}>
                    {renderMessageText(msg.content, isUser)}
                    {renderAttachments(msg.attachments, isUser)}
                    {!isUser && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                        <button onClick={() => onCopy(msg.content)} className="rounded-md border border-black/10 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white">复制</button>
                        <button onClick={() => onDownloadWord(conversationTitle || task.title, msg.content)} className="rounded-md border border-black/10 bg-[#f3eadc] px-3 py-1.5 text-xs font-semibold text-[#7a4c2c] transition hover:bg-white">下载 Word</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {showAiInChat && streamingContent && !workspaceStreaming && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[88%] rounded-md rounded-bl-sm border border-black/10 bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800">
                  {renderMessageText(streamingContent)}
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#2f251d] align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-black/8 bg-white p-2.5">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx" onChange={e => onChooseFiles(e.target.files)} className="hidden" />
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-black/10 bg-[var(--bg)] px-2.5 py-1.5 text-xs text-stone-700">
                    <span className="max-w-48 truncate font-semibold">{file.name}</span>
                    <button type="button" onClick={() => onRemovePendingFile(index)} className="text-stone-400 hover:text-red-600">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-stretch gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-[76px] w-10 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-lg text-stone-700 transition hover:border-[#2f251d]/40 disabled:opacity-40" title="上传附件">+</button>
              <textarea
                ref={inputRef as unknown as React.RefObject<HTMLTextAreaElement | null>}
                value={input}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onSendText(input);
                  }
                }}
                placeholder="输入任何中医相关的事，松柏先生随时与您沟通。"
                rows={3}
                className="h-[76px] min-w-0 flex-1 resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] leading-5 text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
              />
              <button onClick={() => onSendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-[76px] w-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-40" title="发送">→</button>
            </div>
          </div>
        </section>
      </main>

      {shouldShowConstitutionPrompt && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-stone-950/28 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-md border border-black/10 bg-white p-5">
            <p className="text-[11px] font-semibold text-[#8a5a35]">首次进入</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">先完成一次体质辨识</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              体质辨识是问卷整理，不是诊断。完成后会形成更新记录，后续也可以随时新增。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={postponeQuestionnaire} className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-[#faf8f4]">稍后再说</button>
              <button type="button" onClick={startQuestionnaire} className="rounded-md bg-[#2f251d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a3728]">开始辨识</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
