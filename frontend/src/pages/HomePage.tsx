import { useEffect, useMemo, useState } from 'react';
import { getCredits, getConversations, getExperts } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';

interface Props {
  userId: string;
  nickname: string;
  onOpenExperts: () => void;
  onOpenCredits: () => void;
  onOpenConversation: (conversationId: string, expertId: string) => void;
  onLogout: () => void;
}

interface Conversation {
  id: string;
  expertId: string;
  title: string;
  createdAt: string;
}

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

export default function HomePage({ userId, nickname, onOpenExperts, onOpenCredits, onOpenConversation, onLogout }: Props) {
  const [credits, setCredits] = useState<number | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [experts, setExperts] = useState<Expert[] | null>(null);

  useEffect(() => {
    getCredits(userId).then((data: { credits: number }) => setCredits(data.credits)).catch(() => {});
    getConversations(userId).then(setConversations).catch(() => {});
    getExperts().then(setExperts).catch(() => showToast('专家加载失败'));
  }, [userId]);

  const recent = conversations[0];
  const featuredExperts = useMemo(() => {
    if (!experts) return [];
    return experts.slice(0, 6);
  }, [experts]);

  return (
    <div className="min-h-screen bg-[#f4efe4] text-stone-950">
      <header className="absolute left-0 right-0 top-0 z-10 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <button onClick={onOpenExperts} className="text-lg font-black tracking-tight text-stone-950">
            专家咨询
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onOpenCredits} className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-emerald-800 shadow-sm">
              {credits ?? '--'} 积分
            </button>
            <button onClick={onLogout} className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-stone-600 shadow-sm">
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 pb-10 pt-28">
        <section className="mx-auto grid min-h-[620px] max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-black text-emerald-800">{nickname}</p>
            <h1 className="mt-4 text-5xl font-black leading-[1.05] text-stone-950 sm:text-6xl">
              把问题，
              <br />
              交给对的人。
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-600">
              邮箱注册后可领取体验积分，进入专家咨询、积分中心和商城。
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onOpenExperts} className="rounded-full bg-stone-950 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-stone-800">
                立即咨询
              </button>
              <button onClick={onOpenCredits} className="rounded-full bg-white px-6 py-3 text-sm font-black text-stone-800 shadow-sm hover:bg-stone-50">
                积分中心
              </button>
            </div>
          </div>

          <div className="relative mx-auto flex min-h-[360px] w-full max-w-[520px] items-center justify-center">
            <div className="absolute inset-8 rounded-[2rem] border border-white/70 bg-white/35 shadow-2xl" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/45" />
            <div className="relative grid w-full grid-cols-3 gap-4 px-6">
              {featuredExperts.map((expert, index) => {
                const display = getExpertDisplay(expert.id);
                const sizes = ['h-28 w-28', 'h-20 w-20', 'h-24 w-24', 'h-20 w-20', 'h-28 w-28', 'h-24 w-24'];
                const offsets = ['translate-y-6', 'translate-y-0', 'translate-y-10', 'translate-y-12', 'translate-y-4', 'translate-y-8'];
                return (
                  <button
                    key={expert.id}
                    onClick={onOpenExperts}
                    className={`justify-self-center overflow-hidden rounded-full border-4 border-white bg-white shadow-xl transition hover:scale-105 ${sizes[index]} ${offsets[index]}`}
                    title={display.alias}
                  >
                    <img src={display.avatar} alt={display.alias} className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl pb-8">
          <div className="grid gap-3 md:grid-cols-3">
            <button
              onClick={() => recent ? onOpenConversation(recent.id, recent.expertId) : onOpenExperts()}
              className="rounded-2xl border border-stone-200 bg-white/85 p-5 text-left shadow-sm hover:bg-white"
            >
              <p className="text-sm font-black text-stone-950">继续上次</p>
              <p className="mt-2 text-xs text-stone-500">{recent ? recent.title : '开始第一次咨询'}</p>
            </button>
            <button onClick={onOpenCredits} className="rounded-2xl border border-stone-200 bg-white/85 p-5 text-left shadow-sm hover:bg-white">
              <p className="text-sm font-black text-stone-950">商城</p>
              <p className="mt-2 text-xs text-stone-500">聊天次数 / 专家解锁 / PDF / 定制专家</p>
            </button>
            <button onClick={onOpenCredits} className="rounded-2xl border border-stone-200 bg-white/85 p-5 text-left shadow-sm hover:bg-white">
              <p className="text-sm font-black text-stone-950">邀请</p>
              <p className="mt-2 text-xs text-stone-500">分享后可得积分</p>
            </button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl pb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-stone-950">热门专家</h2>
            <button onClick={onOpenExperts} className="text-sm font-black text-emerald-700">全部</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredExperts.map(expert => {
              const display = getExpertDisplay(expert.id);
              return (
                <button key={expert.id} onClick={onOpenExperts} className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 text-left shadow-sm hover:bg-white">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-emerald-50">
                    <img src={display.avatar} alt={display.alias} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{display.alias}</p>
                    <p className="truncate text-xs text-stone-500">{display.shortTitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
