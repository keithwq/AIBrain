import { useEffect, useMemo, useState } from 'react';
import { getExperts, getCredits, getConversations, deleteConversation, renameConversation } from '../services/api';
import { showToast } from '../components/toastStore';
import { FEATURED_EXPERT_ORDER, getExpertDisplay } from '../data/experts';

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
  onLogout: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className || ''}`} />;
}

const EXPERT_PLACEHOLDER = Array(8).fill(null);
const ORDER_INDEX = new Map<string, number>(FEATURED_EXPERT_ORDER.map((id, index) => [id, index]));

export default function ExpertsPage({ userId, nickname, onSelectExpert, onOpenConversation, onLogout }: Props) {
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getExperts().then((items: Expert[]) => {
      setExperts(items);
      setError(null);
    }).catch(() => {
      setError('加载专家列表失败');
      showToast('加载专家列表失败');
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

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const isCreditsExhausted = credits === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-950">AI外脑</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {credits !== null ? (
            <span>剩余积分: <strong className={credits === 0 ? 'text-red-500' : 'text-emerald-600'}>{credits}</strong></span>
          ) : (
            <Skeleton className="w-20 h-4" />
          )}
          <span>{nickname}</span>
          <button onClick={onLogout} className="text-blue-600 hover:underline">退出</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-9">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        {isCreditsExhausted && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-black">积分已用完，暂时不能发起新咨询</p>
            <p className="mt-1 text-xs leading-5 text-red-700">历史对话仍可查看。补充积分后，专家卡片会自动恢复可点击。</p>
          </div>
        )}

        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-950">选择专家开始对话</h2>
            <span className="text-sm text-emerald-700">专家库已接入</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {(sortedExperts || EXPERT_PLACEHOLDER).map((expert, i) => {
              const display = expert ? getExpertDisplay(expert.id) : null;
              const avatar = expert?.avatar || display?.avatar;

              return (
                <button
                  key={expert?.id || i}
                  onClick={() => {
                    if (!expert) return;
                    if (isCreditsExhausted) {
                      showToast('积分已用完，补充后才能发起新咨询。');
                      return;
                    }
                    onSelectExpert(expert.id);
                  }}
                  disabled={!expert}
                  className={`group bg-white rounded-lg p-5 shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition text-left ${isCreditsExhausted ? 'opacity-60' : ''} ${!expert ? 'pointer-events-none opacity-40' : ''}`}
                >
                  {expert && display ? (
                    <>
                      <div className="flex items-start gap-4">
                        <div className="w-24 h-24 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
                          {avatar ? (
                            <img src={avatar} alt={display.alias} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-3xl text-emerald-800">{display.alias[0]}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg text-gray-950 truncate">{display.alias}</h3>
                          <p className="mt-1 text-[15px] font-semibold text-emerald-700">{display.shortTitle}</p>
                          <p className="text-sm text-gray-600 mt-3 leading-6 truncate">{display.cardIntro}</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-3 leading-5 line-clamp-2">{expert.tagline || display.tagline}</p>
                    </>
                  ) : (
                    <>
                      <Skeleton className="w-24 h-24 rounded-full mb-4" />
                      <Skeleton className="w-28 h-4 mb-2" />
                      <Skeleton className="w-40 h-3" />
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {conversations.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-950 mb-4">历史对话</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索对话..."
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-emerald-500"
            />
            <div className="space-y-2">
              {filteredConversations.map(conv => {
                const display = getExpertDisplay(conv.expertId);

                return (
                  <div
                    key={conv.id}
                    className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center justify-between"
                  >
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
                          className="w-full px-1 py-0.5 border border-emerald-400 rounded text-sm outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => onOpenConversation(conv.id, conv.expertId)}
                          onDoubleClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }}
                          className="w-full text-left"
                        >
                          <span className="font-medium text-sm text-gray-950">{conv.title}</span>
                          <span className="text-xs text-emerald-700 ml-2">{display.alias}</span>
                          <span className="text-xs text-gray-400 ml-2">{new Date(conv.createdAt).toLocaleDateString()}</span>
                          <span className="text-xs text-blue-600 ml-2">&rarr;</span>
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('确定删除此对话？')) {
                          deleteConversation(conv.id).then(() => {
                            setConversations(prev => prev.filter(c => c.id !== conv.id));
                          }).catch(() => showToast('删除失败'));
                        }
                      }}
                      className="ml-2 text-gray-400 hover:text-red-500 transition p-1"
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
