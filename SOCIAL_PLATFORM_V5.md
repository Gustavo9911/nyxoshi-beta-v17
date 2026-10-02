# Nyxoshi — Social Platform V5

This release extends the existing beta instead of replacing it.

## Added backend capabilities
- Post reactions and comment reactions
- Reposts and quote-post records
- Private bookmarks
- Nested comments/replies
- @mention extraction and mention notifications
- Hashtag extraction and database indexing
- Mute and restriction controls
- Message reactions and sender-side message deletion
- Expanded notification preferences
- Founder security directory with masked e-mails
- Audited founder-only e-mail reveal
- PostgreSQL indexes for social queries

## Founder security
Founder identity remains controlled by `NYXOSHI_FOUNDER_1_EMAIL`, `NYXOSHI_FOUNDER_2_EMAIL`, and `NYXOSHI_FOUNDER_3_EMAIL`. E-mail addresses are masked in the founder directory; revealing one requires a reason and creates an audit-log record.

## Deployment
Run locally before deploying:

```powershell
npm install
npm run typecheck
npm run build
```

Production must have a valid Neon/PostgreSQL `DATABASE_URL`. Do not deploy with an empty `DATABASE_URL`; otherwise the application can fall back to PGLite, which is not a durable production database on Vercel.
