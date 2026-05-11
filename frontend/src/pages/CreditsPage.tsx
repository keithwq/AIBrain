import { useEffect, useState } from 'react';
import { getCredits, grantCredits } from '../services/api';
import { showToast } from '../components/toastStore';
import NavBar from '../components/NavBar';

interface Props {
  userId: string;
  nickname: string;
  onBack: () => void;
}

interface CreditsProfile {
  credits: number;
}

const SUPPLIES = [
  {
    title: '今日补给',
    amount: 3,
    description: '适合积分刚好用完时，先继续完成一次方法调用。',
  },
  {
    title: '任务奖励',
    amount: 6,
    description: '用于后续接入真实任务系统，现在先作为可验收入口。',
  },
  {
    title: '深度调用包',
    amount: 10,
    description: '适合连续使用多张方法卡，方便测试完整流程。',
  },
];

export default function CreditsPage({ userId, nickname, onBack }: Props) {
  const [credits, setCredits] = useState<number | null>(null);
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  useEffect(() => {
    getCredits(userId)
      .then((data: CreditsProfile) => setCredits(data.credits))
      .catch(() => showToast('积分加载失败，请稍后重试。'));
  }, [userId]);

  const handleSupply = async (amount: number) => {
    if (loadingAmount !== null) return;
    setLoadingAmount(amount);
    try {
      const data = await grantCredits(userId, amount);
      setCredits(data.credits);
      showToast(`已补充 ${amount} 积分`, 'info');
    } catch {
      showToast('补充积分失败，请稍后重试。');
    } finally {
      setLoadingAmount(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavBar userId={userId} nickname={nickname} onOpenHome={onBack} onOpenExperts={onBack} onOpenCredits={() => {}} onLogout={onBack} />

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        <section className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <p className="text-sm font-bold text-[var(--ink-2)]">当前可用积分</p>
            <div className="mt-4 flex items-end gap-3">
              <span className={`text-8xl font-black leading-none ${credits === 0 ? 'text-red-500' : 'text-blue-600'}`}>
                {credits ?? '--'}
              </span>
              <span className="pb-2 text-sm text-[var(--ink-2)]">分</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-2)]">
              每完成一次有效回答消耗 1 积分。AI 服务失败时会退回本次预留的积分。
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-black text-[var(--ink)]">积分规则</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-4">
                <p className="text-sm font-black text-blue-900">发问前检查</p>
                <p className="mt-2 text-xs leading-5 text-blue-800">余额为 0 时不会进入系统回答。</p>
              </div>
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm font-black text-sky-900">成功后消耗</p>
                <p className="mt-2 text-xs leading-5 text-sky-800">一次有效回答扣 1 分，便于理解成本。</p>
              </div>
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="text-sm font-black text-stone-900">失败会退回</p>
                <p className="mt-2 text-xs leading-5 text-stone-700">接口异常或无回复时不让用户承担损失。</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-gray-950">获取积分</h2>
              <p className="mt-1 text-sm text-gray-500">先接入可验收的补给入口，后续可替换成支付、邀请或任务系统。</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {SUPPLIES.map(item => (
              <button
                key={item.title}
                type="button"
                onClick={() => handleSupply(item.amount)}
                disabled={loadingAmount !== null}
                className="rounded-2xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
              >
                <p className="text-sm font-black text-gray-950">{item.title}</p>
                <p className="mt-3 text-3xl font-black text-blue-600">+{item.amount}</p>
                <p className="mt-3 text-xs leading-5 text-gray-500">{item.description}</p>
                <span className="mt-4 inline-flex rounded-full bg-blue-900 px-3 py-1.5 text-xs font-black text-white">
                  {loadingAmount === item.amount ? '补充中...' : '领取积分'}
                </span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
