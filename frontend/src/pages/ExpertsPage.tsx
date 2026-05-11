import { useEffect, useMemo, useState } from 'react';
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
}

interface Conversation {
  id: string;
  expertId: string;
  title: string;
  createdAt: string;
}

interface Props {
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

export default function ExpertsPage({ token, nickname, onSelectExpert, onOpenConversation, onOpenCredits, onOpenHome, onLogout }: Props) {
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
      <NavBar userId="" nickname={nickname} onOpenHome={onOpenHome} onOpenExperts={() => {}} onOpenCredits={onOpenCredits} onLogout={onLogout} />

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

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-gray-950">领域入口</h2>
              <p className="mt-1 text-sm text-gray-500">先选场景，再选方法。后续蒸馏的新方法卡，只要挂到对应领域就能自然加入。</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupedExperts.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedCategoryId(group.id)}
                className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${selectedCategoryId === group.id ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-black/5 bg-white shadow-sm'}`}
              >
                <p className="text-lg font-black text-gray-950">{group.name}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{group.description}</p>
                <p className="mt-4 text-xs font-semibold text-blue-600">{group.experts.length} 张方法卡</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-gray-950">{selectedCategory ? selectedCategory.name : '选择一个判断模型'}</h2>
              <span className="text-sm text-blue-600">{selectedCategory ? selectedCategory.description : 'AI 已接入，随时可调用'}</span>
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 hover:border-blue-300 hover:text-blue-600"
              >
                全部方法
              </button>
            )}
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
                          {avatar && <img src={avatar} alt={expert.name} className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-black text-gray-950">{display?.alias || expert.name}</p>
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
                  return (
                    <div key={conv.id} className="flex items-center rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-sm">
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
                            <span className="text-sm font-medium text-gray-950">{conv.title}</span>
                            <span className="ml-2 text-xs text-blue-600">{display.alias}</span>
                            <span className="ml-2 text-xs text-gray-400">{new Date(conv.createdAt).toLocaleDateString()}</span>
                            <span className="ml-2 text-xs text-blue-600">&rarr;</span>
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
