# NYXOSHI V13 — Bug Fixes + Moderation Security

V13 is intentionally focused on the first security/bug-fix pass. Later features (music, native notifications, mascot, Reels, themes, etc.) are reserved for future versions.

## Included

### Moderation security
- Dedicated `/moderation` panel.
- Panel access restricted server-side to `founder` and `angel_girl`.
- Ban, unban, mute, unmute, shadow ban, shadow-ban removal and expulsion actions.
- Moderation target search by display name, username and permanent ID.
- Moderation reason/audit metadata.
- Permanent ban state stored separately from temporary `banned_until`.
- Privileged roles are revoked when a founder/administrator-level account is banned, shadow-banned or expelled.
- Email-based privileged roles are not re-granted while a permanent ban or shadow-ban is active.
- Banned accounts are rejected by protected server operations.

### Direct-message request flow
- The Message button on a profile now opens a composer directly.
- The user writes the message before sending.
- If no conversation exists, it becomes a pending message request.
- The recipient can accept, decline or mark it as spam from Messages.
- Sending to yourself or to a permanently banned account is rejected server-side.

### Overflow / mobile UI
- Global horizontal overflow is blocked.
- Messages tabs and message panels are constrained on narrow screens.
- Long IDs and content can wrap instead of pushing the page outside the viewport.

## Database
Run the new migration `migrations/0009_v13_moderation_security.sql` with the project's normal migration command before using the new moderation state.

## Important
- Do not copy real production secrets into the ZIP.
- Keep `DATABASE_URL`, `BETTER_AUTH_SECRET`, founder emails and other private values in Vercel environment variables.
