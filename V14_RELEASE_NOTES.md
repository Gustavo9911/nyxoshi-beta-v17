# Nyxoshi V14 — Messaging + Notifications

V14 is V13 plus the second planned stage. V13 moderation/security work is preserved.

## Messaging
- DM requests are created from the target profile with the exact message the sender writes.
- Requests can be accepted, declined or marked as spam.
- Accepting a request creates the conversation and preserves the original message.
- Request/accept events create internal notifications.
- Conversation mute/unmute is persisted per user and per conversation.
- Existing block and message-permission checks remain enforced server-side.

## Notifications
- Notification center now supports All / Unread filters.
- Individual notifications can be marked read.
- Mark-all-as-read is available.
- DM request and accepted-request notifications link directly to Messages.
- Mentions/replies continue using the existing notification pipeline.
- Unread count refreshes periodically and can trigger the browser/PWA notification permission flow while the app is open.

No existing V13 moderation role or security behavior is intentionally removed.
