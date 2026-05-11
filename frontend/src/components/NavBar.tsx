import { useState } from 'react';

interface Props {
  userId: string;
  nickname: string;
  onOpenHome: () => void;
  onOpenExperts: () => void;
  onOpenCredits: () => void;
  onLogout: () => void;
}

export default function NavBar({ userId, nickname, onOpenHome, onOpenExperts, onOpenCredits, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <button
          onClick={onOpenHome}
          className="text-sm font-black tracking-tight text-[var(--ink)] hover:opacity-70 transition-opacity"
        >
          AI外脑
        </button>

        {/* Desktop nav */}
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
                className="hidden rounded-full border border-black/10 px-4 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-black/5 transition-colors md:block"
              >
                退出
              </button>
            </>
          ) : (
            <button
              onClick={onOpenExperts}
              className="hidden rounded-full bg-[var(--ink)] px-4 py-1.5 text-xs font-black text-white hover:opacity-80 transition-opacity md:block"
            >
              登录
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[var(--ink)] hover:bg-black/5 transition-colors md:hidden"
            aria-label="菜单"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="border-t border-black/5 bg-white/95 px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => { onOpenExperts(); setMenuOpen(false); }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--ink-2)] hover:bg-black/5 transition-colors"
            >
              方法卡
            </button>
            <button
              onClick={() => { onOpenCredits(); setMenuOpen(false); }}
              className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--ink-2)] hover:bg-black/5 transition-colors"
            >
              积分中心
            </button>
            {nickname && (
              <p className="mt-2 border-t border-black/5 px-3 pt-3 text-xs text-[var(--ink-2)]">{nickname}</p>
            )}
            {userId && (
              <button
                onClick={() => { onLogout(); setMenuOpen(false); }}
                className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                退出登录
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
