import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { prisma } from '../services/prisma';
import { generateReplyStream } from '../services/deepseek';
import { refundCredits, reserveCredits } from '../services/credits';
import { requireAuth } from '../middleware/auth';
import { isPersonaReady } from '../services/personas';

const router = Router();
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_MESSAGE = 6;
const MAX_MESSAGE_LENGTH = 12000;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const safeExt = path.extname(file.originalname).replace(/[^.\w-]/g, '').slice(0, 12);
      cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new Error('unsupported file type'));
      return;
    }
    cb(null, true);
  },
});

const CONVERSATION_TITLES: Record<string, string> = {
  wangdingjun: '鼎公老师',
  wangrongsheng: '荣生备课',
  sunshaozhen: '绍振细读',
  zhangxuefeng: '冰山先生',
  wangzhigang: '战略王子',
  'steve-jobs': '乔大爷',
  kuangtuzhangsan: '狂徒张三',
  yemaozhong: '叶将军',
  yejiaying: '迦陵先生',
  luoyonghao: '锤子',
  fandeng: '老登',
  mayun: '太极老总',
  masike: '极客麻薯',
  wentiejun: '铁军教授',
  xuehuashi: '磁医薛博',
  'li-meijin': '李玫瑾',
  'yixingchanshi': '一行禅师',
  zhanqimin: '肠博士',
};

function getConversationTitle(expertId: string, fallback?: string) {
  return fallback || CONVERSATION_TITLES[expertId] || '外脑对话';
}

router.use(requireAuth);

function publicAttachmentUrl(filename: string) {
  return `/uploads/${filename}`;
}

function serializeAttachment(attachment: {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}) {
  return {
    id: attachment.id,
    name: attachment.originalName,
    mimeType: attachment.mimeType,
    size: attachment.size,
    url: attachment.url,
  };
}

type AttachmentForContext = {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

function clipText(value: string, max = 8000) {
  const normalized = value.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  return normalized.length > max ? `${normalized.slice(0, max)}\n\n[后续内容已截断，请让用户分批上传或粘贴。]` : normalized;
}

async function extractAttachmentText(attachment: AttachmentForContext): Promise<string> {
  const filePath = path.join(UPLOAD_DIR, attachment.filename);
  const ext = path.extname(attachment.originalName).toLowerCase();

  try {
    if (attachment.mimeType === 'text/plain' || attachment.mimeType === 'text/markdown' || ext === '.txt' || ext === '.md') {
      return clipText(await fs.promises.readFile(filePath, 'utf8'));
    }

    if (attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return clipText(result.value || '');
    }

    if (attachment.mimeType === 'application/pdf' || ext === '.pdf') {
      const parser = new PDFParse({ data: await fs.promises.readFile(filePath) });
      try {
        const result = await parser.getText();
        return clipText(result.text || '');
      } finally {
        await parser.destroy();
      }
    }
  } catch (error) {
    console.warn(`Failed to extract attachment text: ${attachment.originalName}`, error);
    return '';
  }

  return '';
}

async function buildAttachmentContext(attachments: AttachmentForContext[]) {
  if (attachments.length === 0) return '';
  const textBlocks = await Promise.all(attachments.map(async (item, index) => {
    const text = await extractAttachmentText(item);
    if (!text) return `${index + 1}. ${item.originalName}：暂未提取到可读正文。`;
    return `${index + 1}. ${item.originalName}：\n${text}`;
  }));

  return [
    '',
    '【本次用户上传附件】',
    ...attachments.map((item, index) => {
      const kind = item.mimeType.startsWith('image/') ? '图片' : '文件';
      return `${index + 1}. ${kind}：${item.originalName}（${item.mimeType}，${item.url}）`;
    }),
    '',
    '【附件正文摘录】',
    ...textBlocks,
    '',
    '这些附件是本次工作流的核心材料之一，请优先阅读附件正文摘录，再结合表单和提问判断。若用户只上传附件也要继续处理；如果附件没有可读正文，请说明无法读取并要求用户粘贴关键内容。公式请用 LaTeX：行内 $...$，独立公式 $$...$$。',
  ].join('\n');
}

router.post('/conversations', async (req, res) => {
  const user = res.locals.user;
  const { expert_id, title } = req.body;
  if (!expert_id) {
    return res.status(400).json({ error: 'expert_id is required' });
  }
  if (!isPersonaReady(expert_id)) {
    return res.status(404).json({ error: 'expert not available' });
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
    include: { attachments: true },
  });
  res.json(messages.map(message => ({
    ...message,
    attachments: message.attachments.map(serializeAttachment),
  })));
});

router.post('/conversations/:id/attachments', upload.array('files', MAX_ATTACHMENTS_PER_MESSAGE), async (req, res) => {
  const user = res.locals.user;
  const conversationId = String(req.params.id);
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  const files = (req.files || []) as Express.Multer.File[];
  if (files.length === 0) {
    return res.status(400).json({ error: 'files are required' });
  }

  const attachments = await prisma.$transaction(files.map(file => prisma.attachment.create({
    data: {
      userId: user.id,
      conversationId,
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: publicAttachmentUrl(file.filename),
    },
  })));

  res.json({ attachments: attachments.map(serializeAttachment) });
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
  await prisma.attachment.deleteMany({ where: { conversationId: req.params.id } });
  await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
  await prisma.conversation.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

router.post('/conversations/:id/messages/stream', async (req, res) => {
  const user = res.locals.user;
  const { content, attachment_ids } = req.body;
  const attachmentIds = Array.isArray(attachment_ids)
    ? attachment_ids.filter((id): id is string => typeof id === 'string').slice(0, MAX_ATTACHMENTS_PER_MESSAGE)
    : [];

  if ((!content || typeof content !== 'string' || content.trim().length === 0) && attachmentIds.length === 0) {
    return res.status(400).json({ error: 'content is required' });
  }
  if (typeof content === 'string' && content.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `content too long (max ${MAX_MESSAGE_LENGTH} characters)` });
  }

  const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
  if (!conversation || conversation.userId !== user.id) {
    return res.status(404).json({ error: 'conversation not found' });
  }
  if (!isPersonaReady(conversation.expertId)) {
    return res.status(404).json({ error: 'expert not available' });
  }

  const reservedUser = await reserveCredits(user.id);
  if (!reservedUser) {
    return res.status(429).json({ error: 'credits exhausted' });
  }

  const attachments = attachmentIds.length > 0
    ? await prisma.attachment.findMany({
        where: {
          id: { in: attachmentIds },
          userId: user.id,
          conversationId: req.params.id,
          messageId: null,
        },
      })
    : [];

  const userContent = typeof content === 'string' ? content.trim() : '';
  const userMessage = await prisma.message.create({
    data: { conversationId: req.params.id, role: 'user', content: userContent || '请查看附件并给出判断。' },
  });
  if (attachments.length > 0) {
    await prisma.attachment.updateMany({
      where: { id: { in: attachments.map(item => item.id) } },
      data: { messageId: userMessage.id },
    });
  }
  const serializedAttachments = attachments.map(serializeAttachment);
  const modelContent = `${userContent || '请查看附件并给出判断。'}${await buildAttachmentContext(attachments)}`;

  const msgCount = await prisma.message.count({ where: { conversationId: req.params.id, role: 'user' } });
  if (msgCount === 1 && conversation.title === getConversationTitle(conversation.expertId)) {
    const titleSource = userContent || serializedAttachments[0]?.name || '附件咨询';
    const autoTitle = titleSource.length > 30 ? `${titleSource.slice(0, 30)}...` : titleSource;
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
    for await (const chunk of generateReplyStream(conversation.expertId, modelContent, historyMessages)) {
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
