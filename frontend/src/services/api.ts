const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api/v1';

export async function quickLogin(nickname: string) {
  const res = await fetch(`${BASE_URL}/auth/quick-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) throw new Error('login failed');
  return res.json();
}

export async function getExperts() {
  const res = await fetch(`${BASE_URL}/experts`);
  if (!res.ok) throw new Error('failed to load experts');
  return res.json();
}

export async function createConversation(userId: string, expertId: string, title?: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, expert_id: expertId, title }),
  });
  if (!res.ok) throw new Error('failed to create conversation');
  return res.json();
}

export async function renameConversation(conversationId: string, title: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('failed to rename conversation');
  return res.json();
}

export async function deleteConversation(conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('failed to delete conversation');
  return res.json();
}

export async function getConversation(conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`);
  if (!res.ok) throw new Error('failed to load conversation');
  return res.json();
}

export async function getConversations(userId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations?user_id=${userId}`);
  if (!res.ok) throw new Error('failed to load conversations');
  return res.json();
}

export async function getMessages(conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`);
  if (!res.ok) throw new Error('failed to load messages');
  return res.json();
}

export function sendMessageStream(
  conversationId: string,
  userId: string,
  content: string,
  onChunk: (text: string) => void,
  onDone: (messageId: string) => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages/stream?user_id=${encodeURIComponent(userId)}&content=${encodeURIComponent(content)}`, {
    signal: controller.signal,
  }).then(async response => {
    if (!response.ok) {
      if (response.status === 429) {
        onError('积分不足，当前不能继续提问。');
        return;
      }
      onError('请求失败，请稍后重试。');
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      onError('无法读取回复，请稍后重试。');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) onChunk(data.content);
            if (data.done) onDone(data.messageId || '');
            if (data.error) onError(data.error);
          } catch {
            // Ignore incomplete stream fragments until the next complete event arrives.
          }
        }
      }
    }
  }).catch(err => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return controller;
}

export async function getCredits(userId: string) {
  const res = await fetch(`${BASE_URL}/users/${userId}/credits`);
  if (!res.ok) throw new Error('failed to load credits');
  return res.json();
}
