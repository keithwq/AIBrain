import { useState } from 'react';
import { quickLogin } from '../services/api';
import { showToast } from '../components/toastStore';

interface Props {
  onLogin: (userId: string, nickname: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;

    setLoading(true);
    try {
      const data = await quickLogin(value);
      onLogin(data.user_id, data.nickname);
    } catch {
      showToast('登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-3 text-center text-2xl font-black text-gray-950">专家咨询</h1>
        <p className="mb-6 text-center text-sm leading-6 text-gray-500">
          使用邮箱注册或登录，新用户可获得体验积分。
        </p>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="请输入邮箱"
          maxLength={50}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:border-emerald-600 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full rounded bg-emerald-800 py-2 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading ? '进入中...' : '进入首页'}
        </button>
      </form>
    </div>
  );
}
