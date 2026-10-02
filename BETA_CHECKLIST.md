# Nyxoshi Beta Launch Checklist

## Identity / account
- [ ] Configure Better Auth production URL/secret.
- [ ] Configure a persistent Postgres/Neon `DATABASE_URL`.
- [ ] Set the three founder e-mails server-side.
- [ ] Confirm login and account creation on the production domain.

## Core social
- [ ] Create post.
- [ ] Like/unlike.
- [ ] Comment.
- [ ] Follow/unfollow.
- [ ] Search.
- [ ] Profile editing.
- [ ] Profile photo/banner/GIF URLs.
- [ ] Notifications.

## Messaging
- [ ] Search a user from Messages.
- [ ] Send a first-message request.
- [ ] Accept.
- [ ] Decline.
- [ ] Move to spam.
- [ ] Open accepted conversation.
- [ ] Send and read messages.
- [ ] Blocked users cannot message each other.

## Safety / moderation
- [ ] Ban.
- [ ] Unban.
- [ ] Mute.
- [ ] Unmute.
- [ ] Shadow ban/unban.
- [ ] Roles: tester, bug tester, designer, moderator, admin.
- [ ] Founder role only through the server-side founder allow-list.
- [ ] Founder panel inaccessible to normal users.

## Data hygiene
- [ ] No personal/demo names are hardcoded in the application.
- [ ] Empty states are shown when there are no real users, conversations or posts.
- [ ] Do not ship local PGLite as the production database; configure `DATABASE_URL`.

## APK
- [ ] Production HTTPS domain.
- [ ] PWA manifest/installability verified.
- [ ] Package the PWA as APK/AAB with the selected Android packaging tool.
- [ ] Test login, deep links and back navigation on a physical Android device.
