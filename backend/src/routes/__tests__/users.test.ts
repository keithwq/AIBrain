import { beforeEach, describe, expect, it, vi } from 'vitest';
import router from '../users';
import { getCreditsProfile, grantCredits } from '../../services/credits';

vi.mock('../../services/credits', () => ({
  getCreditsProfile: vi.fn(),
  grantCredits: vi.fn(),
}));

const mockedGetCreditsProfile = vi.mocked(getCreditsProfile);
const mockedGrantCredits = vi.mocked(grantCredits);

function getHandler(path: string, method: 'get' | 'post') {
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
    locals: { user: { id: 'user-1', nickname: 'Alice', credits: 4 } },
  };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetCreditsProfile.mockResolvedValue({ id: 'user-1', nickname: 'Alice', credits: 4 } as never);
  mockedGrantCredits.mockResolvedValue({ id: 'user-1', nickname: 'Alice', credits: 7 } as never);
});

describe('users credits routes', () => {
  it('returns the credits profile', async () => {
    const handler = getHandler('/me/credits', 'get');
    const req = {} as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(res.body).toEqual({ id: 'user-1', nickname: 'Alice', credits: 4 });
  });

  it('grants credits with a valid amount', async () => {
    const handler = getHandler('/me/credits/grant', 'post');
    const req = { body: { amount: 3 } } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(mockedGrantCredits).toHaveBeenCalledWith('user-1', 3);
    expect(res.body).toEqual({ id: 'user-1', nickname: 'Alice', credits: 7, granted: 3 });
  });

  it('rejects invalid grant amounts', async () => {
    const handler = getHandler('/me/credits/grant', 'post');
    const req = { body: { amount: 0 } } as any;
    const res = createRes();

    await handler(req, res, vi.fn());

    expect(res.statusCode).toBe(400);
    expect(mockedGrantCredits).not.toHaveBeenCalled();
  });
});
