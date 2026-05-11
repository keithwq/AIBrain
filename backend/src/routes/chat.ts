import { Router } from 'express';
import { prisma } from '../services/prisma';
import { generateReplyStream } from '../services/deepseek';
import { refundCredits, reserveCredits } from '../services/credits';
import { requireAuth } from '../middleware/auth';

const router = Router();

const CONVERSATION_TITLES: Record<string, string> = {
  wangdingjun: '鼎公老师',
  zhangxuefeng: '冰山先生',
  wangzhigang: '战略王子',
  'steve-jobs': '乔大爷',
  luoxiang: '狂徒张三',
  yemaozhong: '叶将军',
  luoyonghao: '锤子',
  fandeng: '老登',
  mayun: '太极老总',
  masike: '极客麻薯',
  wentiejun: '铁军教授',
  xuehuashi: '磁医薛博',
  zhanqimin: '肠博士',
};

function getConversationTitle(expertId: string, fallback?: string) {
  return fallback || CONVERSATION_TITLES[expertId] || '外脑对话';
}

router.use(requireAuth);

router.post('/conversations', async (req, res) => {
  const user = res.locals.user;
  const { expert_id, title } = req.body;
  if (!expert_id) {
    return res.status(400).json({ error: 'expert_id is required' });
  }

  const conversation = await prisma.conversation.create({
    data: { userId: user.id, expertId: expert_id, title: getConversationTitle(expert_id, title) },
  });

  res.json(conversation);
});

router.get('/conversations', async (req, res) => {
  const user = res.locals.user;

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json(conversations);
});

router.get('/conversations/:id/messages', async (req, res) => {
  const user = res.locals.user;
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.get('/conversations/:id', async (req, res) => {
  const user = res.locals.user;
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  res.json(conversation);
});

router.patch('/conversations/:id', async (req, res) => {
  const user = res.locals.user;
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { title },
  });
  res.json(updated);
});

router.delete('/conversations/:id', async (req, res) => {
  const user = res.locals.user;
  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
  await prisma.conversation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post('/conversations/:id/messages/stream', async (req, res) => {
  const user = res.locals.user;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }
  if (content.length > 2000) {
    return res.status(400).json({ error: 'content too long (max 2000 characters)' });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  const reservedUser = await reserveCredits(user.id);
  if (!reservedUser) {
    return res.status(429).json({ error: 'credits exhausted' });
  }

  await prisma.message.create({
    data: { conversationId: req.params.id, role: 'user', content },
  });

  const msgCount = await prisma.message.count({ where: { conversationId: req.params.id, role: 'user' } });
  if (msgCount === 1 && conversation.title === getConversationTitle(conversation.expertId)) {
    const autoTitle = content.length > 30 ? `${content.slice(0, 30)}...` : content;
    await prisma.conversation.update({ where: { id: req.params.id }, data: { title: autoTitle } });
  }

  const history = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const historyMessages = history
    .filter(m => m.id !== history[history.length - 1]?.id)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let fullContent = '';
  let failed = false;

  try {
    for await (const chunk of generateReplyStream(conversation.expertId, content, historyMessages)) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
  } catch {
    failed = true;
  }

  if (failed || !fullContent) {
    const aiMessage = await prisma.message.create({
      data: { conversationId: req.params.id, role: 'assistant', content: '[暂时无法回复]' },
    });
    await refundCredits(user.id);
    res.write(`data: ${JSON.stringify({ error: 'AI服务暂时不可用', messageId: aiMessage.id, titleUpdated: msgCount === 1 })}\n\n`);
    res.end();
    return;
  }

  const aiMessage = await prisma.message.create({
    data: { conversationId: req.params.id, role: 'assistant', content: fullContent },
  });

  await prisma.usageLog.create({
    data: { userId: user.id, expertId: conversation.expertId },
  });

  res.write(`data: ${JSON.stringify({ done: true, messageId: aiMessage.id, titleUpdated: msgCount === 1, credits_remaining: reservedUser.credits })}\n\n`);
  res.end();
});

export default router;
