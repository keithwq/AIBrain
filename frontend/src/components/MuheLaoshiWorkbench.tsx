import { useState } from 'react';
import { MUHE_LAOSHI_TASKS, AGE_STAGES, DURATION_OPTIONS, type MuheLaoshiTaskId, type MuheLaoshiTask } from '../data/muheLaoshiTasks';
import type { Attachment } from '../services/api';

export interface MuheLaoshiValues {
  ageStage: string;
  childGender: string;
  childGrade: string;
  childTemperament: string;
  parentRole: string;
  primaryCaregiver: string;
  behavior: string;
  duration: string;
  familyPattern: string;
  goal: string;
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
  values: MuheLaoshiValues;
  activeTaskId: MuheLaoshiTaskId;
  task: MuheLaoshiTask;
  pendingFiles: File[];
  bottomRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  conversationTitle: string;
  onBack: () => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
  onInputChange: (value: string) => void;
  onValueChange: (key: keyof MuheLaoshiValues, value: string) => void;
  onTaskChange: (taskId: MuheLaoshiTaskId) => void;
  onChooseFiles: (files: FileList | null) => void;
  onRemovePendingFile: (index: number) => void;
  onSendText: (text: string) => void;
  onCopy: (content: string) => void;
  onDownloadWord: (title: string, content: string) => void;
  renderMessageText: (content: string, dark?: boolean) => React.ReactNode;
  renderAttachments: (attachments?: Attachment[], dark?: boolean) => React.ReactNode;
}

function buildWorkbenchPrompt(task: MuheLaoshiTask, values: MuheLaoshiValues): string {
  const parts: string[] = [
    `【木禾老师工作台 · ${task.label}】`,
    task.prompt,
    '',
    '【已填写信息】',
    '一、孩子信息',
    `孩子年龄段：${values.ageStage || '未填写'}`,
    `孩子性别：${values.childGender || '未填写'}`,
    `学段/年级：${values.childGrade || '未填写'}`,
    `性格特点：${values.childTemperament || '未填写'}`,
    '',
    '二、家长/照料者信息',
    `提问者身份：${values.parentRole || '未填写'}`,
    `主要照料者：${values.primaryCaregiver || '未填写'}`,
    '',
    '三、现象与持续时间',
    `${task.behaviorLabel}：${values.behavior || '未填写'}`,
    `${task.durationLabel}：${values.duration || '未填写'}`,
    '',
    '四、家庭结构与目标',
    `${task.familyLabel}：${values.familyPattern || '未填写'}`,
    `${task.goalLabel}：${values.goal || '未填写'}`,
    '',
    '【输出要求】',
    '先判断，再解释，再给动作。不要讲空泛道理；不要贴人格标签；不要制造恐慌；高风险信号必须提醒现实求助。',
    '回答结构固定为：1. 先判断 2. 根源在哪里 3. 家里今天怎么做 4. 夫妻/家庭分工提醒 5. 什么情况要找专业帮助。',
  ];
  return parts.join('\n');
}

export function MuheLaoshiWorkbench({
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
  const [formOpen, setFormOpen] = useState(true);

  const hasMessages = messages.length > 0 || sending || streamingContent;

  const handleQuickQuestion = (q: string) => {
    const context = buildWorkbenchPrompt(task, values);
    const hasContext = Object.values(values).some(v => v.trim());
    onSendText(hasContext ? `${context}\n\n问题：${q}` : q);
  };

  const handleStartAnalysis = () => {
    const prompt = buildWorkbenchPrompt(task, values);
    onSendText(prompt);
    setFormOpen(false);
  };

  const canStart = values.behavior.trim() || values.childGender.trim() || values.childGrade.trim() || values.parentRole.trim() || values.primaryCaregiver.trim();

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-rose-50/30 text-stone-950">
      {/* 顶部导航 */}
      <header className="shrink-0 border-b border-black/10 bg-white/95 px-4 py-2.5 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3">
          <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-md border border-black/10 bg-white text-base text-stone-600 transition hover:bg-rose-50" title="返回">←</button>
          <button onClick={onOpenHome} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-rose-50">首页</button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[15px] font-semibold text-stone-950">木禾老师 · 家庭关系工作台</h1>
            <p className="truncate text-xs text-stone-500">心理抚养 · 亲子关系 · 夫妻共育 · 成长边界</p>
          </div>
          <button onClick={onOpenCredits} className="rounded-md border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-600">积分</button>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1600px] flex-1 grid-cols-[200px_minmax(0,1.5fr)_360px] gap-3 p-3">
        {/* 左栏：任务选择 */}
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="shrink-0 border-b border-black/8 px-3 py-2.5">
            <p className="text-[11px] font-semibold text-stone-500">先选家庭场景</p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {MUHE_LAOSHI_TASKS.map(item => {
              const active = item.id === activeTaskId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onTaskChange(item.id)}
                  className={`w-full rounded border px-3 py-2 text-left transition ${active ? 'border-rose-800/60 bg-rose-800 text-white' : 'border-transparent text-stone-800 hover:border-black/10 hover:bg-rose-50'}`}
                >
                  <span className="block text-[13px] font-semibold leading-5">{item.label}</span>
                  <span className={`mt-0.5 block text-[11px] leading-4 ${active ? 'text-white/70' : 'text-stone-500'}`}>{item.headline}</span>
                </button>
              );
            })}
          </div>

          {/* 左栏底部：高风险降级提示 */}
          <div className="shrink-0 border-t border-black/8 p-3">
            <p className="text-[10px] leading-4 text-stone-400">
              自伤、抑郁、暴力、失联先求助现实支持<br />
              <span className="font-semibold text-rose-700">400-161-9995</span>（心理援助）
            </p>
          </div>
        </aside>

            {/* 中栏：信息收集 + 快速问题 */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          {/* 中栏顶部：任务说明 + 折叠控制 */}
          <div className="shrink-0 flex items-center justify-between border-b border-black/8 px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-stone-900">{task.label}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-stone-500">{task.description}</p>
            </div>
            {hasMessages && (
              <button
                type="button"
                onClick={() => setFormOpen(v => !v)}
                className="ml-3 shrink-0 rounded-md border border-black/10 bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition hover:bg-rose-50"
              >
                {formOpen ? '收起' : '展开信息'}
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* 信息收集表单 */}
            {formOpen && (
              <div className="space-y-4 p-4">
                <section className="space-y-3">
                  <p className="text-[11px] font-semibold text-stone-500">孩子信息</p>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">
                      孩子年龄段
                      <span className="ml-1 font-normal text-rose-600">（先定阶段，再定办法）</span>
                    </span>
                    <select
                      value={values.ageStage}
                      onChange={e => onValueChange('ageStage', e.target.value)}
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-rose-400"
                    >
                      {AGE_STAGES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">孩子性别</span>
                    <input
                      value={values.childGender}
                      onChange={e => onValueChange('childGender', e.target.value)}
                      placeholder="男 / 女 / 不便说明"
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">学段/年级</span>
                    <input
                      value={values.childGrade}
                      onChange={e => onValueChange('childGrade', e.target.value)}
                      placeholder="例如：幼儿园中班、小学三年级、初二、高一"
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">性格特点</span>
                    <input
                      value={values.childTemperament}
                      onChange={e => onValueChange('childTemperament', e.target.value)}
                      placeholder="只写长期特点：敏感、外向、慢热、急躁、内向等"
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>
                </section>

                <section className="space-y-3 border-t border-black/8 pt-4">
                  <p className="text-[11px] font-semibold text-stone-500">家长/照料者信息</p>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">提问者身份</span>
                    <input
                      value={values.parentRole}
                      onChange={e => onValueChange('parentRole', e.target.value)}
                      placeholder="例如：妈妈、爸爸、爷爷奶奶、外公外婆、老师"
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">主要照料者</span>
                    <input
                      value={values.primaryCaregiver}
                      onChange={e => onValueChange('primaryCaregiver', e.target.value)}
                      placeholder="只写谁主要带大/日常照顾：妈妈、爸爸、老人、保姆等"
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>
                </section>

                <section className="space-y-3 border-t border-black/8 pt-4">
                  <p className="text-[11px] font-semibold text-stone-500">现象描述</p>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">{task.behaviorLabel}</span>
                    <textarea
                      value={values.behavior}
                      onChange={e => onValueChange('behavior', e.target.value)}
                      placeholder={task.behaviorPlaceholder}
                      rows={3}
                      className="w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">{task.durationLabel}</span>
                    <select
                      value={values.duration}
                      onChange={e => onValueChange('duration', e.target.value)}
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-2 text-xs text-stone-800 outline-none focus:border-rose-400"
                    >
                      {DURATION_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                </section>

                <section className="space-y-3 border-t border-black/8 pt-4">
                  <p className="text-[11px] font-semibold text-stone-500">家庭结构与目标</p>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">{task.familyLabel}</span>
                    <textarea
                      value={values.familyPattern}
                      onChange={e => onValueChange('familyPattern', e.target.value)}
                      placeholder={task.familyPlaceholder}
                      rows={2}
                      className="w-full resize-none rounded-md border border-black/10 bg-white px-3 py-2 text-xs leading-5 text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-stone-700">{task.goalLabel}</span>
                    <input
                      value={values.goal}
                      onChange={e => onValueChange('goal', e.target.value)}
                      placeholder={task.goalPlaceholder}
                      className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-xs text-stone-800 outline-none placeholder:text-stone-400 focus:border-rose-400"
                    />
                  </label>
                </section>

                <button
                  onClick={handleStartAnalysis}
                  disabled={!canStart || sending}
                  className="w-full rounded-md bg-rose-800 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-40"
                >
                  开始分析
                </button>
              </div>
            )}

            {/* 快速问题入口 — 表单收起后或补充追问 */}
            <div className={`${formOpen ? 'border-t border-black/8' : ''} p-4`}>
              <p className="mb-2 text-[11px] font-semibold text-stone-500">快速追问</p>
              <div className="space-y-1.5">
                {task.quickQuestions.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQuickQuestion(q)}
                    disabled={sending}
                    className="w-full rounded-md border border-black/10 bg-white px-3 py-2 text-left text-[12px] leading-5 text-stone-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右栏：对话区 */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-md border border-black/10 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto bg-rose-50/20 p-3">
            {creditBlocked && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-semibold">积分不足</p>
                <button type="button" onClick={onOpenCredits} className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600">去积分中心</button>
              </div>
            )}
            {messagesLoading && <div className="py-16 text-center text-sm text-stone-400">加载中...</div>}
            {messagesError && <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">消息加载失败，请返回重试。</div>}

            {!messagesLoading && !messagesError && messages.length === 0 && !sending && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-stone-400">先分开填基础信息、现象和家庭结构</p>
                  <p className="mt-1 text-xs text-stone-400">木禾老师会先读人，再读事，再读家庭系统</p>
                </div>
              </div>
            )}

            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.id} className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[88%] rounded-md px-3.5 py-2.5 text-[13px] leading-6 ${isUser ? 'rounded-br-sm bg-rose-800 text-white' : 'rounded-bl-sm border border-black/10 bg-white text-stone-800'}`}>
                    {renderMessageText(msg.content, isUser)}
                    {renderAttachments(msg.attachments, isUser)}
                    {!isUser && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
                        <button onClick={() => onCopy(msg.content)} className="rounded-md border border-black/10 bg-stone-50 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white">复制</button>
                        <button onClick={() => onDownloadWord(conversationTitle || task.label, msg.content)} className="rounded-md border border-black/10 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-white">下载 Word</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {streamingContent && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[88%] rounded-md rounded-bl-sm border border-black/10 bg-white px-3.5 py-2.5 text-[13px] leading-6 text-stone-800">
                  {renderMessageText(streamingContent)}
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-rose-800 align-middle" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 底部输入栏 */}
          <div className="shrink-0 border-t border-black/8 bg-white p-2.5">
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.doc,.docx" onChange={e => onChooseFiles(e.target.files)} className="hidden" />
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md border border-black/10 bg-rose-50/50 px-2.5 py-1.5 text-xs text-stone-700">
                    <span className="max-w-48 truncate font-semibold">{file.name}</span>
                    <button type="button" onClick={() => onRemovePendingFile(index)} className="text-stone-400 hover:text-red-600">×</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-black/10 bg-white text-lg text-stone-700 transition hover:border-rose-300 disabled:opacity-40" title="上传附件">+</button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => onInputChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onSendText(input)}
                placeholder="继续追问..."
                className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] text-stone-900 outline-none placeholder:text-stone-400 focus:border-rose-400"
              />
              <button onClick={() => onSendText(input)} disabled={sending || (!input.trim() && pendingFiles.length === 0)} className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-rose-800 text-white transition hover:bg-rose-700 disabled:opacity-40" title="发送">→</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
