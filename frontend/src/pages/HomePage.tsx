import { useEffect } from 'react';
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

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries =>
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        }),
      { threshold: 0.12 },
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function HomePage({ userId, nickname, onOpenExperts, onOpenCredits, onOpenRegister, onLogout, guest }: Props) {
  useReveal();

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-stone-950">
      <NavBar userId={userId} nickname={nickname} onOpenHome={() => {}} onOpenExperts={onOpenExperts} onOpenCredits={onOpenCredits} onLogout={onLogout} />

      <section className="relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden bg-[#16130f] px-5 py-20 text-center text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(232,206,164,0.22),transparent_62%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(to_top,rgba(247,244,238,0.12),transparent)]" />

        <div className="relative mx-auto max-w-4xl">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d7b98d]" style={{ animation: 'fadeUp 0.6s ease both' }}>
            <span>AIBrain</span>
            <span className="mx-2 text-[#d7b98d]/40">/</span>
            <span>智脑</span>
            <span className="ml-1 text-[#d7b98d]/40">小助手</span>
          </p>
          <h1 className="text-[clamp(38px,7vw,74px)] font-medium leading-[1.16] text-white" style={{ animation: 'fadeUp 0.7s 0.1s ease both' }}>
            让 AI 像你的
            <br />
            <span className="text-[#e9d8bd]">硅基分身</span>
            <br />
            一样工作
          </h1>
          <p className="mx-auto mt-7 max-w-2xl whitespace-nowrap text-[15px] leading-7 text-white/62 md:text-[17px]" style={{ animation: 'fadeUp 0.7s 0.2s ease both' }}>
            把问题交代清楚  让智脑给出有用的判断
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animation: 'fadeUp 0.7s 0.3s ease both' }}>
            <button
              onClick={guest ? onOpenRegister : onOpenExperts}
              className="rounded-full bg-[#fffaf2] px-7 py-3 text-sm font-medium text-[#2f251d] transition hover:bg-white active:scale-[0.98]"
            >
              {guest ? '免费注册' : '进入智脑'}
            </button>
            <button
              onClick={onOpenExperts}
              className="rounded-full border border-white/18 bg-white/5 px-7 py-3 text-sm font-medium text-white/78 transition hover:border-white/34 hover:text-white active:scale-[0.98]"
            >
              看看智脑
            </button>
          </div>
        </div>

        <div className="absolute bottom-7 flex flex-col items-center gap-2 text-white/36" style={{ animation: 'fadeUp 1s 0.8s ease both' }}>
          <span className="text-[11px]">向下滚动</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce">
            <path d="M8 3v10M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      <section className="reveal border-y border-stone-200 bg-[#fffaf2] py-16">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a5a35]">持续完善中</p>
            <h2 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.01em] text-stone-950 md:text-[44px]">
              换一种想法 看清一个问题
            </h2>
            <p className="mt-4 text-[14px] leading-7 text-stone-500">
              现在先开放比较成熟的智脑，后面还会继续补充更多方向和更细的场景。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              { title: '不同思路', body: '每个智脑都有自己的判断方式，尽量保持清楚，不混在一起。' },
              { title: '材料先到位', body: '把背景、目标和限制说清楚，结果才更贴近实际。' },
              { title: '结果能落地', body: '回答尽量面向真实任务，而不止停留在泛泛建议。' },
            ].map(item => (
              <article key={item.title} className="rounded-[20px] border border-[#eadfce] bg-white px-5 py-5 shadow-[0_12px_30px_rgba(80,64,42,0.04)]">
                <h3 className="text-[16px] font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-3 text-[13px] leading-6 text-stone-500">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal bg-[#171411] py-22 text-white">
        <div className="mx-auto max-w-6xl px-5 py-2">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7b98d]">为什么选 AIBrain</p>
          <h2 className="max-w-2xl text-[34px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[52px]">
            把问题说清楚
            <br />
            让判断更可靠
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { stat: '多种', label: '不同智脑', desc: '写作、表达、经营、成长，不同事情可以交给不同智脑来想。' },
              { stat: '连续', label: '上下文延续', desc: '围绕同一件事持续推进，减少重复说明。' },
              { stat: '即时', label: '实时生成', desc: '内容边生成边呈现，便于及时调整方向。' },
            ].map(item => (
              <div key={item.label} className="reveal border-t border-white/12 pt-7">
                <p className="text-[38px] font-semibold text-white">{item.stat}</p>
                <p className="mt-2 text-[13px] font-semibold text-[#d7b98d]">{item.label}</p>
                <p className="mt-4 text-[13px] leading-6 text-white/52">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal border-y border-stone-200 bg-white py-22">
        <div className="mx-auto max-w-6xl px-5 py-2">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">工作方式</p>
          <h2 className="max-w-xl text-[34px] font-semibold leading-tight tracking-[-0.01em] text-stone-950 md:text-[52px]">
            少一些空转
            <br />
            多一些可用判断
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: '保留上下文', desc: '同一件事可以连续推进，不必每次从头解释。' },
              { step: '02', title: '减少空话', desc: '回答尽量围绕当前材料和目标展开。' },
              { step: '03', title: '方便沉淀', desc: '重要内容可以继续修改、整理和保存。' },
            ].map(item => (
              <div key={item.step} className="reveal">
                <p className="text-[11px] font-semibold text-stone-400">{item.step}</p>
                <p className="mt-4 text-[22px] font-semibold text-stone-950">{item.title}</p>
                <p className="mt-3 text-[13px] leading-6 text-stone-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="reveal bg-[#16130f] py-24 text-center text-white">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="text-[34px] font-semibold leading-tight tracking-[-0.01em] text-white md:text-[52px]">
            现在开始
            <br />
            免费体验
          </h2>
          <p className="mt-5 text-[14px] leading-7 text-white/52">
            注册即送体验积分，无需信用卡。
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={guest ? onOpenRegister : onOpenExperts}
              className="rounded-full bg-[#fffaf2] px-8 py-3 text-sm font-medium text-[#2f251d] transition hover:bg-white active:scale-[0.98]"
            >
              {guest ? '立即注册' : '进入智脑'}
            </button>
            {!guest && (
              <button
                onClick={onOpenCredits}
                className="rounded-full border border-white/18 bg-white/5 px-8 py-3 text-sm font-medium text-white/78 transition hover:border-white/34 hover:text-white active:scale-[0.98]"
              >
                积分中心
              </button>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200 bg-white py-7 text-center">
        <p className="text-[12px] text-stone-400">© 2026 AIBrain · 让 AI 像你的硅基分身一样工作</p>
      </footer>
    </div>
  );
}
