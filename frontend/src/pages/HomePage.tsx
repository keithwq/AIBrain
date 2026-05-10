import { useEffect, useMemo, useState } from 'react';
import { getCredits } from '../services/api';
import { getExpertDisplay, FEATURED_EXPERT_ORDER } from '../data/experts';

interface Props {
  userId: string;
  nickname: string;
  guest: boolean;
  onOpenExperts: () => void;
  onOpenCredits: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
}

interface HeroExpert {
  id: string;
  alias: string;
  avatar: string;
  shortTitle: string;
}

interface SceneCard {
  title: string;
  subtitle: string;
  result: string;
}

interface WorkbenchField {
  label: string;
  value: string;
}

interface DeliverableItem {
  title: string;
  body: string;
}

export default function HomePage({ userId, nickname, guest, onOpenExperts, onOpenCredits, onOpenRegister, onLogout }: Props) {
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (guest || !userId) return;
    getCredits(userId).then((data: { credits: number }) => setCredits(data.credits)).catch(() => {});
  }, [guest, userId]);

  const heroExperts = useMemo<HeroExpert[]>(() => {
    return FEATURED_EXPERT_ORDER.slice(0, 4).map(id => {
      const display = getExpertDisplay(id);
      return {
        id,
        alias: display.alias,
        avatar: display.avatar,
        shortTitle: display.shortTitle,
      };
    });
  }, []);

  const scenes: SceneCard[] = [
    { title: '初中语文老师', subtitle: '作文课怎么讲、怎么批、怎么续班', result: '课堂流程 / 讲义要点 / 家长话术' },
    { title: '律师', subtitle: '合同、证据、风险边界和沟通策略', result: '风险分级 / 证据清单 / 沟通话术' },
    { title: '财务', subtitle: '流水、成本、口径、异常和处理动作', result: '异常判断 / 口径梳理 / 处理方案' },
    { title: '商业增长', subtitle: '用户、渠道、转化、现金流和落地动作', result: '定位方案 / 增长路径 / 行动清单' },
  ];
  const workbenchFields: WorkbenchField[] = [
    { label: '身份', value: '初中语文老师' },
    { label: '任务', value: '作文公开课' },
    { label: '目标', value: '让学生会写开头，让家长觉得课有价值' },
    { label: '需要成品', value: '课堂流程、讲义要点、板书、家长话术' },
  ];
  const deliverables: DeliverableItem[] = [
    { title: '课堂流程', body: '导入 5 分钟 / 方法讲解 12 分钟 / 学生练笔 15 分钟 / 展示点评 8 分钟' },
    { title: '讲义要点', body: '开头三法：画面开头、冲突开头、追问开头。每种配一个学生可模仿例句。' },
    { title: '家长话术', body: '今天不是教孩子背范文，而是让孩子掌握一种能迁移的开头方法。' },
  ];

  return (
    <div className="min-h-screen bg-[#f3f5f7] text-stone-950">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/65 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4 lg:px-10">
          <button onClick={onOpenExperts} className="text-lg font-semibold text-stone-950">
            AI外脑
          </button>
          <div className="flex items-center gap-2">
            {guest ? (
              <button onClick={onOpenRegister} className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                自助注册
              </button>
            ) : (
              <>
                <button onClick={onOpenCredits} className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-800">
                  {credits ?? '--'} 积分
                </button>
                <button onClick={onLogout} className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600">
                  退出
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(109,168,255,0.28),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(164,116,255,0.18),_transparent_32%),linear-gradient(180deg,#f7f9fc_0%,#eef3f7_100%)]" />
          <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-14 lg:min-h-[calc(100vh-72px)] lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10 lg:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-medium tracking-[0.18em] text-sky-700">{guest ? '欢迎访问' : nickname}</p>
              <h1 className="mt-6 text-5xl font-semibold leading-[1.02] text-stone-950 sm:text-6xl lg:text-[5.6rem]">
                让 AI 外脑
                <br />
                成为你的硅基分身
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 lg:text-xl">
                普通 AI 给思路，AI 外脑直接给成品
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <button onClick={onOpenExperts} className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white shadow-sm">
                  进入 AI 外脑
                </button>
                <button onClick={onOpenRegister} className="rounded-full bg-white/85 px-6 py-3 text-sm font-semibold text-stone-900 shadow-sm">
                  自助注册
                </button>
              </div>

              <div className="mt-12 flex flex-wrap gap-3">
                {['问一句', '出成品', '发给团队', '立即可用'].map(label => (
                  <span key={label} className="rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-stone-700 shadow-sm">
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2.2rem] border border-white/70 bg-white/72 p-3 shadow-[0_28px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                <div className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#f8fafc]">
                  <div className="flex h-12 items-center justify-between border-b border-stone-200 bg-white px-4">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                    </div>
                    <div className="rounded-full bg-stone-100 px-4 py-1.5 text-xs font-medium text-stone-600">
                      作文公开课工作台
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">已生成</span>
                  </div>

                  <div className="grid min-h-[520px] lg:grid-cols-[250px_1fr]">
                    <aside className="border-b border-stone-200 bg-white p-5 lg:border-b-0 lg:border-r">
                      <p className="text-xs font-medium tracking-[0.16em] text-sky-700">任务单</p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-950">初中作文公开课</h3>
                      <div className="mt-5 space-y-3">
                        {workbenchFields.map(field => (
                          <div key={field.label} className="rounded-2xl bg-stone-50 px-4 py-3">
                            <p className="text-xs font-medium text-stone-500">{field.label}</p>
                            <p className="mt-1 text-sm font-semibold leading-5 text-stone-950">{field.value}</p>
                          </div>
                        ))}
                      </div>
                      <button onClick={onOpenExperts} className="mt-5 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white">
                        生成一份成品
                      </button>
                    </aside>

                    <section className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium tracking-[0.16em] text-sky-700">生成成品</p>
                          <h3 className="mt-2 text-2xl font-semibold text-stone-950">可以直接交给教研组</h3>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm">3 个模块</span>
                      </div>

                      <div className="mt-5 grid gap-4">
                        {deliverables.map(item => (
                          <div key={item.title} className="rounded-[1.4rem] border border-stone-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-base font-semibold text-stone-950">{item.title}</p>
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">可复制</span>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-stone-600">{item.body}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 rounded-[1.4rem] bg-emerald-50 p-5 text-emerald-950">
                        <p className="text-sm font-semibold">最终交付</p>
                        <p className="mt-2 text-sm leading-6">公开课流程、学生讲义、板书结构、家长转化话术，已经整理成一套可直接使用的教研材料。</p>
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-sky-700">典型场景</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-950 lg:text-4xl">一问，就拿到能交付的成品</h2>
            </div>
            <button onClick={onOpenExperts} className="text-sm font-semibold text-sky-700">
              看更多成品
            </button>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {scenes.map(scene => (
              <div key={scene.title} className="rounded-[1.75rem] border border-black/5 bg-white p-6 shadow-sm">
                <p className="text-lg font-semibold text-stone-950">{scene.title}</p>
                <p className="mt-3 text-sm leading-6 text-stone-600">{scene.subtitle}</p>
                <div className="mt-8 border-t border-black/5 pt-4">
                  <p className="text-xs font-medium text-sky-700">成品</p>
                  <p className="mt-2 text-sm font-semibold text-stone-950">{scene.result}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-black/5 bg-white">
          <div className="mx-auto max-w-[1440px] px-6 py-16 lg:px-10">
            <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium tracking-[0.18em] text-sky-700">成品入口</p>
              <h2 className="mt-3 text-3xl font-semibold text-stone-950 lg:text-4xl">每个任务都有自己的成品入口</h2>
            </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {heroExperts.map(expert => {
                const display = getExpertDisplay(expert.id);
                return (
                  <button
                    key={expert.id}
                    onClick={onOpenExperts}
                    className="flex items-center gap-4 rounded-[1.5rem] border border-black/5 bg-[#f8fafc] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-stone-100">
                      <img src={display.avatar} alt={display.alias} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-stone-950">{display.alias}</p>
                      <p className="mt-1 truncate text-sm text-stone-500">{display.shortTitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-white/70 bg-[#eef3f7]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,_rgba(56,189,248,0.22),_transparent_34%),radial-gradient(circle_at_82%_18%,_rgba(132,204,22,0.16),_transparent_28%)]" />
          <div className="relative mx-auto grid max-w-[1440px] gap-10 px-6 py-18 lg:grid-cols-[1fr_430px] lg:items-center lg:px-10 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.2em] text-sky-700">CONTACT</p>
              <h2 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl lg:text-6xl">
                把你的经验，
                <br />
                变成一套能交付的 AI 工作台
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
                课程、咨询、行业方法、私域服务，都可以沉淀成可复制、可销售、可持续迭代的成品系统。
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                <a href="tel:13032531078" className="group rounded-[1.65rem] border border-white/80 bg-white/78 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                  <p className="text-xs font-semibold tracking-[0.14em] text-sky-700">PHONE</p>
                  <p className="mt-3 text-2xl font-semibold text-stone-950">130 3253 1078</p>
                  <p className="mt-2 text-sm text-stone-500">电话沟通，快速确认合作方向</p>
                </a>
                <a href="mailto:448121288@qq.com" className="group rounded-[1.65rem] border border-white/80 bg-white/78 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                  <p className="text-xs font-semibold tracking-[0.14em] text-sky-700">EMAIL</p>
                  <p className="mt-3 break-all text-2xl font-semibold text-stone-950">448121288@qq.com</p>
                  <p className="mt-2 text-sm text-stone-500">发送资料、需求和合作方案</p>
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {['个人 AI 分身', '行业工作台', '课程产品化', '定制服务', '私域交付'].map(item => (
                  <span key={item} className="rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[2.25rem] border border-white/80 bg-white/78 p-4 shadow-[0_30px_100px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <div className="rounded-[1.8rem] bg-gradient-to-b from-[#f8fbff] to-white p-5">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-5">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.18em] text-sky-700">WECHAT</p>
                    <p className="mt-2 text-2xl font-semibold text-stone-950">虎虎虎</p>
                    <p className="mt-1 text-sm text-stone-500">江苏 苏州</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-950 text-xl text-white">
                    ✦
                  </div>
                </div>
                <div className="mt-6 rounded-[1.6rem] border border-stone-100 bg-white p-4 shadow-inner">
                  <img
                    src="/contact/wechat-qr.jpg"
                    alt="微信二维码"
                    className="aspect-square w-full rounded-[1.25rem] object-contain"
                  />
                </div>
                <div className="mt-5 rounded-[1.35rem] bg-stone-950 px-5 py-4 text-center text-white">
                  <p className="text-base font-semibold">扫码添加微信</p>
                  <p className="mt-1 text-sm text-white/70">聊 AI 工作台、成品交付和定制服务</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
