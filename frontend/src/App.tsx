import { useCallback, useState } from 'react';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ExpertsPage from './pages/ExpertsPage';
import ChatPage from './pages/ChatPage';
import CreditsPage from './pages/CreditsPage';
import Toast from './components/Toast';
import { createConversation } from './services/api';
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
  const [view, setView] = useState<View>({ page: 'home' });
  const [userId, setUserId] = useState(() => session?.userId || '');
  const [nickname, setNickname] = useState(() => session?.nickname || '');
  const [token, setToken] = useState(() => session?.token || '');

  const handleLogin = (uid: string, nick: string, tok: string) => {
    saveSession(uid, nick, tok);
    setUserId(uid);
    setNickname(nick);
    setToken(tok);
    setView({ page: 'home' });
  };

  const handleOpenHome = useCallback(() => {
    setView({ page: 'home' });
  }, []);

  const handleSelectExpert = async (expertId: string) => {
    try {
      const conv = await createConversation(token, expertId);
      setView({
        page: 'chat',
        conversationId: conv.id,
        expertId,
        expertName: getExpertDisplay(expertId).alias,
      });
    } catch {
      showToast('创建对话失败，请重试');
    }
  };

  const handleOpenConversation = useCallback((conversationId: string, expertId: string) => {
    setView({
      page: 'chat',
      conversationId,
      expertId,
      expertName: getExpertDisplay(expertId).alias,
    });
  }, []);

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
          token={token}
          nickname={nickname}
          onSelectExpert={handleSelectExpert}
          onOpenConversation={handleOpenConversation}
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
