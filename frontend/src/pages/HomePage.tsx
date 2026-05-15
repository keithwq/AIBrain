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
        <p className="text-[11px] font-medium tracking-[0.12em] text-stone-400">AIBrain</p>
        <h1 className="mt-4 text-center text-[clamp(22px,4vw,32px)] font-semibold leading-tight text-stone-950">
          让思考成为作品
        </h1>
        <p className="mt-3 max-w-[520px] text-center text-sm leading-6 text-stone-500">
          汇集专业判断的 AI 专家矩阵
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={guest ? onOpenRegister : onOpenExperts}
            className="rounded bg-[#2f251d] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#4a3728]"
          >
            打开新世界
          </button>
        </div>
      </main>
    </div>
  );
}
