import { useEffect, useState } from 'react';
import { getExperts, getQuota, getConversations, deleteConversation, renameConversation } from '../services/api';
import { showToast } from '../components/Toast';

interface Expert {
  id: string;
  name: string;
  alias: string;
  avatar: string;
  description: string;
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

export default function ExpertsPage({ userId, nickname, onSelectExpert, onOpenConversation, onLogout }: Props) {
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getExperts().then(setExperts).catch(() => { setError('加载专家列表失败'); showToast('加载专家列表失败'); });
    getQuota(userId).then((data: { dailyQuota: number }) => setQuota(data.dailyQuota)).catch(() => {});
    getConversations(userId).then(setConversations).catch(() => {});
  }, [userId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">AI外脑</h1>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {quota !== null ? (
            <span>剩余次数: <strong className={quota === 0 ? 'text-red-500' : 'text-green-600'}>{quota}</strong></span>
          ) : (
            <Skeleton className="w-16 h-4" />
          )}
          <span>{nickname}</span>
          <button onClick={onLogout} className="text-blue-600 hover:underline">退出</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
        <section>
          <h2 className="text-lg font-semibold mb-4">选择专家开始对话</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(experts || EXPERT_PLACEHOLDER).map((expert, i) => (
              <button
                key={expert?.id || i}
                onClick={() => expert && onSelectExpert(expert.id)}
                disabled={quota === 0 || !expert}
                className={`bg-white rounded-lg p-4 shadow hover:shadow-md transition text-left disabled:opacity-40 ${!expert ? 'pointer-events-none' : ''}`}
              >
                {expert ? (
                  <>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 text-lg">
                      {expert.name[0]}
                    </div>
                    <h3 className="font-medium text-sm">{expert.alias ? `${expert.name}·${expert.alias}` : expert.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{expert.description}</p>
                  </>
                ) : (
                  <>
                    <Skeleton className="w-12 h-12 rounded-full mb-3" />
                    <Skeleton className="w-20 h-4 mb-1" />
                    <Skeleton className="w-28 h-3" />
                  </>
                )}
              </button>
            ))}
          </div>
        </section>
        {conversations.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">历史对话</h2>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索对话..."
              className="w-full mb-3 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="space-y-2">
              {conversations.filter(conv => conv.title.toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
                <div
                  key={conv.id}
                  className="w-full bg-white rounded-lg p-4 shadow flex items-center justify-between"
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
                        className="w-full px-1 py-0.5 border border-blue-400 rounded text-sm outline-none"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => onOpenConversation(conv.id, conv.expertId)}
                        onDoubleClick={() => { setEditingId(conv.id); setEditTitle(conv.title); }}
                        className="w-full text-left"
                      >
                        <span className="font-medium text-sm">{conv.title}</span>
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
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
