import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import expertsRoutes from './routes/experts';
import chatRoutes from './routes/chat';
import usersRoutes from './routes/users';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:8080', 'http://127.0.0.1:8080'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      // Block no-origin requests in production; allow in dev for curl/health checks
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: missing Origin header'));
      }
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
}));

app.use(express.json());

// IP-based rate limit on auth to prevent unlimited account creation
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' },
});

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/experts', expertsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/users', usersRoutes);

// Catch async errors thrown from route handlers
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});
