import { Router } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.get('/:user_id/quota', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.user_id },
  });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  const now = new Date();
  const lastReset = new Date(user.quotaResetDate);
  const isNewDay = now.getFullYear() > lastReset.getFullYear()
    || now.getMonth() > lastReset.getMonth()
    || now.getDate() > lastReset.getDate();

  if (isNewDay && user.dailyQuota < 10) {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { dailyQuota: 10, quotaResetDate: now },
    });
    return res.json({ id: updated.id, nickname: updated.nickname, dailyQuota: updated.dailyQuota });
  }

  res.json({ id: user.id, nickname: user.nickname, dailyQuota: user.dailyQuota });
});

export default router;
