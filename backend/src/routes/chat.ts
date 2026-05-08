import { Router } from 'express';
import { prisma } from '../services/prisma';
import { generateReply, generateReplyStream } from '../services/deepseek';

const router = Router();

router.post('/conversations', async (req, res) => {
  const { user_id, expert_id, title } = req.body;
  if (!user_id || !expert_id) {
    return res.status(400).json({ error: 'user_id and expert_id are required' });
  }
  const user = await prisma.user.findUnique({ where: { id: user_id } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  const conversation = await prisma.conversation.create({
    data: { userId: user_id, expertId: expert_id, title: title || expert_id },
  });
  res.json(conversation);
});

router.get('/conversations', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  const conversations = await prisma.conversation.findMany({
    where: { userId: String(user_id) },
    orderBy: { createdAt: 'desc' },
  });
  res.json(conversations);
});

router.get('/conversations/:id/messages', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/conversations/:id/messages', async (req, res) => {
  const { content, user_id, expert_id } = req.body;
  if (!content || !user_id) {
    return res.status(400).json({ error: 'content and user_id are required' });
  }

  const user = await prisma.user.findUnique({ where: { id: user_id } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  if (user.dailyQuota <= 0) {
    return res.status(429).json({ error: 'daily quota exhausted' });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  await prisma.message.create({
    data: { conversationId: req.params.id, role: 'user', content },
  });

  const msgCount = await prisma.message.count({ where: { conversationId: req.params.id, role: 'user' } });
  if (msgCount === 1 && conversation.title === conversation.expertId) {
    const autoTitle = content.length > 30 ? content.slice(0, 30) + '...' : content;
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { title: autoTitle },
    });
  }

  await prisma.user.update({
    where: { id: user_id },
    data: { dailyQuota: { decrement: 1 } },
  });

  await prisma.usageLog.create({
    data: { userId: user_id, expertId: expert_id || conversation.expertId },
  });

  const history = await prisma.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const historyMessages = history
    .filter(m => m.id !== history[history.length - 1]?.id)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let aiContent: string;
  try {
    aiContent = await generateReply(conversation.expertId, content, historyMessages);
  } catch {
    aiContent = '';
  }

  const aiMessage = await prisma.message.create({
    data: { conversationId: req.params.id, role: 'assistant', content: aiContent || '[暂时无法回复]' },
  });

  if (!aiContent) {
    return res.status(503).json({ error: 'AI服务暂时不可用', ai_message: aiMessage, quota_remaining: user.dailyQuota - 1, title_updated: msgCount === 1 });
  }

  res.json({ ai_message: aiMessage, quota_remaining: user.dailyQuota - 1, title_updated: msgCount === 1 });
});

router.get('/conversations/:id', async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  res.json(conversation);
});

router.patch('/conversations/:id', async (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'title is required' });
  }
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  const updated = await prisma.conversation.update({
    where: { id: req.params.id },
    data: { title },
  });
  res.json(updated);
});

router.delete('/conversations/:id', async (req, res) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
  await prisma.conversation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.get('/conversations/:id/messages/stream', async (req, res) => {
  const { user_id, content } = req.query;

  if (!user_id || !content) {
    return res.status(400).json({ error: 'user_id and content are required' });
  }

  const user = await prisma.user.findUnique({ where: { id: String(user_id) } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }
  if (user.dailyQuota <= 0) {
    return res.status(429).json({ error: 'daily quota exhausted' });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: req.params.id },
  });
  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  await prisma.message.create({
    data: { conversationId: req.params.id, role: 'user', content: String(content) },
  });

  const msgCount = await prisma.message.count({ where: { conversationId: req.params.id, role: 'user' } });
  if (msgCount === 1 && conversation.title === conversation.expertId) {
    const autoTitle = String(content).length > 30 ? String(content).slice(0, 30) + '...' : String(content);
    await prisma.conversation.update({
      where: { id: req.params.id },
      data: { title: autoTitle },
    });
  }

  await prisma.user.update({
    where: { id: String(user_id) },
    data: { dailyQuota: { decrement: 1 } },
  });

  await prisma.usageLog.create({
    data: { userId: String(user_id), expertId: conversation.expertId },
  });

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

  try {
    for await (const chunk of generateReplyStream(
      conversation.expertId,
      String(content),
      historyMessages,
    )) {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'AI服务暂时不可用' })}\n\n`);
  }

  const aiMessage = await prisma.message.create({
    data: { conversationId: req.params.id, role: 'assistant', content: fullContent },
  });

  res.write(`data: ${JSON.stringify({ done: true, messageId: aiMessage.id, titleUpdated: msgCount === 1 })}\n\n`);
  res.end();
});

export default router;
