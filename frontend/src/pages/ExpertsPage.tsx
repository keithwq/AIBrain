import { useEffect, useMemo, useRef, useState } from 'react';
import { getExperts, getCredits, getConversations, deleteConversation, renameConversation } from '../services/api';
import { showToast } from '../components/toastStore';
import { FEATURED_EXPERT_ORDER, getExpertDisplay } from '../data/experts';
import { EXPERT_CATEGORY_BY_ID, EXPERT_CATEGORIES } from '../data/expertCategories';
import NavBar from '../components/NavBar';

interface Expert {
  id: string;
  name: string;
  alias: string;
  avatar: string;
  description: string;
  tagline?: string;
  expertise: string[];
  status: string;
  has_skill: boolean;
  skill_lines?: number;
  min_ready_skill_lines?: number;
}

interface Conversation {
  id: string;
  expertId: string;
  title: string;
  createdAt: string;
}

interface Props {
  userId: string;
  token: string;
  nickname: string;
  onSelectExpert: (expertId: string) => void;
  onOpenConversation: (conversationId: string, expertId: string) => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
  onLogout: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className || ''}`} />;
}

function ConfirmModal({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-gray-800">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

const EXPERT_PLACEHOLDER = Array(8).fill(null);
const ORDER_INDEX = new Map<string, number>(FEATURED_EXPERT_ORDER.map((id, index) => [id, index]));
const CATEGORY_VISUALS: Record<string, { icon: string; tone: string; active: string; mark: string; action: string }> = {
  education: {
    icon: '教',
    tone: 'border-sky-100 bg-sky-50 text-sky-900',
    active: 'border-sky-400 bg-sky-100 shadow-[0_18px_50px_rgba(14,165,233,0.18)]',
    mark: 'bg-sky-500',
    action: '做课程、教研、升学判断',
  },
  family: {
    icon: '家',
    tone: 'border-rose-100 bg-rose-50 text-rose-950',
    active: 'border-rose-400 bg-rose-100 shadow-[0_18px_50px_rgba(244,63,94,0.18)]',
    mark: 'bg-rose-500',
    action: '看家庭教育、成长边界、心理抚养',
  },
  business: {
    icon: '商',
    tone: 'border-amber-100 bg-amber-50 text-amber-950',
    active: 'border-amber-400 bg-amber-100 shadow-[0_18px_50px_rgba(245,158,11,0.2)]',
    mark: 'bg-amber-500',
    action: '做战略、营销、组织增长',
  },
  product: {
    icon: '产',
    tone: 'border-zinc-200 bg-zinc-50 text-zinc-950',
    active: 'border-zinc-500 bg-zinc-100 shadow-[0_18px_50px_rgba(39,39,42,0.16)]',
    mark: 'bg-zinc-900',
    action: '做产品取舍、表达、实验',
  },
  legal: {
    icon: '法',
    tone: 'border-blue-100 bg-blue-50 text-blue-950',
    active: 'border-blue-400 bg-blue-100 shadow-[0_18px_50px_rgba(37,99,235,0.18)]',
    mark: 'bg-blue-600',
    action: '看合同、证据、风险边界',
  },
  health: {
    icon: '医',
    tone: 'border-emerald-100 bg-emerald-50 text-emerald-950',
    active: 'border-emerald-400 bg-emerald-100 shadow-[0_18px_50px_rgba(16,185,129,0.18)]',
    mark: 'bg-emerald-500',
    action: '做症状梳理和医学沟通',
  },
  mindfulness: {
    icon: '静',
    tone: 'border-indigo-100 bg-indigo-50 text-indigo-950',
    active: 'border-indigo-400 bg-indigo-100 shadow-[0_18px_50px_rgba(99,102,241,0.18)]',
    mark: 'bg-indigo-500',
    action: '做呼吸练习和情绪安顿',
  },
  structure: {
    icon: '构',
    tone: 'border-stone-200 bg-stone-50 text-stone-950',
    active: 'border-stone-500 bg-stone-100 shadow-[0_18px_50px_rgba(87,83,78,0.16)]',
    mark: 'bg-stone-700',
    action: '看制度、产业和城乡结构',
  },
  knowledge: {
    icon: '知',
    tone: 'border-teal-100 bg-teal-50 text-teal-950',
    active: 'border-teal-400 bg-teal-100 shadow-[0_18px_50px_rgba(20,184,166,0.18)]',
    mark: 'bg-teal-500',
    action: '拆知识、做表达训练',
  },
};

export default function ExpertsPage({ userId, token, nickname, onSelectExpert, onOpenConversation, onOpenCredits, onOpenHome, onLogout }: Props) {
  const expertsSectionRef = useRef<HTMLElement | null>(null);
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsError, setConversationsError] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    getExperts().then((items: Expert[]) => {
      setExperts(items);
      setError(null);
    }).catch(() => {
      setError('加载方法卡失败');
      showToast('加载方法卡失败');
    });
    getCredits(token).then((data: { credits: number }) => setCredits(data.credits)).catch(() => {});
    getConversations(token).then(items => {
      setConversations(items);
      setConversationsError(false);
    }).catch(() => {
      setConversationsError(true);
    });
  }, [token]);

  const sortedExperts = useMemo(() => {
    if (!experts) return null;
    return [...experts].sort((a, b) => {
      const aIndex = ORDER_INDEX.get(a.id) ?? 999;
      const bIndex = ORDER_INDEX.get(b.id) ?? 999;
      return aIndex - bIndex;
    });
  }, [experts]);

  const groupedExperts = useMemo(() => {
    if (!sortedExperts) return [];
    return EXPERT_CATEGORIES.map(category => ({
      ...category,
      experts: sortedExperts.filter(expert => category.expertIds.includes(expert.id)),
    })).filter(group => group.experts.length > 0);
  }, [sortedExperts]);

  const selectedCategory = groupedExperts.find(group => group.id === selectedCategoryId) || null;
  const displayedExperts = selectedCategory ? selectedCategory.experts : sortedExperts;

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const isCreditsExhausted = credits === 0;

  const getConversationLabel = (conv: Conversation) => {
    const display = getExpertDisplay(conv.expertId);
    if (!conv.title || conv.title === conv.expertId) return display.alias;
    return conv.title;
  };

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    window.setTimeout(() => {
      expertsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    deleteConversation(token, id).then(() => {
      setConversations(prev => prev.filter(c => c.id !== id));
    }).catch(() => showToast('删除失败'));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {deleteTarget && (
        <ConfirmModal
          message="确定删除此对话记录？删除后无法恢复。"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
      <NavBar userId={userId} nickname={nickname} onOpenHome={onOpenHome} onOpenExperts={() => {}} onOpenCredits={onOpenCredits} onLogout={onLogout} />

      <main className="mx-auto max-w-6xl space-y-10 p-6">
        {credits !== null && (
          <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white px-5 py-3 shadow-sm">
            <span className="text-sm text-[var(--ink-2)]">剩余积分</span>
            <button onClick={onOpenCredits} className={`text-lg font-black transition hover:opacity-70 ${credits === 0 ? 'text-red-500' : 'text-blue-600'}`}>
              {credits} 分 →
            </button>
          </div>
        )}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {isCreditsExhausted && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-black">积分已用完，暂时不能开启新对话</p>
            <p className="mt-1 text-xs leading-5 text-red-700">历史记录仍可查看。补充积分后，方法卡会自动恢复可点击。</p>
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="bg-[#0b1220] p-6 text-white md:p-8">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-300">领域入口</p>
              <h2 className="mt-4 text-3xl font-black leading-tight md:text-4xl">
                先选问题场景，
                <br />
                再调用专家方法卡。
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-white/62">
                领域入口不是内容分类，而是帮你把问题先放进正确的判断框架里。点一个领域，下方会只保留对应专家。
              </p>
              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="border-t border-white/15 pt-4">
                  <p className="text-2xl font-black">{groupedExperts.length}</p>
                  <p className="mt-1 text-xs text-white/50">个领域</p>
                </div>
                <div className="border-t border-white/15 pt-4">
                  <p className="text-2xl font-black">{sortedExperts?.length ?? '-'}</p>
                  <p className="mt-1 text-xs text-white/50">张方法卡</p>
                </div>
                <div className="border-t border-white/15 pt-4">
                  <p className="text-2xl font-black">{credits ?? '-'}</p>
                  <p className="mt-1 text-xs text-white/50">剩余积分</p>
                </div>
              </div>
            </div>
            <div className="p-4 md:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {groupedExperts.map(group => {
                  const visual = CATEGORY_VISUALS[group.id] || CATEGORY_VISUALS.product;
                  const active = selectedCategoryId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => handleSelectCategory(group.id)}
                      className={`group min-h-[132px] rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${visual.tone} ${active ? visual.active : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${visual.mark}`}>
                          {visual.icon}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${active ? 'bg-white text-gray-950' : 'bg-white/70 text-gray-600'}`}>
                          {active ? '已选中' : `${group.experts.length} 张卡`}
                        </span>
                      </div>
                      <p className="mt-4 text-lg font-black">{group.name}</p>
                      <p className="mt-1 text-sm leading-5 opacity-70">{group.description}</p>
                      <p className="mt-3 text-xs font-black opacity-80">{visual.action} →</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section ref={expertsSectionRef}>
          <div className="mb-4 flex flex-col justify-between gap-4 rounded-[24px] border border-black/5 bg-white px-5 py-4 shadow-sm md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">当前筛选</p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">{selectedCategory ? selectedCategory.name : '全部方法卡'}</h2>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                {selectedCategory ? selectedCategory.description : '所有已上线专家方法卡。也可以先从上方领域入口筛选。'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className={`rounded-full border px-4 py-2 text-sm font-black transition ${!selectedCategory ? 'border-gray-950 bg-gray-950 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-600'}`}
              >
                全部
              </button>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 hover:border-blue-300 hover:text-blue-600"
                >
                  清除筛选
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(displayedExperts || EXPERT_PLACEHOLDER).map((expert, i) => {
              const display = expert ? getExpertDisplay(expert.id) : null;
              const avatar = expert?.avatar || display?.avatar;
              const category = expert ? EXPERT_CATEGORY_BY_ID.get(expert.id) : null;

              return (
                <button
                  key={expert?.id || i}
                  type="button"
                  disabled={!expert || isCreditsExhausted}
                  onClick={() => expert && onSelectExpert(expert.id)}
                  className={`group relative flex flex-col rounded-2xl border p-5 text-left shadow-sm transition ${
                    !expert
                      ? 'border-black/5 bg-white'
                      : isCreditsExhausted
                        ? 'cursor-not-allowed border-black/5 bg-white opacity-60'
                        : 'border-black/5 bg-white hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg'
                  }`}
                >
                  {!expert ? (
                    <>
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <Skeleton className="mt-3 h-4 w-24" />
                      <Skeleton className="mt-2 h-3 w-full" />
                      <Skeleton className="mt-1 h-3 w-3/4" />
                    </>
                  ) : (
                    <>
                      {category && (
                        <span className="mb-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          {category.name}
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-blue-50">
                          {avatar && <img src={avatar} alt={display?.alias || expert.alias} className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black text-gray-950">{display?.alias || expert.alias}</p>
                          <p className="truncate text-xs text-gray-500">{display?.shortTitle || ''}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-600">{expert.tagline || expert.description}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {expert.expertise.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{tag}</span>
                        ))}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {displayedExperts && displayedExperts.length === 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm leading-6 text-amber-900">
              <p className="font-black">当前没有达到 5000 行蒸馏标准的专家，已全部下架。</p>
              <p className="mt-1">历史对话仍可查看；新专家会在 persona 补足并通过标准后自动重新上架。</p>
            </div>
          )}
        </section>

        {(conversations.length > 0 || conversationsError) && (
          <section>
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="text-2xl font-black text-gray-950">历史记录</h2>
              <input
                type="search"
                placeholder="搜索记录..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            {conversationsError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                历史记录加载失败，请刷新页面重试。
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map(conv => {
                  const display = getExpertDisplay(conv.expertId);
                  const label = getConversationLabel(conv);
                  return (
                    <div key={conv.id} className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
                      <div className="flex-1 min-w-0">
                        {editingId === conv.id ? (
                          <input
                            autoFocus
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => {
                              if (editTitle.trim() && editTitle !== conv.title) {
                                renameConversation(token, conv.id, editTitle.trim()).then(updated => {
                                  setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: updated.title } : c));
                                }).catch(() => showToast('重命名失败'));
                              }
                              setEditingId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') { setEditingId(null); }
                            }}
                            className="w-full rounded border border-blue-300 px-2 py-0.5 text-sm outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => onOpenConversation(conv.id, conv.expertId)}
                            onDoubleClick={() => {
                              setEditingId(conv.id);
                              setEditTitle(conv.title);
                            }}
                            className="w-full text-left"
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-semibold text-gray-950">{label}</span>
                              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{display.alias}</span>
                              <span className="text-[11px] text-gray-400">{new Date(conv.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">双击可改标题</p>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteTarget(conv.id)}
                        className="ml-2 p-1 text-gray-400 transition hover:text-red-500"
                        title="删除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
