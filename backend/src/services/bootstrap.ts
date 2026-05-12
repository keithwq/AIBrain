import crypto from 'crypto';
import { prisma } from './prisma';

const PRESET_USERS = [
  { nickname: 'test1', password: 'Sun@8471' },
  { nickname: 'test2', password: 'Moon#3652' },
  { nickname: 'test3', password: 'Rain!7293' },
  { nickname: 'test4', password: 'Fire@5184' },
  { nickname: 'test5', password: 'Wind#9037' },
  { nickname: 'test6', password: 'Snow!4628' },
  { nickname: 'test7', password: 'Star@2915' },
  { nickname: 'test8', password: 'Lake#6743' },
  { nickname: 'test9', password: 'Hill!8306' },
];

const PASSWORD_SECRET = process.env.LOGIN_PASSWORD_SECRET || 'aibrain-preset-password-secret-v1';

function hashPassword(password: string) {
  return crypto.createHmac('sha256', PASSWORD_SECRET).update(password).digest('hex');
}

export async function ensurePresetUsers() {
  if (process.env.ALLOW_PRESET_TEST_USERS !== 'true') {
    return;
  }
  for (const { nickname, password } of PRESET_USERS) {
    await prisma.user.upsert({
      where: { nickname },
      update: { passwordHash: hashPassword(password), credits: 10 },
      create: { nickname, passwordHash: hashPassword(password), credits: 10 },
    });
  }
}

export function verifyPassword(password: string, passwordHash: string) {
  return crypto.timingSafeEqual(Buffer.from(hashPassword(password)), Buffer.from(passwordHash));
}
