import { useEffect, useState } from 'react';
import { ApiError, emailLogin, getWechatConfig, getWechatLoginUrl, passwordLogin, sendEmailCode } from '../services/api';
import { showToast } from '../components/toastStore';

interface Props {
  onLogin: (userId: string, nickname: string, token: string) => void;
}

type LoginMode = 'code' | 'password' | 'qr';

export default function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<LoginMode>('code');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);

  const [contact, setContact] = useState('');
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

  const normalizedContact = contact.trim().toLowerCase();
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedContact);
  const validPhone = /^1\d{10}$/.test(contact.trim());
  const validCode = /^\d{6}$/.test(emailCode.trim());
  const canSendCode = (validEmail || validPhone) && countdown === 0 && !codeLoading;
  const canCodeLogin = (validEmail || validPhone) && validCode && !emailLoading;
  const canAccountLogin = username.trim() && password.trim() && !accountLoading;

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccountLogin) return;
    setAccountLoading(true);
    try {
      const data = await passwordLogin(username.trim(), password.trim());
      onLogin(data.user_id, data.nickname, data.token);
    } catch (err) {
      showToast(err instanceof ApiError && err.status === 429 ? '操作太频繁 请稍后再试' : '账号或密码不正确');
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!canSendCode) return;
    if (validPhone) {
      showToast('手机验证码暂未开通');
      return;
    }

    setCodeLoading(true);
    try {
      const data = await sendEmailCode(normalizedContact);
      setCountdown(60);
      showToast(data.dev_mode ? '验证码已生成 请查看服务日志' : '验证码已发送 请查看邮箱');
    } catch {
      showToast('验证码发送失败 请稍后再试');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCodeLogin) return;
    if (validPhone) {
      showToast('手机验证码暂未开通');
      return;
    }

    setEmailLoading(true);
    try {
      const data = await emailLogin(normalizedContact, emailCode.trim());
      onLogin(data.user_id, data.nickname, data.token);
    } catch {
      showToast('验证码错误或已过期 请重新获取');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    if (!wechatEnabled) {
      showToast('扫码登录暂未配置');
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
      showToast('扫码登录暂时不可用 请稍后再试');
    } finally {
      setWechatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-stone-950">
      <main className="flex min-h-screen items-center justify-center px-4 py-8">
        <section className="w-full max-w-[392px]">
          <div className="mb-6 text-center">
            <p className="text-[13px] font-semibold text-stone-950">
              AIBrain
              <span className="ml-2 text-[12px] font-medium text-stone-500">智脑</span>
              <span className="ml-1 text-[12px] font-medium text-stone-300">小助手</span>
            </p>
            <h1 className="mt-8 text-[24px] font-semibold leading-tight text-stone-950">登录</h1>
          </div>

          <div className="rounded-md border border-black/10 bg-white p-4">
            <div className="mb-4 grid grid-cols-3 rounded bg-[#f1eadf] p-1">
              {[
                { id: 'code', label: '验证码' },
                { id: 'password', label: '密码' },
                { id: 'qr', label: '扫码' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMode(item.id as LoginMode)}
                  className={`rounded px-2 py-2 text-[13px] font-semibold transition ${
                    mode === item.id ? 'border border-black/10 bg-white text-stone-950' : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {mode === 'code' && (
              <form onSubmit={handleCodeSubmit}>
                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-stone-500">手机或邮箱</span>
                  <input
                    type="text"
                    value={contact}
                    onChange={e => setContact(e.target.value)}
                    placeholder="请输入手机或邮箱"
                    autoComplete="email"
                    className="mb-4 w-full rounded border border-stone-200 bg-white px-3 py-2.5 text-[14px] outline-none transition placeholder:text-stone-300 focus:border-[#8a5a35]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-stone-500">验证码</span>
                  <div className="mb-4 grid grid-cols-[1fr_108px] gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={emailCode}
                      onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 位数字"
                      autoComplete="one-time-code"
                      className="min-w-0 rounded border border-stone-200 bg-white px-3 py-2.5 text-[14px] outline-none transition placeholder:text-stone-300 focus:border-[#8a5a35]"
                    />
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={!canSendCode}
                      className="rounded border border-stone-200 bg-white px-2 text-[13px] font-semibold text-stone-700 transition hover:border-[#8a5a35] disabled:opacity-40"
                    >
                      {codeLoading ? '发送中' : countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={!canCodeLogin}
                  className="w-full rounded bg-[#2f251d] py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40"
                >
                  {emailLoading ? '正在进入' : '登录 / 注册'}
                </button>
              </form>
            )}

            {mode === 'password' && (
              <form onSubmit={handleAccountLogin} autoComplete="off">
                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-stone-500">用户名或账号</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="请输入用户名或账号"
                    autoComplete="username"
                    name="aibrain-account-name"
                    className="mb-4 w-full rounded border border-stone-200 bg-white px-3 py-2.5 text-[14px] outline-none transition placeholder:text-stone-300 focus:border-[#8a5a35]"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[12px] font-semibold text-stone-500">密码</span>
                  <div className="mb-4 grid grid-cols-[1fr_42px] overflow-hidden rounded border border-stone-200 bg-white focus-within:border-[#8a5a35]">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="请输入密码"
                      autoComplete="current-password"
                      name="aibrain-account-pass"
                      className="min-w-0 bg-transparent px-3 py-2.5 text-[14px] outline-none placeholder:text-stone-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(value => !value)}
                      aria-label={showPassword ? '隐藏密码' : '显示密码'}
                      className="grid place-items-center border-l border-stone-200 text-stone-400 transition hover:bg-stone-50 hover:text-stone-700"
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.58 10.58A2 2 0 0 0 13.42 13.42" />
                          <path d="M9.88 5.08A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a18.1 18.1 0 0 1-4.17 5.39" />
                          <path d="M6.1 6.1C3.6 8.1 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 4.24-.87" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
                  className="w-full rounded bg-[#2f251d] py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#4a3728] disabled:opacity-40"
                >
                  {accountLoading ? '正在进入' : '登录 / 注册'}
                </button>
              </form>
            )}

            {mode === 'qr' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleWechatLogin}
                  disabled={wechatLoading}
                  className="grid aspect-square w-full place-items-center rounded-md border border-stone-200 bg-white text-stone-400 transition hover:border-[#8a5a35] disabled:opacity-40"
                  aria-label="扫码登录"
                >
                  <svg viewBox="0 0 24 24" className="h-20 w-20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" />
                    <path d="M14 14h2v2h-2zM18 14h2v6h-4v-2h2zM14 18h2v2h-2z" />
                  </svg>
                </button>
                <p className="mt-3 text-[13px] text-stone-500">{wechatLoading ? '正在打开扫码窗口' : '使用微信扫码登录'}</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
