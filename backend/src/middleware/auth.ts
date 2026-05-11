import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-auth-token'] as string | undefined;
  if (!token) {
    return res.status(401).json({ error: 'missing auth token' });
  }
  const user = await prisma.user.findUnique({ where: { token } });
  if (!user) {
    return res.status(401).json({ error: 'invalid auth token' });
  }
  res.locals.user = user;
  next();
}
