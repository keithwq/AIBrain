import { useEffect, useState, useRef } from 'react';
import { getMessages, sendMessageStream, getConversation } from '../services/api';
import { showToast } from '../components/Toast';

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface Props {
  userId: string;
  conversationId: string;
  expertId: string;
  expertName: string;
  onBack: () => void;
}

export default function ChatPage({ userId, conversationId, expertName, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamingRef = useRef('');

  useEffect(() => {
    getMessages(conversationId).then(setMessages);
    getConversation(conversationId).then(c => setConversationTitle(c.title)).catch(() => {});
  }, [conversationId]);

  const handleExportMarkdown = () => {
    const title = conversationTitle || expertName;
    const date = new Date().toISOString().slice(0, 10);
    const lines = [`# ${title}`, ''];
    for (const msg of messages) {
      const role = msg.role === 'user' ? '你' : expertName;
      lines.push(`**${role}**: ${msg.content}`);
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}-${date}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input.trim() || sending) return;

    abortRef.current?.abort();

    setSending(true);
    const text = input.trim();
    setInput('');
    setStreamingContent('');
    streamingRef.current = '';

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    abortRef.current = sendMessageStream(
      conversationId,
      userId,
      text,
      (chunk) => {
        streamingRef.current += chunk;
        setStreamingContent(streamingRef.current);
      },
      (messageId) => {
        const finalContent = streamingRef.current;
        setMessages(prev => [
          ...prev.filter(m => !m.id.startsWith('temp-')),
          { id: messageId, role: 'assistant', content: finalContent, createdAt: new Date().toISOString() },
        ]);
        setStreamingContent('');
        setSending(false);
      },
      (err) => {
        showToast(err);
        setStreamingContent('');
        setSending(false);
      },
    );
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white shadow-sm px-6 py-3 flex items-center gap-4">
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm">&larr; 返回</button>
        <h1 className="text-lg font-bold flex-1">{expertName}</h1>
        <button
          onClick={handleExportMarkdown}
          className="text-sm text-gray-500 hover:text-blue-600 transition px-2 py-1 rounded border border-gray-300 hover:border-blue-400"
          title="导出 Markdown"
        >
          导出
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`relative group max-w-[70%] p-3 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-800'
            }`}>
              {msg.content}
              {msg.role === 'assistant' && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(msg.content);
                    showToast('已复制');
                  }}
                  className="absolute -top-2 -right-2 bg-gray-100 border border-gray-300 rounded p-0.5 opacity-0 group-hover:opacity-100 transition hover:bg-gray-200"
                  title="复制"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg text-sm bg-white border border-gray-200 text-gray-800">
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="bg-white border-t px-4 py-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="输入消息..."
          disabled={sending}
          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {sending ? '回复中...' : '发送'}
        </button>
      </div>
    </div>
  );
}
