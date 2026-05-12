import { Router, Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../services/prisma';
import { sendEmail } from '../services/email';

const router = Router();

const WECHAT_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/qrconnect';
const WECHAT_TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
const WECHAT_USERINFO_URL = 'https://api.weixin.qq.com/sns/userinfo';

type WeChatTokenResponse = {
  access_token?: string;
  openid?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

type WeChatUserInfo = {
  nickname?: string;
  headimgurl?: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
};

const EMAIL_CODE_TTL_MS = 5 * 60 * 1000;
const EMAIL_CODE_RESEND_MS = 60 * 1000;
const EMAIL_CODE_MAX_ATTEMPTS = 5;
const PASSWORD_SECRET = process.env.LOGIN_PASSWORD_SECRET || 'aibrain-preset-password-secret-v1';

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email.slice(0, 255);
}

function normalizeNickname(value: unknown) {
  if (typeof value !== 'string') return null;
  const nickname = value.trim().slice(0, 50);
  return nickname || null;
}

function hashEmailCode(email: string, code: string) {
  const secret = process.env.EMAIL_CODE_SECRET || process.env.WECHAT_STATE_SECRET || 'aibrain-dev-email-secret';
  return crypto.createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
}

function createEmailCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  const visible = name.length <= 2 ? name[0] : `${name[0]}***${name[name.length - 1]}`;
  return `${visible}@${domain}`;
}

function getPublicOrigin(req: Request) {
  return process.env.PUBLIC_ORIGIN || `${req.protocol}://${req.get('host')}`;
}

function getFrontendOrigin(req: Request) {
  return process.env.FRONTEND_ORIGIN || getPublicOrigin(req);
}

function getWechatRedirectUri(req: Request) {
  return process.env.WECHAT_REDIRECT_URI || `${getPublicOrigin(req)}/api/v1/auth/wechat/callback`;
}

function stateSecret() {
  return process.env.WECHAT_STATE_SECRET || process.env.WECHAT_APP_SECRET || 'aibrain-dev-state-secret';
}

function signState(payload: string) {
  return crypto.createHmac('sha256', stateSecret()).update(payload).digest('base64url');
}

function createState() {
  const payload = JSON.stringify({
    ts: Date.now(),
    nonce: crypto.randomBytes(12).toString('base64url'),
  });
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${signState(encoded)}`;
}

function verifyState(state: unknown) {
  if (typeof state !== 'string') return false;
  const [encoded, signature] = state.split('.');
  if (!encoded || !signature) return false;

  const expected = signState(encoded);
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (received.length !== expectedBuffer.length) return false;
  if (!crypto.timingSafeEqual(received, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    return typeof payload.ts === 'number' && Date.now() - payload.ts < 10 * 60 * 1000;
  } catch {
    return false;
  }
}

function hashPassword(password: string) {
  return crypto.createHmac('sha256', PASSWORD_SECRET).update(password).digest('hex');
}

async function uniqueNickname(base: string) {
  const cleaned = base.trim().slice(0, 40) || 'WeChat User';
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? cleaned : `${cleaned}${i + 1}`;
    const existing = await prisma.user.findUnique({ where: { nickname: candidate } });
    if (!existing) return candidate;
  }
  return `WeChat User ${crypto.randomBytes(4).toString('hex')}`;
}

async function uniqueEmailNickname(email: string) {
  const prefix = email.split('@')[0].replace(/[^a-z0-9_-]/gi, '').slice(0, 24) || 'user';
  return uniqueNickname(prefix);
}

router.post('/quick-login', async (req, res) => {
  if (process.env.ALLOW_NICKNAME_LOGIN !== 'true') {
    return res.status(403).json({ error: 'nickname login disabled' });
  }

  const nickname = normalizeNickname(req.body?.nickname);
  if (!nickname) {
    return res.status(400).json({ error: 'nickname is required' });
  }

  let user = await prisma.user.findUnique({ where: { nickname } });
  if (!user) {
    user = await prisma.user.create({ data: { nickname } });
  }
  res.json({ user_id: user.id, nickname: user.nickname, credits: user.credits, token: user.token });
});

router.post('/password-login', async (req, res) => {
  const nickname = normalizeNickname(req.body?.nickname ?? req.body?.username);
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
  if (!nickname || !password) {
    return res.status(400).json({ error: 'nickname and password are required' });
  }

  const user = await prisma.user.findUnique({ where: { nickname } });
  if (!user || !user.passwordHash) {
    return res.status(400).json({ error: 'invalid username or password' });
  }

  if (!crypto.timingSafeEqual(Buffer.from(hashPassword(password)), Buffer.from(user.passwordHash))) {
    return res.status(400).json({ error: 'invalid username or password' });
  }

  res.json({ user_id: user.id, nickname: user.nickname, credits: user.credits, token: user.token });
});

router.post('/email/send-code', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) {
    return res.status(400).json({ error: 'valid email is required' });
  }

  const recent = await prisma.emailLoginCode.findFirst({
    where: {
      email,
      createdAt: { gt: new Date(Date.now() - EMAIL_CODE_RESEND_MS) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    return res.status(429).json({ error: 'please wait before requesting another code' });
  }

  const code = createEmailCode();
  await prisma.emailLoginCode.create({
    data: {
      email,
      codeHash: hashEmailCode(email, code),
      expiresAt: new Date(Date.now() + EMAIL_CODE_TTL_MS),
      userAgent: req.get('user-agent')?.slice(0, 300),
      ipAddress: req.ip?.slice(0, 80),
    },
  });

  const result = await sendEmail({
    to: email,
    subject: 'AI外脑登录验证码',
    text: [
      `你的 AI外脑 登录验证码是：${code}`,
      '',
      '验证码 5 分钟内有效。若非本人操作，请忽略此邮件。',
    ].join('\n'),
  });

  res.json({
    ok: true,
    email: maskEmail(email),
    dev_mode: result.devMode,
  });
});

router.post('/email/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!email || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'valid email and code are required' });
  }

  const record = await prisma.emailLoginCode.findFirst({
    where: {
      email,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return res.status(400).json({ error: 'code is invalid or expired' });
  }
  if (record.attempts >= EMAIL_CODE_MAX_ATTEMPTS) {
    return res.status(400).json({ error: 'code attempt limit exceeded' });
  }

  const nextAttempts = record.attempts + 1;
  const codeHash = hashEmailCode(email, code);
  if (!crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(record.codeHash))) {
    await prisma.emailLoginCode.update({
      where: { id: record.id },
      data: { attempts: nextAttempts },
    });
    return res.status(400).json({ error: 'code is invalid or expired' });
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        nickname: await uniqueEmailNickname(email),
      },
    });
  }

  await prisma.emailLoginCode.update({
    where: { id: record.id },
    data: { usedAt: new Date(), attempts: nextAttempts },
  });

  res.json({ user_id: user.id, nickname: user.nickname, credits: user.credits, token: user.token });
});

router.get('/wechat/config', (_req, res) => {
  res.json({ enabled: Boolean(process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) });
});

router.get('/wechat/login-url', (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  if (!appId || !process.env.WECHAT_APP_SECRET) {
    return res.status(503).json({ error: 'wechat login is not configured' });
  }

  const params = new URLSearchParams({
    appid: appId,
    redirect_uri: getWechatRedirectUri(req),
    response_type: 'code',
    scope: 'snsapi_login',
    state: createState(),
  });

  res.json({ url: `${WECHAT_AUTHORIZE_URL}?${params.toString()}#wechat_redirect` });
});

router.get('/wechat/callback', async (req, res) => {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  const { code, state } = req.query;

  if (!appId || !appSecret) {
    return res.status(503).send('Wechat login is not configured.');
  }
  if (typeof code !== 'string' || !verifyState(state)) {
    return res.status(400).send('Invalid WeChat login request.');
  }

  const tokenParams = new URLSearchParams({
    appid: appId,
    secret: appSecret,
    code,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch(`${WECHAT_TOKEN_URL}?${tokenParams.toString()}`);
  const tokenData = await tokenRes.json() as WeChatTokenResponse;

  if (!tokenData.access_token || !tokenData.openid) {
    console.error('WeChat token exchange failed:', tokenData);
    return res.status(502).send('WeChat login failed.');
  }

  const userInfoParams = new URLSearchParams({
    access_token: tokenData.access_token,
    openid: tokenData.openid,
    lang: 'zh_CN',
  });
  const userInfoRes = await fetch(`${WECHAT_USERINFO_URL}?${userInfoParams.toString()}`);
  const userInfo = await userInfoRes.json() as WeChatUserInfo;
  const unionId = tokenData.unionid || userInfo.unionid || null;

  let user = await prisma.user.findUnique({ where: { wechatOpenId: tokenData.openid } });
  if (!user && unionId) {
    user = await prisma.user.findUnique({ where: { wechatUnionId: unionId } });
  }

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        wechatOpenId: tokenData.openid,
        wechatUnionId: unionId,
        wechatAvatar: userInfo.headimgurl || user.wechatAvatar,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        nickname: await uniqueNickname(userInfo.nickname || 'WeChat User'),
        wechatOpenId: tokenData.openid,
        wechatUnionId: unionId,
        wechatAvatar: userInfo.headimgurl || null,
      },
    });
  }

  const payload = JSON.stringify({
    user_id: user.id,
    nickname: user.nickname,
    credits: user.credits,
    token: user.token,
  }).replace(/</g, '\\u003c');
  const frontendOrigin = getFrontendOrigin(req);

  res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<script>
  const payload = ${payload};
  if (window.opener) {
    window.opener.postMessage({ type: 'aibrain:wechat-login', payload }, ${JSON.stringify(frontendOrigin)});
    window.close();
  } else {
    const params = new URLSearchParams(payload);
    location.replace(${JSON.stringify(frontendOrigin)} + '/?wechat_login=' + encodeURIComponent(params.toString()));
  }
</script>`);
});

export default router;
