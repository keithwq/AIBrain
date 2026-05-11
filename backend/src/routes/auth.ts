import { Router } from 'express';
import { prisma } from '../services/prisma';

const router = Router();

router.post('/quick-login', async (req, res) => {
  const { nickname } = req.body;
  if (!nickname || typeof nickname !== 'string') {
    return res.status(400).json({ error: 'nickname is required' });
  }
  const trimmed = nickname.trim().slice(0, 50);
  if (!trimmed) {
    return res.status(400).json({ error: 'nickname cannot be empty' });
  }
  let user = await prisma.user.findUnique({ where: { nickname: trimmed } });
  if (!user) {
    user = await prisma.user.create({ data: { nickname: trimmed } });
  }
  res.json({ user_id: user.id, nickname: user.nickname, credits: user.credits, token: user.token });
});

export default router;
