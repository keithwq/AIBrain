# Deployment Checklist

## Required Environment

Set these in production before starting the stack:

    DEEPSEEK_API_KEY=...
    DATABASE_URL=postgresql://aibrain:aibrain@postgres:5432/aibrain?schema=public
    CORS_ORIGIN=https://your-domain.example
    PUBLIC_ORIGIN=https://your-domain.example
    FRONTEND_ORIGIN=https://your-domain.example
    EMAIL_CODE_SECRET=<long-random-secret>
    LOGIN_PASSWORD_SECRET=<long-random-secret>
    ALLOW_PRESET_TEST_USERS=false
    ALLOW_NICKNAME_LOGIN=false

Optional login integrations:

    SMTP_HOST=...
    SMTP_PORT=465
    SMTP_SECURE=true
    SMTP_USER=...
    SMTP_PASS=...
    SMTP_FROM=...
    WECHAT_APP_ID=...
    WECHAT_APP_SECRET=...
    WECHAT_REDIRECT_URI=https://your-domain.example/api/v1/auth/wechat/callback
    WECHAT_STATE_SECRET=<long-random-secret>

## Release Gate

Run these before deployment:

    cd backend
    npx prisma validate
    npx prisma migrate status
    npm run build
    npm test

    cd ../frontend
    npm run lint
    npm run build

`npx prisma migrate status` must report that the database schema is up to date.

## Deployment

Use migrations, not schema push:

    docker-compose up --build -d

The backend image starts with:

    npx prisma migrate deploy && npm start

Do not use `prisma db push --accept-data-loss` in production.

## Smoke Test

After deployment:

    GET https://your-domain.example/api/v1/health
    GET https://your-domain.example/api/v1/experts

Then verify the main product path:

    Login -> choose expert -> send message -> receive reply -> return to experts -> reopen conversation

Also verify quota behavior:

    Message send decrements credits.
    Zero credits blocks new paid messages in both frontend and backend.

## Must Not Ship

- `ALLOW_PRESET_TEST_USERS=true`
- `ALLOW_NICKNAME_LOGIN=true`
- localhost-only `CORS_ORIGIN`, `PUBLIC_ORIGIN`, or `FRONTEND_ORIGIN`
- missing `DEEPSEEK_API_KEY`
- missing production secrets
- `.env` files copied into images or committed to git
- runtime logs, `.tmp-*` files, `.cursor/`, or `.playwright-mcp/` in the release diff
