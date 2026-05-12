import { useEffect } from 'react';
import { getExpertDisplay } from '../data/experts';
import NavBar from '../components/NavBar';

interface Props {
  userId: string; nickname: string;
  onOpenExperts: () => void; onOpenCredits: () => void;
  onOpenRegister: () => void; onLogout: () => void;
  guest: boolean;
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.12 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const SHOWCASE_IDS: string[] = [];

export default function HomePage({ userId, nickname, onOpenExperts, onOpenCredits, onOpenRegister, onLogout, guest }: Props) {
  useReveal();

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <NavBar userId={userId} nickname={nickname} onOpenHome={() => {}} onOpenExperts={onOpenExperts} onOpenCredits={onOpenCredits} onLogout={onLogout} />

      {/* Hero */}
      <section className="relative flex min-h-[92svh] flex-col items-center justify-center overflow-hidden bg-[#0a0a0a] px-6 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
        <p className="mb-6 text-xs font-black uppercase tracking-[0.2em] text-blue-400" style={{ animation: 'fadeUp 0.6s ease both' }}>AI 外脑</p>
        <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-white md:text-7xl" style={{ animation: 'fadeUp 0.7s 0.1s ease both' }}>
          让 AI 像你的<br /><span className="text-blue-400">硅基分身</span><br />一样工作。
        </h1>
        <p className="mt-8 max-w-lg text-base leading-7 text-white/50 md:text-lg" style={{ animation: 'fadeUp 0.7s 0.2s ease both' }}>
          选择一张方法卡，填入你的场景，获得可直接交付的结论、清单和下一步行动。
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4" style={{ animation: 'fadeUp 0.7s 0.3s ease both' }}>
          <button onClick={guest ? onOpenRegister : onOpenExperts} className="rounded-full bg-white px-8 py-3.5 text-sm font-black text-[#0a0a0a] transition hover:bg-white/90 active:scale-95">
            {guest ? '免费注册' : '进入外脑'}
          </button>
          <button onClick={onOpenExperts} className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-black text-white/80 transition hover:border-white/40 hover:text-white active:scale-95">
            浏览方法卡
          </button>
        </div>
        <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-30" style={{ animation: 'fadeUp 1s 0.8s ease both' }}>
          <span className="text-xs text-white">向下滚动</span>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="animate-bounce">
            <path d="M8 3v10M3 9l5 5 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </section>

      {/* Expert strip */}
      <section className="reveal border-b border-black/5 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-600">专家库维护</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-[var(--ink)] md:text-4xl">
              专家正在补蒸馏。
            </h2>
            <p className="mt-4 text-sm leading-6 text-[var(--ink-2)]">
              未达到 5000 行 persona 标准的专家暂不开放，避免半成品方法卡影响判断质量。
            </p>
          </div>
          {SHOWCASE_IDS.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {SHOWCASE_IDS.map(id => {
                const d = getExpertDisplay(id);
                return (
                  <button key={id} onClick={onOpenExperts} className="group flex min-h-48 flex-col items-center rounded-[24px] border border-black/5 bg-[#f8fafc] p-5 text-center shadow-sm transition hover:-translate-y-1 hover:bg-white hover:shadow-md">
                    <div className="h-20 w-20 overflow-hidden rounded-3xl bg-white shadow-sm ring-2 ring-transparent transition group-hover:ring-blue-400">
                      <img src={d.avatar} alt={d.alias} className="h-full w-full object-cover" />
                    </div>
                    <p className="mt-4 text-base font-black text-[var(--ink)]">{d.alias}</p>
                    <p className="mt-1 text-xs font-black text-blue-600">{d.shortTitle}</p>
                    <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--ink-2)]">{d.cardIntro}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-6 py-7 text-center text-sm leading-6 text-amber-900">
              <p className="font-black">当前专家库正在补蒸馏，未达到 5000 行标准的专家已全部下架。</p>
              <p className="mt-1">补足 persona 深度后，专家卡片会重新开放。</p>
            </div>
          )}
        </div>
      </section>

      {/* Feature stats — dark */}
      <section className="reveal bg-[#0f0f0f] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-blue-400">为什么选 AI 外脑</p>
          <h2 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">结构化输入，<br />可交付输出。</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { stat: '0', label: '当前可用专家', desc: '所有低于 5000 行 persona 标准的专家已临时下架，补足后再开放。' },
              { stat: '1分', label: '每次调用', desc: '透明计费，一次有效回答消耗 1 积分，失败自动退回，不让你承担损失。' },
              { stat: '即时', label: '流式输出', desc: '回答实时流式呈现，不需要等待，像和真人专家对话一样自然。' },
            ].map(f => (
              <div key={f.stat} className="reveal border-t border-white/10 pt-8">
                <p className="text-5xl font-black text-white">{f.stat}</p>
                <p className="mt-2 text-sm font-black text-blue-400">{f.label}</p>
                <p className="mt-4 text-sm leading-6 text-white/50">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works — light */}
      <section className="reveal py-24">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-[var(--ink-2)]">使用流程</p>
          <h2 className="max-w-xl text-4xl font-black leading-tight tracking-tight text-[var(--ink)] md:text-5xl">三步完成<br />一次专家调用。</h2>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              { step: '01', title: '先拆解', desc: '识别你的场景和关键变量，选择最匹配的专家方法卡。' },
              { step: '02', title: '再判断', desc: '填入结构化输入面板，让 AI 匹配最优模型和路径。' },
              { step: '03', title: '再输出', desc: '获得结论、清单或下一步行动，可直接交付使用。' },
            ].map(s => (
              <div key={s.step} className="reveal">
                <p className="text-xs font-black text-[var(--ink-2)]">{s.step}</p>
                <p className="mt-4 text-2xl font-black text-[var(--ink)]">{s.title}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA — dark */}
      <section className="reveal bg-[#0a0a0a] py-28 text-center">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl">
            现在开始，<br />免费体验。
          </h2>
          <p className="mt-6 text-base leading-7 text-white/50">注册即送体验积分，无需信用卡。</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <button onClick={guest ? onOpenRegister : onOpenExperts} className="rounded-full bg-white px-10 py-4 text-sm font-black text-[#0a0a0a] transition hover:bg-white/90 active:scale-95">
              {guest ? '立即注册' : '进入外脑'}
            </button>
            {!guest && (
              <button onClick={onOpenCredits} className="rounded-full border border-white/20 px-10 py-4 text-sm font-black text-white/80 transition hover:border-white/40 hover:text-white active:scale-95">
                积分中心
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/5 bg-white py-8 text-center">
        <p className="text-xs text-[var(--ink-2)]">© 2025 AI外脑 · 让 AI 像你的硅基分身一样工作</p>
      </footer>
    </div>
  );
}
