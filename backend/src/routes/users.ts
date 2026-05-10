import { Router } from 'express';
import { getCreditsProfile, grantCredits } from '../services/credits';

const router = Router();

router.get('/:user_id/credits', async (req, res) => {
  const user = await getCreditsProfile(req.params.user_id);

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json(user);
});

router.post('/:user_id/credits/grant', async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 20) {
    return res.status(400).json({ error: 'amount must be an integer between 1 and 20' });
  }

  const user = await getCreditsProfile(req.params.user_id);
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  const updated = await grantCredits(req.params.user_id, amount);
  res.json({ ...updated, granted: amount });
});

export default router;
