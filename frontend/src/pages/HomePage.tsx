import NavBar from '../components/NavBar';

interface Props {
  userId: string;
  nickname: string;
  onOpenExperts: () => void;
  onOpenCredits: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  guest: boolean;
}

export default function HomePage({ userId, nickname, onOpenExperts, onOpenCredits, onOpenRegister, onLogout, guest }: Props) {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-stone-950">
      <NavBar userId={userId} nickname={nickname} onOpenHome={() => {}} onOpenExperts={onOpenExperts} onOpenCredits={onOpenCredits} onLogout={onLogout} />

      <main className="flex min-h-[calc(100svh-56px)] flex-col items-center justify-center px-5">
        <p className="text-[11px] font-medium tracking-[0.12em] text-stone-400">AIBrain / 智脑</p>
        <h1 className="mt-4 text-center text-[clamp(22px,4vw,32px)] font-semibold leading-tight text-stone-950">
          把问题交代清楚，让智脑给出有用的判断
        </h1>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={guest ? onOpenRegister : onOpenExperts}
            className="rounded bg-[#2f251d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a3728]"
          >
            {guest ? '免费注册' : '进入智脑'}
          </button>
          {guest && (
            <button
              onClick={onOpenExperts}
              className="rounded border border-black/10 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:border-[#2f251d]/40 hover:bg-[#faf8f4]"
            >
              先看看
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
