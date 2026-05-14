const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const users = [
  ...Array.from({ length: 9 }, (_, index) => `jy00${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `jt00${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `sy00${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `jk00${index + 1}`),
];

const secret = process.env.LOGIN_PASSWORD_SECRET || 'aibrain-preset-password-secret-v1';

function hashPassword(password) {
  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}

async function main() {
  const passwordHash = hashPassword('123');
  for (const nickname of users) {
    await prisma.user.upsert({
      where: { nickname },
      update: { passwordHash, credits: 10 },
      create: { nickname, passwordHash, credits: 10 },
    });
  }
  console.log(`Ensured ${users.length} grouped preset users.`);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
