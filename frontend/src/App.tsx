import { useCallback, useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ExpertsPage from './pages/ExpertsPage';
import ChatPage from './pages/ChatPage';
import CreditsPage from './pages/CreditsPage';
import Toast from './components/Toast';
import { ApiError, createConversation } from './services/api';
import { showToast } from './components/toastStore';
import { getExpertDisplay } from './data/experts';

const LS_USER_ID = 'aibrain_user_id';
const LS_NICKNAME = 'aibrain_nickname';
const LS_TOKEN = 'aibrain_token';

type View =
  | { page: 'home' }
  | { page: 'login' }
  | { page: 'experts' }
  | { page: 'credits' }
  | { page: 'chat'; conversationId: string; expertId: string; expertName: string };

function loadSession(): { userId: string; nickname: string; token: string } | null {
  const userId = localStorage.getItem(LS_USER_ID);
  const nickname = localStorage.getItem(LS_NICKNAME);
  const token = localStorage.getItem(LS_TOKEN);
  return userId && nickname && token ? { userId, nickname, token } : null;
}

function saveSession(userId: string, nickname: string, token: string) {
  localStorage.setItem(LS_USER_ID, userId);
  localStorage.setItem(LS_NICKNAME, nickname);
  localStorage.setItem(LS_TOKEN, token);
}

function clearSession() {
  localStorage.removeItem(LS_USER_ID);
  localStorage.removeItem(LS_NICKNAME);
  localStorage.removeItem(LS_TOKEN);
}

function App() {
  const session = loadSession();
  const [view, setView] = useState<View>(() => (session ? { page: 'experts' } : { page: 'home' }));
  const [userId, setUserId] = useState(() => session?.userId || '');
  const [nickname, setNickname] = useState(() => session?.nickname || '');
  const [token, setToken] = useState(() => session?.token || '');
  const [hiddenExpertId, setHiddenExpertId] = useState(() => new URLSearchParams(window.location.search).get('hidden_expert') || '');

  const handleLogin = (uid: string, nick: string, tok: string) => {
    saveSession(uid, nick, tok);
    setUserId(uid);
    setNickname(nick);
    setToken(tok);
    setView({ page: 'experts' });
  };

  useEffect(() => {
    const handleWechatMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'aibrain:wechat-login') return;
      const payload = event.data.payload;
      if (payload?.user_id && payload?.nickname && payload?.token) {
        handleLogin(payload.user_id, payload.nickname, payload.token);
      }
    };

    window.addEventListener('message', handleWechatMessage);

    const params = new URLSearchParams(window.location.search);
    const rawWechatLogin = params.get('wechat_login');
    let loginTimer: number | undefined;
    if (rawWechatLogin) {
      const loginParams = new URLSearchParams(rawWechatLogin);
      const uid = loginParams.get('user_id');
      const nick = loginParams.get('nickname');
      const tok = loginParams.get('token');
      if (uid && nick && tok) {
        loginTimer = window.setTimeout(() => {
          handleLogin(uid, nick, tok);
          window.history.replaceState(null, '', window.location.pathname);
        }, 0);
      }
    }

    return () => {
      window.removeEventListener('message', handleWechatMessage);
      if (loginTimer) window.clearTimeout(loginTimer);
    };
  }, []);

  const handleOpenHome = useCallback(() => {
    setView({ page: 'home' });
  }, []);

  const handleSelectExpert = async (expertId: string) => {
    if (!token) {
      clearSession();
      setUserId('');
      setNickname('');
      setToken('');
      setView({ page: 'login' });
      showToast('请先登录后再进入智脑');
      return;
    }

    try {
      const conv = await createConversation(token, expertId);
      setView({
        page: 'chat',
        conversationId: conv.id,
        expertId,
        expertName: getExpertDisplay(expertId).alias,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setUserId('');
        setNickname('');
        setToken('');
        setView({ page: 'login' });
        showToast('登录已过期，请重新登录');
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        showToast('这个智脑还没有加载完成');
        return;
      }
      showToast('创建对话失败，请稍后重试');
    }
  };

  useEffect(() => {
    if (!token || !hiddenExpertId) return;
    if (!['songbai-xiansheng', 'anran-laoshi'].includes(hiddenExpertId)) return;

    let cancelled = false;
    void (async () => {
      try {
        const conv = await createConversation(token, hiddenExpertId);
        if (cancelled) return;
        setView({
          page: 'chat',
          conversationId: conv.id,
          expertId: hiddenExpertId,
          expertName: getExpertDisplay(hiddenExpertId).alias,
        });
        setHiddenExpertId('');
        const url = new URL(window.location.href);
        url.searchParams.delete('hidden_expert');
        window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      } catch {
        if (!cancelled) showToast('闅愯棌宸ヤ綔鍙板垱寤哄け璐ワ紝璇风‘璁ゅ悗绔凡鍔犺浇瀵瑰簲 persona');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hiddenExpertId, token]);

  const handleOpenCredits = useCallback(() => {
    setView({ page: userId ? 'credits' : 'login' });
  }, [userId]);

  const handleLogout = () => {
    clearSession();
    setUserId('');
    setNickname('');
    setToken('');
    setView({ page: 'login' });
  };

  return (
    <>
      <Toast />
      {view.page === 'chat' && (
        <ChatPage
          token={token}
          conversationId={view.conversationId}
          expertId={view.expertId}
          expertName={view.expertName}
          onBack={() => setView({ page: 'experts' })}
          onOpenCredits={handleOpenCredits}
          onOpenHome={handleOpenHome}
        />
      )}
      {view.page === 'home' && (
        <HomePage
          userId={userId}
          nickname={nickname}
          onOpenExperts={() => setView({ page: userId ? 'experts' : 'login' })}
          onOpenCredits={handleOpenCredits}
          onOpenRegister={() => setView({ page: 'login' })}
          onLogout={handleLogout}
          guest={!userId}
        />
      )}
      {view.page === 'experts' && (
        <ExpertsPage
          userId={userId}
          token={token}
          nickname={nickname}
          onSelectExpert={handleSelectExpert}
          onOpenCredits={handleOpenCredits}
          onOpenHome={handleOpenHome}
          onLogout={handleLogout}
        />
      )}
      {view.page === 'credits' && (
        <CreditsPage
          token={token}
          nickname={nickname}
          onBack={handleOpenHome}
        />
      )}
      {view.page === 'login' && <LoginPage onLogin={handleLogin} />}
    </>
  );
}

export default App;
