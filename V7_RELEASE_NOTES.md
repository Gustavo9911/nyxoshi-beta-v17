# Nyxoshi Beta V7

This build contains the requested social, messaging, founder and security changes.

## Included
- Fixed profile Posts/Reposts/Likes tabs with real database queries.
- Fixed repost/like state refresh and server validation.
- Quotes now create one real post with `quoted_post_id` and render the original post inside the quote.
- Founder badges/role labels are shown on profiles and posts.
- Added a separate Founder #1 security panel for confidential e-mail access.
- E-mail access is server-protected by the Founder #1 e-mail and founder number, and every reveal is audited.
- Founder #1 can change roles and manage founder accounts through the server-side permission check.
- Added group conversations and automatic `Fundadores` group membership for founders.
- Added message reply support, reactions, double-click heart, long-press/context actions, deletion and message reports.
- Added global Founder announcements with the Nyxoshi sender identity, timestamp and automatic expiration.
- Added database migration `0005_v7_founders_groups.sql`.

## Deployment
1. Keep `DATABASE_URL` pointed at the current Neon database in Vercel Production.
2. Set all three `NYXOSHI_FOUNDER_*_EMAIL` variables in Vercel Production.
3. Deploy the `main` branch.
4. Let the normal `db:migrate` step apply migration 0005.
5. Test login, profile interactions, quotes, messages, groups and Founder #1 access in production.

The project was not fully typechecked in this environment because dependency installation timed out. Run `npm install`, `npm run typecheck`, and `npm run build` locally before production deployment.
