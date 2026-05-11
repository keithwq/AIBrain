interface Props {
  userId: string;
  nickname: string;
  onOpenHome: () => void;
  onOpenExperts: () => void;
  onOpenCredits: () => void;
  onLogout: () => void;
}

export default function NavBar({ userId, nickname, onOpenHome, onOpenExperts, onOpenCredits, onLogout }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <button
          onClick={onOpenHome}
          className="text-sm font-black tracking-tight text-[var(--ink)] hover:opacity-70 transition-opacity"
        >
          AI外脑
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          <button
            onClick={onOpenExperts}
            className="text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            方法卡
          </button>
          <button
            onClick={onOpenCredits}
            className="text-sm font-medium text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
          >
            积分中心
          </button>
        </nav>

        <div className="flex items-center gap-3">
          {userId ? (
            <>
              <span className="hidden text-sm text-[var(--ink-2)] md:block">{nickname}</span>
              <button
                onClick={onLogout}
                className="rounded-full border border-black/10 px-4 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-black/5 transition-colors"
              >
                退出
              </button>
            </>
          ) : (
            <button
              onClick={onOpenExperts}
              className="rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-black text-white hover:opacity-80 transition-opacity"
            >
              登录
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
