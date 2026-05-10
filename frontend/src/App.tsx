import { useCallback, useState } from 'react';
import LoginPage from './pages/LoginPage';
import ExpertsPage from './pages/ExpertsPage';
import ChatPage from './pages/ChatPage';
import Toast from './components/Toast';
import { createConversation } from './services/api';
import { showToast } from './components/Toast';
import { getExpertDisplay } from './data/experts';

const LS_USER_ID = 'aibrain_user_id';
const LS_NICKNAME = 'aibrain_nickname';

type View =
  | { page: 'login' }
  | { page: 'experts' }
  | { page: 'chat'; conversationId: string; expertId: string; expertName: string };

function loadSession(): { userId: string; nickname: string } | null {
  const userId = localStorage.getItem(LS_USER_ID);
  const nickname = localStorage.getItem(LS_NICKNAME);
  return userId && nickname ? { userId, nickname } : null;
}

function saveSession(userId: string, nickname: string) {
  localStorage.setItem(LS_USER_ID, userId);
  localStorage.setItem(LS_NICKNAME, nickname);
}

function clearSession() {
  localStorage.removeItem(LS_USER_ID);
  localStorage.removeItem(LS_NICKNAME);
}

function App() {
  const session = loadSession();
  const [view, setView] = useState<View>(() => (session ? { page: 'experts' } : { page: 'login' }));
  const [userId, setUserId] = useState(() => session?.userId || '');
  const [nickname, setNickname] = useState(() => session?.nickname || '');

  const handleLogin = (uid: string, nick: string) => {
    saveSession(uid, nick);
    setUserId(uid);
    setNickname(nick);
    setView({ page: 'experts' });
  };

  const handleSelectExpert = async (expertId: string) => {
    try {
      const conv = await createConversation(userId, expertId);
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

  const handleLogout = () => {
    clearSession();
    setUserId('');
    setNickname('');
    setView({ page: 'login' });
  };

  return (
    <>
      <Toast />
      {view.page === 'chat' && (
        <ChatPage
          userId={userId}
          conversationId={view.conversationId}
          expertId={view.expertId}
          expertName={view.expertName}
          onBack={() => setView({ page: 'experts' })}
        />
      )}
      {view.page === 'experts' && (
        <ExpertsPage
          userId={userId}
          nickname={nickname}
          onSelectExpert={handleSelectExpert}
          onOpenConversation={handleOpenConversation}
          onLogout={handleLogout}
        />
      )}
      {view.page === 'login' && <LoginPage onLogin={handleLogin} />}
    </>
  );
}

export default App;
