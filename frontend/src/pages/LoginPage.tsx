import { useState } from 'react';
import { quickLogin } from '../services/api';
import { showToast } from '../components/toastStore';

interface Props {
  onLogin: (userId: string, nickname: string) => void;
}

export default function LoginPage({ onLogin }: Props) {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setLoading(true);
    try {
      const data = await quickLogin(nickname.trim());
      onLogin(data.user_id, data.nickname);
    } catch {
      showToast('登录失败，请重试。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-80 rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-950">AI外脑</h1>
        <p className="mb-4 text-center text-sm text-gray-500">输入昵称，开始与专家对话</p>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="请输入昵称"
          maxLength={50}
          className="mb-4 w-full rounded border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登录中...' : '开始对话'}
        </button>
      </form>
    </div>
  );
}
