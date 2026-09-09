# Firebase Authentication setup and rollout

Bongii uses Firebase Authentication for identity only. Campaigns, boards, ownership, and profile preferences remain in SQLite. Never send a service-account key through chat, commit it, or place it in a `NEXT_PUBLIC_` variable.

## 1. Create isolated projects

Create separate Firebase projects for development and production. In each project:

1. Add a Web app and keep its web configuration available for the client environment variables below.
2. Open **Authentication > Sign-in method** and enable **Email/Password** and **Google**.
3. Set the Google provider support email. Do not enable phone authentication.
4. Under **Authentication > Settings**, keep one account per email address, require a password length of at least eight characters, and enable email-enumeration protection.
5. Add the exact authorized domains used by that environment. Development needs `localhost`; production needs each active Bongii custom or Vercel domain, including `bongii.fayaz.one`, `bongii.net`, and `www.bongii.net` when those domains serve the client.
6. Review the verification and password-reset email templates and configure the production action domain.

Firebase web configuration values identify a project but are not service credentials. Service-account values are private.

## 2. Configure development

Copy `client/.env.example` to `client/.env.local` and fill in the development Web app values:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-development-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-development-project
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

For a real development project, configure `server/.env` with a development-only service account:

```dotenv
AUTH_MODE=hybrid
FIREBASE_PROJECT_ID=your-development-project
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Alternatively, run the Firebase Auth emulator and set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` on the server and `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` on the client. The emulator still needs the same development project ID on both sides.

## 3. Configure hosted environments

Set the four `NEXT_PUBLIC_FIREBASE_*` Web app values in Vercel separately for Preview and Production. The development and production project IDs must never be mixed.

Set these as Fly secrets for the API:

- `AUTH_MODE=hybrid` during migration, then `AUTH_MODE=firebase`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Enter service-account values directly in Fly's secret management UI or CLI. Do not add them to `fly.toml`, local shell history, or this repository. Keep `JWT_SECRET` while `AUTH_MODE=hybrid`; it is no longer required after switching to `firebase`.

## 4. Prepare existing accounts

Run `npm run auth:audit` from `server/` against the intended database. It prints aggregate counts only. A user can self-migrate when their existing SQLite email is valid and unique.

Before deployment, ask users with a missing or invalid email to sign in to the currently deployed legacy client and save a unique email on their profile. Resolve duplicate addresses manually. The production audit on 2026-09-09 found three accounts, two with blank emails, no duplicate-email groups, and three legacy passwords.

After the Firebase client is released, an existing user creates a Firebase account with the same email and verifies it. On the first authenticated API request, Bongii links the Firebase UID to the existing SQLite row, preserves its integer ID and campaign ownership, and clears its legacy password. Ambiguous email matches return `409` for manual recovery rather than linking automatically.

### Manual recovery

Never delete or replace a local user row during recovery; campaigns reference its integer ID. Before Firebase rollout, the account owner should use legacy sign-in to save a valid, unique email. If that is impossible, identify the correct local user by ID from an approved backup and update only that row's email during a controlled maintenance window. Re-run `npm run auth:audit`, then have the owner create and verify the matching Firebase account. A duplicate email or an email already linked to a different Firebase UID must be resolved manually before retrying.

## 5. Stage the production rollout

Production currently runs Phase 1 server code. Do not deploy Phase 5 directly without treating every migration absent from the production `schema_migrations` ledger as part of the release.

1. Run all release checks from `OPERATIONS.md`.
2. Inspect the production migration ledger and record the pending migration IDs.
3. Create and verify a Fly volume snapshot before starting a new image against `/data/test.db`.
4. Deploy the API first with `AUTH_MODE=hybrid`; startup applies all pending migrations.
5. Verify health, existing campaigns and boards, the migration ledger, and legacy sign-in.
6. Configure and deploy the Firebase client.
7. Verify email registration, Google sign-in, verification links, password reset, return URLs, an existing moderator's campaign ownership, and the `409` response for an intentionally ambiguous test email.
8. Re-run `npm run auth:audit` on production until every expected account is linked and `legacyPasswordsPresent` is zero.
9. Set `AUTH_MODE=firebase`, verify legacy endpoints return `404`, rotate/remove `JWT_SECRET`, and monitor authentication failures.
10. Remove the legacy password column only in a later migration after the recovery window and backup retention period have completed.

Rollback the application image only to a version compatible with the migrated schema. Restore data from a new volume created from the pre-deploy snapshot if data integrity is affected.