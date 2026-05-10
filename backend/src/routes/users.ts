import { Router } from 'express';
import { getCreditsProfile } from '../services/credits';

const router = Router();

router.get('/:user_id/credits', async (req, res) => {
  const user = await getCreditsProfile(req.params.user_id);

  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  res.json(user);
});

export default router;
