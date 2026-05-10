import { useEffect, useMemo, useState } from 'react';
import { getExperts, getCredits, getConversations, deleteConversation, renameConversation } from '../services/api';
import { showToast } from '../components/toastStore';
import { FEATURED_EXPERT_ORDER, getExpertDisplay } from '../data/experts';
import { EXPERT_CATEGORY_BY_ID, EXPERT_CATEGORIES } from '../data/expertCategories';

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
  userId: string;
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

const EXPERT_PLACEHOLDER = Array(8).fill(null);
const ORDER_INDEX = new Map<string, number>(FEATURED_EXPERT_ORDER.map((id, index) => [id, index]));

export default function ExpertsPage({ userId, nickname, onSelectExpert, onOpenConversation, onOpenCredits, onOpenHome, onLogout }: Props) {
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    getExperts().then((items: Expert[]) => {
      setExperts(items);
      setError(null);
    }).catch(() => {
      setError('加载方法卡失败');
      showToast('加载方法卡失败');
    });
    getCredits(userId).then((data: { credits: number }) => setCredits(data.credits)).catch(() => {});
    getConversations(userId).then(setConversations).catch(() => {});
  }, [userId]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button onClick={onOpenHome} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900">
            返回首页
          </button>
          <h1 className="text-2xl font-black text-gray-950">AI外脑</h1>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {credits !== null ? (
              <button type="button" onClick={onOpenCredits} className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 hover:border-emerald-300 hover:bg-emerald-50">
                <span>剩余积分:</span>
                <strong className={credits === 0 ? 'text-red-500' : 'text-emerald-600'}>{credits}</strong>
              </button>
            ) : (
              <Skeleton className="h-4 w-20" />
            )}
            <span>{nickname}</span>
            <button onClick={onOpenCredits} className="text-emerald-700 hover:underline">积分中心</button>
            <button onClick={onLogout} className="text-blue-600 hover:underline">退出</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 p-6">
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
                className={`rounded-2xl border p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md ${selectedCategoryId === group.id ? 'border-emerald-300 bg-emerald-50' : 'border-gray-100 bg-white'}`}
              >
                <p className="text-lg font-black text-gray-950">{group.name}</p>
                <p className="mt-2 text-sm leading-6 text-gray-500">{group.description}</p>
                <p className="mt-4 text-xs font-semibold text-emerald-700">{group.experts.length} 张方法卡</p>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-gray-950">{selectedCategory ? selectedCategory.name : '选择一个判断模型'}</h2>
              <span className="text-sm text-emerald-700">{selectedCategory ? selectedCategory.description : 'AI 已接入，随时可调用'}</span>
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategoryId(null)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-black text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
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
                  onClick={() => {
                    if (!expert) return;
                    if (isCreditsExhausted) {
                      showToast('积分已用完，补充后才能开启新对话。');
                      return;
                    }
                    onSelectExpert(expert.id);
                  }}
                  disabled={!expert}
                  className={`group rounded-lg border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md ${isCreditsExhausted ? 'opacity-60' : ''} ${!expert ? 'pointer-events-none opacity-40' : ''}`}
                >
                  {expert && display ? (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-emerald-100 bg-emerald-50">
                          {avatar ? (
                            <img src={avatar} alt={display.alias} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-3xl text-emerald-800">{display.alias[0]}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-gray-950">{display.alias}</h3>
                          <p className="mt-1 text-[15px] font-semibold text-emerald-700">{display.shortTitle}</p>
                          <p className="mt-3 truncate text-sm leading-6 text-gray-600">{display.cardIntro}</p>
                          {category && <p className="mt-2 text-xs font-semibold text-gray-400">{category.name}</p>}
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-xs leading-5 text-gray-400">{expert.tagline || display.tagline}</p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="mb-4 h-24 w-24 rounded-full" />
                      <Skeleton className="mb-2 h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {conversations.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-black text-gray-950">历史记录</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索记录..."
              className="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
            />
            <div className="space-y-2">
              {filteredConversations.map(conv => {
                const display = getExpertDisplay(conv.expertId);

                return (
                  <div key={conv.id} className="flex items-center justify-between rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex-1 text-left">
                      {editingId === conv.id ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              renameConversation(conv.id, editTitle).then(() => {
                                setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, title: editTitle } : c));
                                setEditingId(null);
                              }).catch(() => showToast('重命名失败'));
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          onBlur={() => setEditingId(null)}
                          className="w-full rounded border border-emerald-400 px-1 py-0.5 text-sm outline-none"
                          autoFocus
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
                          <span className="ml-2 text-xs text-emerald-700">{display.alias}</span>
                          <span className="ml-2 text-xs text-gray-400">{new Date(conv.createdAt).toLocaleDateString()}</span>
                          <span className="ml-2 text-xs text-blue-600">&rarr;</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('确定删除此记录？')) {
                          deleteConversation(conv.id).then(() => {
                            setConversations(prev => prev.filter(c => c.id !== conv.id));
                          }).catch(() => showToast('删除失败'));
                        }
                      }}
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
          </section>
        )}
      </main>
    </div>
  );
}
