import { useEffect, useState } from 'react';
import { ApiError, emailLogin, getWechatConfig, getWechatLoginUrl, passwordLogin, sendEmailCode } from '../services/api';
import { showToast } from '../components/toastStore';
import { getExpertDisplay } from '../data/experts';

interface Props {
  onLogin: (userId: string, nickname: string, token: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const [wechatEnabled, setWechatEnabled] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);

  useEffect(() => {
    getWechatConfig()
      .then(data => setWechatEnabled(Boolean(data.enabled)))
      .catch(() => setWechatEnabled(false));
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  const normalizedEmail = email.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const validCode = /^\d{6}$/.test(emailCode.trim());
  const canSendCode = validEmail && countdown === 0 && !codeLoading;
  const canEmailLogin = validEmail && validCode && !emailLoading;
  const canAccountLogin = username.trim() && password.trim() && !accountLoading;

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccountLogin) return;
    setAccountLoading(true);
    try {
      const data = await passwordLogin(username.trim(), password.trim());
      onLogin(data.user_id, data.nickname, data.token);
    } catch (err) {
      showToast(err instanceof ApiError && err.status === 429 ? '操作太频繁，请稍后再试。' : '账号或密码不正确。');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSendEmailCode = async () => {
    if (!canSendCode) return;
    setCodeLoading(true);
    try {
      const data = await sendEmailCode(normalizedEmail);
      setCountdown(60);
      showToast(data.dev_mode ? '验证码已生成，请查看后端服务日志。' : '验证码已发送，请查看邮箱。');
    } catch {
      showToast('验证码发送失败，请稍后再试。');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEmailLogin) return;

    setEmailLoading(true);
    try {
      const data = await emailLogin(normalizedEmail, emailCode.trim());
      onLogin(data.user_id, data.nickname, data.token);
    } catch {
      showToast('验证码错误或已过期，请重新获取。');
    } finally {
      setEmailLoading(false);
    }
  };

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
                先用预置账号登录试用，邮箱验证码登录也已经开放。
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

            <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {['wangdingjun', 'luoxiang', 'mayun', 'xuehuashi', 'li-meijin', 'thich-nhat-hanh'].map(id => {
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
                使用分配给你的账号密码登录，或使用邮箱验证码进入。
              </p>
            </div>

            <form onSubmit={handleAccountLogin} autoComplete="off">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-stone-500">
                  用户名
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="off"
                  name="aibrain-account-name"
                  className="mb-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-stone-500">
                  密码
                </span>
                <div className="mb-5 grid grid-cols-[1fr_44px] overflow-hidden rounded-2xl border border-stone-300 focus-within:border-blue-500">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    autoComplete="new-password"
                    name="aibrain-account-pass"
                    className="min-w-0 px-4 py-3 text-base outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    className="grid place-items-center border-l border-stone-300 bg-white text-stone-500 transition hover:bg-stone-50 hover:text-stone-900"
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 3l18 18" />
                        <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                        <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a18.1 18.1 0 0 1-4.17 5.39" />
                        <path d="M6.1 6.1C3.6 8.1 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 4.24-.87" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!canAccountLogin}
                className="w-full rounded-2xl bg-stone-950 py-3.5 text-sm font-black text-white transition hover:bg-stone-800 disabled:opacity-50"
              >
                {accountLoading ? '正在进入...' : '账号登录'}
              </button>
            </form>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-black text-stone-400">邮箱登录</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <form onSubmit={handleEmailSubmit}>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-stone-500">
                  邮箱
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="mb-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-wide text-stone-500">
                  验证码
                </span>
                <div className="mb-5 grid grid-cols-[1fr_118px] gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6 位数字"
                    autoComplete="one-time-code"
                    className="min-w-0 rounded-2xl border border-stone-300 px-4 py-3 text-base outline-none transition placeholder:text-stone-400 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSendEmailCode}
                    disabled={!canSendCode}
                    className="rounded-2xl border border-stone-300 bg-white px-3 text-sm font-black text-stone-900 transition hover:border-blue-500 disabled:opacity-50"
                  >
                    {codeLoading ? '发送中' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={!canEmailLogin}
                className="w-full rounded-2xl bg-blue-700 py-3.5 text-sm font-black text-white transition hover:bg-blue-600 disabled:opacity-50"
              >
                {emailLoading ? '正在进入...' : '邮箱登录'}
              </button>
            </form>

            {wechatEnabled && (
              <>
                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-stone-200" />
                  <span className="text-xs font-black text-stone-400">微信登录</span>
                  <div className="h-px flex-1 bg-stone-200" />
                </div>

                <button
                  type="button"
                  onClick={handleWechatLogin}
                  disabled={wechatLoading}
                  className="w-full rounded-2xl bg-[#07c160] py-3.5 text-sm font-black text-white transition hover:bg-[#06ad56] disabled:opacity-50"
                >
                  {wechatLoading ? '正在打开微信...' : '微信扫码登录'}
                </button>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
