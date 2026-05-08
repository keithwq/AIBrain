import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const WIKI_BASE = process.env.WIKI_BASE_PATH || 'D:\\WIKI\\40_Knowledge 知识资产\\Personas 人物原型';

const client = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEPSEEK_API_KEY || '',
});

export function loadSkill(id: string): string {
  const dir = path.join(WIKI_BASE, `${id}-perspective`);
  const skillPath = path.join(dir, 'SKILL.md');
  try {
    if (fs.existsSync(skillPath)) {
      return fs.readFileSync(skillPath, 'utf-8');
    }
  } catch { }
  return '';
}

export function buildSystemPrompt(expertId: string): string {
  const skill = loadSkill(expertId);
  if (!skill) {
    return `You are a helpful AI assistant.`;
  }
  const lines = skill.split('\n');
  const inFrontmatter = lines[0]?.startsWith('---');
  if (!inFrontmatter) return skill.trim();
  const endIndex = lines.slice(1).findIndex(l => l.startsWith('---'));
  if (endIndex === -1) return skill.trim();
  const body = lines.slice(endIndex + 2).join('\n').trim();
  return body;
}

export async function generateReply(
  expertId: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
) {
  const systemPrompt = buildSystemPrompt(expertId);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  });

  return response.choices[0]?.message?.content || '';
}

export async function* generateReplyStream(
  expertId: string,
  userMessage: string,
  history: { role: 'user' | 'assistant'; content: string }[],
) {
  const systemPrompt = buildSystemPrompt(expertId);
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const stream = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages,
    temperature: 0.7,
    max_tokens: 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    if (content) yield content;
  }
}
