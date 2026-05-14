import { useState } from 'react';
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

  const handleDailyDiscovery = (type: DailyDiscoveryType) => {
    setExpandedDiscovery(type);
    const item = DAILY_DISCOVERY_ITEMS.find(i => i.id === type);
    if (item) onSendText(item.prompt);
  };

  const handleFormulaRandom = () => {
    const name = CLASSIC_FORMULAS[Math.floor(Math.random() * CLASSIC_FORMULAS.length)];
    onSendText(`${task.prompt}\n\n方剂名称：${name}`);
  };

  const handleFormulaSubmit = (name: string) => {
    if (!name.trim()) return;
    onSendText(`${task.prompt}\n\n方剂名称：${name.trim()}`);
    setFormulaInput('');
  };

  const hasMessages = messages.length > 0 || sending || streamingContent;
  const latestAiContent = streamingContent || messages.filter(m => m.role === 'assistant').pop()?.content || '';
  const isStreaming = !!streamingContent || sending;

  // For non-core modes that render AI output in the middle column,
  // hide AI messages from the right chat to avoid duplication
  const showAiInChat = task.mode === 'core' || task.mode === 'profile';
  const chatMessages = showAiInChat ? messages : messages.filter(m => m.role === 'user');
  const postponeQuestionnaire = () => {};
  const startQuestionnaire = () => {};

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--bg)] text-stone-950">
      <header className="shrink-0 border-b border-black/10 bg-white/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3">
          <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-md border border-black/10 bg-white text-base text-stone-600 transition hover:bg-[#faf8f4]" title="返回">←</button>
          <button onClick={onOpenHome} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#faf8f4]">首页</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-stone-950">松柏先生养生工作台</h1>
            <p className="truncate text-xs text-stone-500">中医咨询 · 药食同源 · 每日养生</p>
          </div>
          <button onClick={onOpenCredits} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-600">积分</button>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-[200px_minmax(0,1.5fr)_360px] gap-3 p-3">
        {/* 左栏：任务栏 */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {SONGBAI_XIANSHENG_TASKS.map(item => {
              const active = item.id === activeTaskId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTaskChange(item.id)}
                  className={`w-full rounded border px-3 py-2 text-left transition ${active ? 'border-[#2f251d] bg-[#2f251d] text-white' : 'border-transparent text-stone-800 hover:border-black/10 hover:bg-[#faf8f4]'}`}
                >
                  <span className="block text-[13px] font-semibold leading-5">{item.label}</span>
                  <span className={`mt-0.5 block text-[11px] leading-4 ${active ? 'text-white/70' : 'text-stone-500'}`}>{item.hint}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 中栏：与任务联动的内容区 */}
        <div className="flex min-h-0 flex-col overflow-y-auto rounded-md border border-black/10 bg-white p-4">
          {task.mode === 'core' && (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm font-semibold text-stone-700">{task.title}</p>
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
                    <div
                      key={item.id}
                      className={`relative flex flex-col overflow-hidden rounded-md border transition-all duration-300 ${isExpanded ? 'col-span-2 border-[#2f251d]/30 bg-white' : 'border-black/10 bg-[var(--bg)] hover:border-[#2f251d]/40 hover:bg-[#faf8f4] cursor-pointer'}`}
                    >
                      <button
                        type="button"
                        onClick={() => handleDailyDiscovery(item.id)}
                        disabled={sending}
                        className="shrink-0 px-4 py-4 text-center disabled:opacity-40"
                      >
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
                  <button onClick={handleFormulaRandom} disabled={sending} className="rounded-md bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">
                    随机一方
                  </button>
                  <select
                    onChange={e => { if (e.target.value) handleFormulaSubmit(e.target.value); e.target.value = ''; }}
                    className="h-8 flex-1 rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-[#8a5a35]"
                    defaultValue=""
                  >
                    <option value="" disabled>选择经方...</option>
                    {CLASSIC_FORMULAS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formulaInput}
                    onChange={e => setFormulaInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFormulaSubmit(formulaInput)}
                    placeholder={task.placeholder}
                    className="h-8 flex-1 rounded-md border border-black/10 bg-white px-2 text-xs text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]"
                  />
                  <button onClick={() => handleFormulaSubmit(formulaInput)} disabled={!formulaInput.trim() || sending} className="rounded-md bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">
                    解读
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <FormulaCard content={latestAiContent} streaming={isStreaming} />
              </div>
            </div>
          )}

          {task.mode === 'course' && (
            <div className="min-h-0 flex-1">
              <CourseView />
            </div>
          )}

          {task.mode === 'quiz' && (
            <div className="min-h-0 flex-1">
              <FlashQuiz />
            </div>
          )}

          {task.mode === 'menu' && (
            <div className="flex h-full flex-col">
              {!hasMessages && (
                <div className="space-y-3 p-4">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">家庭情况</span>
                    <input value={values.ageStage} onChange={e => onValueChange('ageStage', e.target.value)} placeholder="几口人、年龄段、特殊情况" className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">饮食偏好与限制</span>
                    <input value={values.dietaryPreference} onChange={e => onValueChange('dietaryPreference', e.target.value)} placeholder="少糖、不吃辣、老人牙口一般..." className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                  </label>
                  <button onClick={() => onSendText(`${task.prompt}\n\n家庭情况：${values.ageStage}\n饮食偏好：${values.dietaryPreference}`)} disabled={sending} className="w-full rounded-md bg-[#2f251d] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40">{task.button}</button>
                </div>
              )}
              {hasMessages && (
                <div className="min-h-0 flex-1">
                  <WeeklyMenuView content={latestAiContent} streaming={isStreaming} />
                </div>
              )}
            </div>
          )}

          {task.mode === 'profile' && (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <p className="text-sm font-semibold text-stone-700">{task.title}</p>
                <p className="mt-2 text-xs leading-6 text-stone-500">{task.intro}</p>
                <p className="mt-3 text-xs leading-6 text-stone-400">在右侧直接描述日常状态即可。</p>
              </div>
            </div>
          )}
        </div>

        {/* 右栏：对话区 */}
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

            {/* 消息列表 */}
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

            {showAiInChat && streamingContent && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[88%] rounded-md rounded-bl-sm border border-black/10 bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800">
                  {renderMessageText(streamingContent)}
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#2f251d] align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入栏：始终显示 */}
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
              <div className="flex gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-lg text-stone-700 transition hover:border-[#2f251d]/40 disabled:opacity-40" title="上传附件">+</button>
                <input ref={inputRef} type="text" value={input} onChange={e => onInputChange(e.target.value)} onKeyDown={e => e.key === 'Enter' && onSendText(input)} placeholder={task.placeholder || '输入内容...'} className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-[#8a5a35]" />
                <button onClick={() => onSendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-40" title="发送">→</button>
              </div>
            </div>
        </section>
      </main>

      {false && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-stone-950/28 px-4 backdrop-blur-sm">
          <div className="w-full max-w-[440px] rounded-md border border-black/10 bg-white p-5">
            <p className="text-[11px] font-semibold text-[#8a5a35]">首次进入</p>
            <h2 className="mt-1 text-lg font-semibold text-stone-950">是否愿意做一次体质自查？</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              自查是问卷，不是诊断。完成后会确认是否授权建立个人体质档案；暂不做也可以，入口在左侧最下方「体质档案」。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={postponeQuestionnaire} className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-[#faf8f4]">
                稍后再说
              </button>
              <button type="button" onClick={startQuestionnaire} className="rounded-md bg-[#2f251d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a3728]">
                开始自查
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
