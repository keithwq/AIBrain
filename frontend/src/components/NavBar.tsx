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
    <header className="sticky top-0 z-50 border-b border-stone-200/70 bg-[#fffaf2]/86 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-2.5">
        <button onClick={onOpenHome} className="flex items-baseline gap-2 text-stone-950 transition hover:text-[#8a5a35]">
          <span className="text-base font-semibold">AIBrain</span>
          <span className="hidden text-xs font-medium text-stone-500 sm:inline">
            智脑<span className="ml-1 text-stone-300">小助手</span>
          </span>
        </button>

        <nav className="hidden items-center gap-2 md:flex">
          <button onClick={onOpenExperts} className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white hover:text-stone-950">
            智脑
          </button>
          <button onClick={onOpenCredits} className="rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white hover:text-stone-950">
            积分
          </button>
        </nav>

        <div className="flex items-center gap-2">
          {userId ? (
            <>
              <span className="hidden max-w-32 truncate text-xs text-stone-500 md:block">{nickname}</span>
              <button onClick={onLogout} className="hidden rounded-full border border-stone-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-white md:block">
                退出
              </button>
            </>
          ) : (
            <button onClick={onOpenExperts} className="hidden rounded-full bg-[#2f251d] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a3728] md:block">
              登录
            </button>
          )}

          <button
            onClick={() => setMenuOpen(v => !v)}
            className="grid h-8 w-8 place-items-center rounded-full border border-stone-200 bg-white/80 text-stone-700 transition hover:bg-white md:hidden"
            aria-label="菜单"
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200/70 bg-[#fffaf2]/95 px-4 py-3 md:hidden">
          <nav className="grid gap-1">
            <button onClick={() => { onOpenExperts(); setMenuOpen(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-white">
              智脑
            </button>
            <button onClick={() => { onOpenCredits(); setMenuOpen(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-white">
              积分
            </button>
            {nickname && <p className="px-3 py-2 text-xs text-stone-500">{nickname}</p>}
            {userId && (
              <button onClick={() => { onLogout(); setMenuOpen(false); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                退出登录
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
