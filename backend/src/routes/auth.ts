import { Router, Request } from 'express';
import crypto from 'crypto';
import { prisma } from '../services/prisma';

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

async function uniqueNickname(base: string) {
  const cleaned = base.trim().slice(0, 40) || 'WeChat User';
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? cleaned : `${cleaned}${i + 1}`;
    const existing = await prisma.user.findUnique({ where: { nickname: candidate } });
    if (!existing) return candidate;
  }
  return `WeChat User ${crypto.randomBytes(4).toString('hex')}`;
}

router.post('/quick-login', async (req, res) => {
  if (process.env.ALLOW_NICKNAME_LOGIN === 'false') {
    return res.status(403).json({ error: 'nickname login disabled' });
  }

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
