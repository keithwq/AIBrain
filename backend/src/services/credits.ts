import { prisma } from './prisma';

export interface CreditsProfile {
  id: string;
  nickname: string;
  credits: number;
}

export async function getCreditsProfile(userId: string): Promise<CreditsProfile | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, credits: true },
  });
}

export async function reserveCredits(userId: string): Promise<CreditsProfile | null> {
  const updated = await prisma.user.updateMany({
    where: { id: userId, credits: { gt: 0 } },
    data: { credits: { decrement: 1 } },
  });

  if (updated.count === 0) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, credits: true },
  });
}

export async function refundCredits(userId: string): Promise<CreditsProfile> {
  return prisma.user.update({
    where: { id: userId },
    data: { credits: { increment: 1 } },
    select: { id: true, nickname: true, credits: true },
  });
}

export async function grantCredits(userId: string, amount: number): Promise<CreditsProfile> {
  return prisma.user.update({
    where: { id: userId },
    data: {
      credits: { increment: amount },
      creditsUpdatedAt: new Date(),
    },
    select: { id: true, nickname: true, credits: true },
  });
}
