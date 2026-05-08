import { useState } from 'react';
import { quickLogin } from '../services/api';
import { showToast } from '../components/Toast';

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
      showToast('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-80">
        <h1 className="text-2xl font-bold text-center mb-6">AI外脑</h1>
        <p className="text-gray-500 text-sm text-center mb-4">输入昵称开始与专家对话</p>
        <input
          type="text"
          value={nickname}
          onChange={e => setNickname(e.target.value)}
          placeholder="请输入昵称"
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 rounded mb-4 focus:outline-none focus:border-blue-500"
          autoFocus
        />
        <button
          type="submit"
          disabled={loading || !nickname.trim()}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '登录中...' : '开始对话'}
        </button>
      </form>
    </div>
  );
}
