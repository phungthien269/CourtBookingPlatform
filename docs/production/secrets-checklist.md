# Secrets Checklist

## Backend

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CORS_ORIGIN`
- `APP_URL`
- `FRONTEND_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SENTRY_DSN`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_PROVIDER_NAME`
- `PLATFORM_BANK_NAME`
- `PLATFORM_BANK_ACCOUNT_NAME`
- `PLATFORM_BANK_ACCOUNT_NUMBER`
- `PLATFORM_BANK_QR_BASE_URL`

## Frontend

- `VITE_API_URL`
- `VITE_MAP_TILE_URL`
- `VITE_MAP_ATTRIBUTION`
- `VITE_APP_URL`

## Rotation Rules

- rotate `JWT_SECRET` on production cut and after any suspected leak
- rotate `PAYMENT_WEBHOOK_SECRET` with provider cut-over
- use separate secrets for `staging` and `production`

