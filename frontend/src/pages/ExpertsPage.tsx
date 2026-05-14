import { useEffect, useMemo, useState } from 'react';
import { getExperts, getCredits } from '../services/api';
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

interface Props {
  userId: string;
  token: string;
  nickname: string;
  onSelectExpert: (expertId: string) => void;
  onOpenCredits: () => void;
  onOpenHome: () => void;
  onLogout: () => void;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className || ''}`} />;
}

const EXPERT_PLACEHOLDER = Array(8).fill(null);
const ORDER_INDEX = new Map<string, number>(FEATURED_EXPERT_ORDER.map((id, index) => [id, index]));

export default function ExpertsPage({ userId, token, nickname, onSelectExpert, onOpenCredits, onOpenHome, onLogout }: Props) {
  const [experts, setExperts] = useState<Expert[] | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    getExperts(token).then((items: Expert[]) => {
      setExperts(items);
      setError(null);
    }).catch(() => {
      setError('加载智脑失败');
      showToast('加载智脑失败');
    });
    getCredits(token).then((data: { credits: number }) => setCredits(data.credits)).catch(() => {});
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
  const isCreditsExhausted = credits === 0;

  const handleSelectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId === selectedCategoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavBar userId={userId} nickname={nickname} onOpenHome={onOpenHome} onOpenExperts={() => {}} onOpenCredits={onOpenCredits} onLogout={onLogout} />

      <main className="mx-auto max-w-5xl space-y-8 p-6">
        {credits !== null && (
          <div className="flex items-center justify-between border-b border-black/8 pb-3">
            <span className="text-sm text-[var(--ink-2)]">剩余积分</span>
            <button
              onClick={onOpenCredits}
              className={`text-sm font-medium transition hover:underline ${credits === 0 ? 'text-red-500' : 'text-[#8a5a35]'}`}
            >
              {credits} 分
            </button>
          </div>
        )}
        {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {isCreditsExhausted && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-semibold">积分已用完，暂时不能开启新对话</p>
            <p className="mt-1 text-xs leading-5 text-red-700">历史记录仍可查看。补充积分后，智脑会自动恢复可点击。</p>
          </div>
        )}

        <section>
          <div className="mb-4 flex flex-wrap gap-2 border-b border-black/8 pb-4">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`rounded border px-3 py-1.5 text-sm font-medium transition ${
                !selectedCategory
                  ? 'border-[#2f251d] bg-[#2f251d] text-white'
                  : 'border-black/10 bg-white text-stone-700 hover:border-[#2f251d]/40 hover:bg-[#faf8f4]'
              }`}
            >
              全部
            </button>
            {groupedExperts.map(group => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectCategory(group.id)}
                className={`rounded border px-3 py-1.5 text-sm font-medium transition ${
                  selectedCategoryId === group.id
                    ? 'border-[#2f251d] bg-[#2f251d] text-white'
                    : 'border-black/10 bg-white text-stone-700 hover:border-[#2f251d]/40 hover:bg-[#faf8f4]'
                }`}
              >
                {group.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                  className={`group flex flex-col gap-3 rounded border p-4 text-left transition ${
                    !expert
                      ? 'border-black/10 bg-white'
                      : isCreditsExhausted
                        ? 'cursor-not-allowed border-black/10 bg-white opacity-60'
                        : 'border-black/10 bg-white hover:border-[#2f251d]/40 hover:bg-[#faf8f4]'
                  }`}
                >
                  {!expert ? (
                    <>
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                    </>
                  ) : (
                    <>
                      {category && (
                        <span className="inline-block w-fit rounded-sm bg-[#f3eadc] px-1.5 py-0.5 text-[11px] text-[#7a4c2c]">
                          {category.name}
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[#f3eadc]">
                          {avatar && <img src={avatar} alt={display?.alias || expert.alias} className="h-full w-full object-cover" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-950">{display?.alias || expert.alias}</p>
                          <p className="truncate text-xs text-gray-500">{display?.shortTitle || ''}</p>
                        </div>
                      </div>
                      <p className="text-xs leading-5 text-gray-600">{expert.tagline || expert.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {expert.expertise.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">{tag}</span>
                        ))}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {displayedExperts && displayedExperts.length === 0 && (
            <div className="rounded border border-[#eadfce] bg-[#fffaf2] px-5 py-6 text-sm leading-6 text-[#7a4c2c]">
              <p className="font-semibold">当前暂无可用智脑。</p>
              <p className="mt-1">历史对话仍可查看；新智脑会在资料补足并通过标准后显示。</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
