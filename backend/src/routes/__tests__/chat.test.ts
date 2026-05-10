import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../chat';
import { prisma } from '../../services/prisma';
import { generateReply, generateReplyStream } from '../../services/deepseek';
import { refundCredits, reserveCredits } from '../../services/credits';

vi.mock('../../services/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    message: {
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    usageLog: { create: vi.fn() },
  },
}));

vi.mock('../../services/deepseek', () => ({
  generateReply: vi.fn(),
  generateReplyStream: vi.fn(),
}));

vi.mock('../../services/credits', () => ({
  reserveCredits: vi.fn(),
  refundCredits: vi.fn(),
  getCreditsProfile: vi.fn(),
}));

const mockedPrisma = vi.mocked(prisma, true);
const mockedGenerateReply = vi.mocked(generateReply);
const mockedGenerateReplyStream = vi.mocked(generateReplyStream);
const mockedReserveCredits = vi.mocked(reserveCredits);
const mockedRefundCredits = vi.mocked(refundCredits);

function getHandler(path: string, method: 'post' | 'get' | 'patch' | 'delete') {
  const layer = router.stack.find((entry: any) => entry.route?.path === path && entry.route?.methods?.[method]) as any;
  if (!layer) {
    throw new Error(`Missing route handler for ${method.toUpperCase()} ${path}`);
  }
  return layer.route.stack[0].handle;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    headers: {} as Record<string, string>,
    chunks: [] as string[],
    ended: false,
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  res.setHeader = (name: string, value: string) => {
    res.headers[name] = value;
  };
  res.write = (chunk: string) => {
    res.chunks.push(chunk);
  };
  res.end = () => {
    res.ended = true;
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', nickname: 'Alice', credits: 5 } as never);
  mockedPrisma.conversation.findUnique.mockResolvedValue({ id: 'conv-1', expertId: 'steve-jobs', title: 'steve-jobs' } as never);
  mockedPrisma.message.create.mockResolvedValue({ id: 'msg-1' } as never);
  mockedPrisma.message.count.mockResolvedValue(1 as never);
  mockedPrisma.message.findMany.mockResolvedValue([
    { id: 'user-msg', role: 'user', content: '你好' },
  ] as never);
  mockedPrisma.usageLog.create.mockResolvedValue({} as never);
  mockedPrisma.conversation.update.mockResolvedValue({} as never);
  mockedReserveCredits.mockResolvedValue({ id: 'user-1', nickname: 'Alice', credits: 4 } as never);
  mockedRefundCredits.mockResolvedValue({ id: 'user-1', nickname: 'Alice', credits: 5 } as never);
});

describe('chat credits flow', () => {
  it('blocks when credits are exhausted', async () => {
    mockedReserveCredits.mockResolvedValueOnce(null);

    const handler = getHandler('/conversations/:id/messages', 'post');
    const req = {
      body: { content: '请帮我分析', user_id: 'user-1', expert_id: 'steve-jobs' },
      params: { id: 'conv-1' },
    } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'credits exhausted' });
    expect(mockedPrisma.message.create).not.toHaveBeenCalled();
  });

  it('deducts credits only after a successful answer', async () => {
    mockedGenerateReply.mockResolvedValueOnce('这是一个完整回复');

    const handler = getHandler('/conversations/:id/messages', 'post');
    const req = {
      body: { content: '请帮我分析', user_id: 'user-1', expert_id: 'steve-jobs' },
      params: { id: 'conv-1' },
    } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(mockedReserveCredits).toHaveBeenCalledWith('user-1');
    expect(mockedPrisma.usageLog.create).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      credits_remaining: 4,
      title_updated: true,
    });
  });

  it('refunds credits when the AI request fails', async () => {
    mockedGenerateReply.mockRejectedValueOnce(new Error('down'));

    const handler = getHandler('/conversations/:id/messages', 'post');
    const req = {
      body: { content: '请帮我分析', user_id: 'user-1', expert_id: 'steve-jobs' },
      params: { id: 'conv-1' },
    } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(503);
    expect(mockedRefundCredits).toHaveBeenCalledWith('user-1');
    expect(mockedPrisma.usageLog.create).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      error: 'AI服务暂时不可用',
      title_updated: true,
    });
  });

  it('refunds credits when the streaming AI request fails', async () => {
    mockedGenerateReplyStream.mockImplementationOnce(async function* () {
      yield '第一段';
      throw new Error('stream down');
    });

    const handler = getHandler('/conversations/:id/messages/stream', 'get');
    const req = {
      query: { user_id: 'user-1', content: '请帮我分析' },
      params: { id: 'conv-1' },
    } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(mockedRefundCredits).toHaveBeenCalledWith('user-1');
    expect(mockedPrisma.usageLog.create).not.toHaveBeenCalled();
    expect(res.ended).toBe(true);
    expect(res.chunks.join('')).toContain('AI服务暂时不可用');
  });
});
