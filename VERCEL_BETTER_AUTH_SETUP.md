# Nyxoshi — Vercel / Better Auth

## Production URL
Use the canonical Vercel domain:
`https://nyxoshi-beta-final-v1.vercel.app`

## Required Vercel environment variables
Set these for **Production** (and Preview if you want preview deployments to authenticate):

- `BETTER_AUTH_URL` = `https://nyxoshi-beta-final-v1.vercel.app`
- `NYXOSHI_APP_URL` = `https://nyxoshi-beta-final-v1.vercel.app`
- `BETTER_AUTH_SECRET` = a long random secret
- `VITE_AUTH_ENABLED` = `true`
- `DATABASE_URL` = your production PostgreSQL connection string
- `NYXOSHI_FOUNDER_1_EMAIL` = exact email of founder #1
- `NYXOSHI_FOUNDER_2_EMAIL` = exact email of founder #2
- `NYXOSHI_FOUNDER_3_EMAIL` = exact email of founder #3

Keep all secrets as Vercel **Environment Variables / Sensitive** values; do not commit their actual values.

## Preview/deployment auth fix
Production may keep `BETTER_AUTH_URL` pointed at the canonical domain, but **Preview deployments must authenticate on their own Vercel origin**. The app now detects `VERCEL_ENV=preview` and dynamically uses `VERCEL_URL` / `VERCEL_BRANCH_URL` instead of forcing the production `BETTER_AUTH_URL`. This prevents a preview such as `https://i-beta-v14.vercel.app` from creating a session against `https://nyxoshi-beta-final-v1.vercel.app`, which otherwise surfaces as `Unauthorized` after login.

The auth server also accepts Vercel's `VERCEL_URL`, `VERCEL_BRANCH_URL`, and `VERCEL_PROJECT_PRODUCTION_URL` as trusted origins, while retaining the canonical production origin. `BETTER_AUTH_URL` is normalized so a trailing `/` does not cause an origin mismatch.

After changing environment variables or auth code, redeploy the project. A previously built deployment does not automatically receive changed environment variables.


## V10 role emails
- `NYXOSHI_ANGEL_GIRL_EMAIL` = exact email of the isolated Angel Girl account.
- `NYXOSHI_SUPREME_ARCHMAGE_EMAIL` = exact email of the Supreme Archmage account.
- Founders #1/#2/#3 remain exclusively controlled by the three `NYXOSHI_FOUNDER_*_EMAIL` variables.
- Sub Founders/Vice Founders are assigned from the founder panel by the user's permanent ID.
