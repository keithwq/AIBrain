const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', 'x-auth-token': token };
}

export async function quickLogin(nickname: string) {
  const res = await fetch(`${BASE_URL}/auth/quick-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) throw new Error('login failed');
  return res.json();
}

export async function passwordLogin(nickname: string, password: string) {
  const res = await fetch(`${BASE_URL}/auth/password-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, password }),
  });
  if (!res.ok) throw new ApiError(res.status, 'password login failed');
  return res.json();
}

export async function sendEmailCode(email: string) {
  const res = await fetch(`${BASE_URL}/auth/email/send-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error('failed to send email code');
  return res.json();
}

export async function emailLogin(email: string, code: string) {
  const res = await fetch(`${BASE_URL}/auth/email/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  if (!res.ok) throw new Error('email login failed');
  return res.json();
}

export async function getWechatConfig() {
  const res = await fetch(`${BASE_URL}/auth/wechat/config`);
  if (!res.ok) throw new Error('failed to load wechat config');
  return res.json();
}

export async function getWechatLoginUrl() {
  const res = await fetch(`${BASE_URL}/auth/wechat/login-url`);
  if (!res.ok) throw new Error('wechat login is not configured');
  return res.json();
}

export async function getExperts(token?: string) {
  const headers = token ? { 'x-auth-token': token } : undefined;
  const res = await fetch(`${BASE_URL}/experts`, { headers });
  if (!res.ok) throw new Error('failed to load experts');
  return res.json();
}

export async function createConversation(token: string, expertId: string, title?: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ expert_id: expertId, title }),
  });
  if (!res.ok) throw new ApiError(res.status, 'failed to create conversation');
  return res.json();
}

export async function renameConversation(token: string, conversationId: string, title: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('failed to rename conversation');
  return res.json();
}

export async function deleteConversation(token: string, conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: { 'x-auth-token': token },
  });
  if (!res.ok) throw new Error('failed to delete conversation');
  return res.json();
}

export async function getConversation(token: string, conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}`, {
    headers: { 'x-auth-token': token },
  });
  if (!res.ok) throw new Error('failed to load conversation');
  return res.json();
}

export async function getConversations(token: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations`, {
    headers: { 'x-auth-token': token },
  });
  if (!res.ok) throw new Error('failed to load conversations');
  return res.json();
}

export async function getMessages(token: string, conversationId: string) {
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
    headers: { 'x-auth-token': token },
  });
  if (!res.ok) throw new Error('failed to load messages');
  return res.json();
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
}

export async function uploadAttachments(token: string, conversationId: string, files: File[]): Promise<Attachment[]> {
  const form = new FormData();
  files.forEach(file => form.append('files', file));
  const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/attachments`, {
    method: 'POST',
    headers: { 'x-auth-token': token },
    body: form,
  });
  if (!res.ok) throw new Error('附件上传失败，请换一个文件试试。');
  const data = await res.json();
  return data.attachments || [];
}

export function sendMessageStream(
  token: string,
  conversationId: string,
  content: string,
  attachmentIds: string[],
  onChunk: (text: string) => void,
  onDone: (messageId: string) => void,
  onError: (err: string) => void,
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ content, attachment_ids: attachmentIds }),
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
            // ignore incomplete fragments
          }
        }
      }
    }
  }).catch(err => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return controller;
}

export async function getCredits(token: string) {
  const res = await fetch(`${BASE_URL}/users/me/credits`, {
    headers: { 'x-auth-token': token },
  });
  if (!res.ok) throw new ApiError(res.status, 'failed to load credits');
  return res.json();
}

export async function grantCredits(token: string, amount: number) {
  const res = await fetch(`${BASE_URL}/users/me/credits/grant`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) throw new Error('failed to grant credits');
  return res.json();
}
