import { useState, useCallback } from 'react';
import LoginPage from './pages/LoginPage';
import ExpertsPage from './pages/ExpertsPage';
import ChatPage from './pages/ChatPage';
import Toast from './components/Toast';
import { createConversation } from './services/api';

const LS_USER_ID = 'aibrain_user_id';
const LS_NICKNAME = 'aibrain_nickname';

type View = { page: 'login' } | { page: 'experts' } | { page: 'chat'; conversationId: string; expertId: string; expertName: string };

const EXPERT_NAMES: Record<string, string> = {
  'steve-jobs': '乔布斯·乔大爷',
  'zhangxuefeng': '张雪峰·冰山老师',
  'yemaozhong': '叶茂中·叶将军',
  'luoyonghao': '罗永浩·罗胖子',
  'mayun': '马云·太极老总',
  'masike': '马斯克·马斯克狂人',
  'luoxiang': '罗翔·罗翔老师',
  'fandeng': '樊登·樊老师',
};

function loadSession(): { userId: string; nickname: string } | null {
  const userId = localStorage.getItem(LS_USER_ID);
  const nickname = localStorage.getItem(LS_NICKNAME);
  if (userId && nickname) return { userId, nickname };
  return null;
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
  const [view, setView] = useState<View>(session ? { page: 'experts' } : { page: 'login' });
  const [userId, setUserId] = useState(session?.userId || '');
  const [nickname, setNickname] = useState(session?.nickname || '');

  const handleLogin = (uid: string, nick: string) => {
    saveSession(uid, nick);
    setUserId(uid);
    setNickname(nick);
    setView({ page: 'experts' });
  };

  const handleSelectExpert = async (expertId: string) => {
    const conv = await createConversation(userId, expertId);
    setView({ page: 'chat', conversationId: conv.id, expertId, expertName: EXPERT_NAMES[expertId] || expertId });
  };

  const handleOpenConversation = useCallback((conversationId: string, expertId: string) => {
    setView({ page: 'chat', conversationId, expertId, expertName: EXPERT_NAMES[expertId] || expertId });
  }, []);

  const handleLogout = () => {
    clearSession();
    setUserId('');
    setNickname('');
    setView({ page: 'login' });
  };

  if (view.page === 'chat') {
    return (
      <ChatPage
        userId={userId}
        conversationId={view.conversationId}
        expertId={view.expertId}
        expertName={view.expertName}
        onBack={() => setView({ page: 'experts' })}
      />
    );
  }

  if (view.page === 'experts') {
    return (
      <ExpertsPage
        userId={userId}
        nickname={nickname}
        onSelectExpert={handleSelectExpert}
        onOpenConversation={handleOpenConversation}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <>
      <Toast />
      <LoginPage onLogin={handleLogin} />
    </>
  );
}

export default App;
