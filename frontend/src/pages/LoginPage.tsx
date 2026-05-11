import { useEffect, useState } from 'react';
import { getWechatConfig, getWechatLoginUrl, quickLogin } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';

interface Props {
  onLogin: (userId: string, nickname: string, token: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [wechatEnabled, setWechatEnabled] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);

  useEffect(() => {
    getWechatConfig()
      .then(data => setWechatEnabled(Boolean(data.enabled)))
      .catch(() => setWechatEnabled(false));
  }, []);

  const handleWechatLogin = async () => {
    if (!wechatEnabled) {
      showToast('微信登录还没有配置 AppID 和 AppSecret。');
      return;
    }

    setWechatLoading(true);
    try {
      const data = await getWechatLoginUrl();
      const popup = window.open(data.url, 'wechatLogin', 'width=520,height=680,noopener=false');
      if (!popup) {
        window.location.href = data.url;
      }
    } catch {
      showToast('微信登录暂时不可用，请稍后再试。');
    } finally {
      setWechatLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = nickname.trim();
    if (!value) return;

    setLoading(true);
    try {
      const data = await quickLogin(value);
      onLogin(data.user_id, data.nickname, data.token);
    } catch {
      showToast('登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4efe4] px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl gap-6 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <section className="hidden h-full overflow-hidden rounded-[28px] border border-white/70 bg-white/55 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:block">
          <div className="flex h-full flex-col justify-between">
            <div>
              <p className="text-sm font-black text-blue-700">AI外脑</p>
              <h1 className="mt-4 max-w-xl text-6xl font-black leading-[1.05] text-stone-950">
                让 AI 像你的
                <br />
                专家团队一样工作。
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-600">
                微信登录后进入 AI 外脑、积分中心和专家对话。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-stone-950 px-4 py-4 text-white">
                <p className="text-sm font-black">先拆解</p>
                <p className="mt-2 text-xs text-white/70">识别场景和关键变量</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-4 text-stone-950 shadow-sm">
                <p className="text-sm font-black">再判断</p>
                <p className="mt-2 text-xs text-stone-500">匹配专家视角和路径</p>
              </div>
              <div className="rounded-2xl bg-blue-100 px-4 py-4 text-blue-950">
                <p className="text-sm font-black">再输出</p>
                <p className="mt-2 text-xs text-blue-700">结论 / 清单 / 下一步</p>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {['wangdingjun', 'zhangxuefeng', 'steve-jobs', 'luoxiang'].map(id => {
                const display = getExpertDisplay(id);
                return (
                  <div key={id} className="flex items-center gap-3 rounded-2xl bg-white/85 p-3 shadow-sm">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-blue-50">
                      <img src={display.avatar} alt={display.alias} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-stone-950">{display.alias}</p>
                      <p className="truncate text-xs text-stone-500">{display.shortTitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-[28px] border border-white/80 bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)] md:p-10" style={{ animation: 'fadeUp 0.5s ease both' }}>
            <div className="mb-8">
              <p className="text-sm font-black text-blue-700 md:hidden">AI外脑</p>
              <h2 className="mt-2 text-center text-2xl font-black text-gray-950 md:text-left md:text-3xl">
                登录 AI 外脑
              </h2>
              <p className="mt-3 text-center text-sm leading-6 text-gray-500 md:text-left">
                推荐使用微信扫码登录，同一微信身份只领取一次体验积分。
              </p>
            </div>

            <button
              type="button"
              onClick={handleWechatLogin}
              disabled={wechatLoading}
              className="w-full rounded-2xl bg-[#07c160] py-3.5 text-sm font-black text-white transition hover:bg-[#06ad56] disabled:opacity-50"
            >
              {wechatLoading ? '正在打开微信...' : '微信扫码登录'}
            </button>

            {!wechatEnabled && (
              <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-700">
                微信开放平台参数未配置，当前仍可用测试登录。
              </p>
            )}

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-black text-stone-400">测试入口</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-stone-500">
                  昵称
                </span>
                <input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="请输入测试昵称"
                  maxLength={50}
                  className="mb-5 w-full rounded-2xl border border-stone-300 px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-blue-500"
                  autoFocus
                />
              </label>
              <button
                type="submit"
                disabled={loading || !nickname.trim()}
                className="w-full rounded-2xl bg-stone-950 py-3.5 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-50"
              >
                {loading ? '进入中...' : '测试登录'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
