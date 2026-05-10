import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../prisma';
import { getCreditsProfile, refundCredits, reserveCredits } from '../credits';

vi.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedPrisma = vi.mocked(prisma, true);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('credits service', () => {
  it('returns the current credit profile', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      nickname: 'Alice',
      credits: 8,
    } as never);

    await expect(getCreditsProfile('u1')).resolves.toEqual({
      id: 'u1',
      nickname: 'Alice',
      credits: 8,
    });
  });

  it('reserves one credit when balance is available', async () => {
    mockedPrisma.user.updateMany.mockResolvedValue({ count: 1 } as never);
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      nickname: 'Alice',
      credits: 7,
    } as never);

    await expect(reserveCredits('u1')).resolves.toEqual({
      id: 'u1',
      nickname: 'Alice',
      credits: 7,
    });

    expect(mockedPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', credits: { gt: 0 } },
      data: { credits: { decrement: 1 } },
    });
  });

  it('returns null when balance is exhausted', async () => {
    mockedPrisma.user.updateMany.mockResolvedValue({ count: 0 } as never);

    await expect(reserveCredits('u1')).resolves.toBeNull();
  });

  it('refunds one credit after a failed request', async () => {
    mockedPrisma.user.update.mockResolvedValue({
      id: 'u1',
      nickname: 'Alice',
      credits: 9,
    } as never);

    await expect(refundCredits('u1')).resolves.toEqual({
      id: 'u1',
      nickname: 'Alice',
      credits: 9,
    });
  });
});
