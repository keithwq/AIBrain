import { Router } from 'express';
import { getCreditsProfile, grantCredits } from '../services/credits';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/me/credits', async (req, res) => {
  const user = res.locals.user;
  const profile = await getCreditsProfile(user.id);
  if (!profile) {
    return res.status(404).json({ error: 'user not found' });
  }
  res.json(profile);
});

router.post('/me/credits/grant', async (req, res) => {
  const user = res.locals.user;
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 20) {
    return res.status(400).json({ error: 'amount must be an integer between 1 and 20' });
  }

  const profile = await getCreditsProfile(user.id);
  if (!profile) {
    return res.status(404).json({ error: 'user not found' });
  }

  const MAX_CREDITS = 50;
  if (profile.credits >= MAX_CREDITS) {
    return res.status(400).json({ error: `credits already at maximum (${MAX_CREDITS})` });
  }

  const grantAmount = Math.min(amount, MAX_CREDITS - profile.credits);
  const updated = await grantCredits(user.id, grantAmount);
  res.json({ ...updated, granted: grantAmount });
});

export default router;
