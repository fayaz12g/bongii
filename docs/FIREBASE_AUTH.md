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

Avatar uploads use Firebase Storage only after the Blaze plan, a budget alert, and the rollout review in [OPERATIONS.md](OPERATIONS.md) are complete. Deploy `client/storage.rules` before setting `NEXT_PUBLIC_ENABLE_AVATAR_UPLOAD=true`. Objects are owner-scoped under `avatars/{firebaseUid}/`; only supported image content at or below 2 MB is accepted, and the client additionally validates dimensions.

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
FIREBASE_PROJECT_ID=your-development-project
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Alternatively, run the Firebase Auth emulator and set `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` on the server and `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099` on the client. The emulator still needs the same development project ID on both sides.

## 3. Configure hosted environments

Set the four `NEXT_PUBLIC_FIREBASE_*` Web app values in Vercel separately for Preview and Production. The development and production project IDs must never be mixed.

Set these as Fly secrets for the API:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Enter service-account values directly in Fly's secret management UI or CLI. Do not add them to `fly.toml`, local shell history, or this repository. The API accepts Firebase ID tokens only; `AUTH_MODE` and `JWT_SECRET` are no longer used.

## 4. Account linking

Firebase Authentication owns credentials. SQLite retains a profile row keyed by `firebaseUid`, and campaigns continue to reference that row's integer `id`. On an authenticated request, the API updates the profile's verified email, display name, and approved Google photo URL.

The production account migration completed on 2026-09-10. Migration `007_remove_legacy_password.js` requires every retained local account to have a Firebase UID and no password value. It may remove one unlinked legacy account only when no campaign, signed-in board, outcome decision, or finalization references that account; multiple candidates or any referenced account stop the migration. It then removes the password column while preserving the remaining user IDs and campaign ownership.

Run `npm run auth:audit` from `server/` against the intended database to print aggregate account-linking counts without account details. Ambiguous email matches still return `409` for manual recovery rather than linking automatically.

### Manual recovery

Never delete or replace a local user row during recovery; campaigns reference its integer ID. Identify the correct row from an approved backup, correct only the verified email or Firebase UID during a controlled maintenance window, and re-run `npm run auth:audit`. A duplicate email or an email already linked to a different Firebase UID must be resolved manually before retrying.

## 5. Verification and rotation

1. Verify email registration, Google sign-in, verification links, password reset, and preserved return URLs on the production domains.
2. Verify an existing moderator retains campaign ownership after signing in again.
3. Confirm `/api/login` and `POST /api/users` return `404`.
4. Confirm migration `007_remove_legacy_password.js` appears in `schema_migrations` and `PRAGMA table_info(users)` has no password column.
5. Rotate Firebase service-account credentials according to the project's credential policy and immediately after suspected exposure.

Rollback application code only to a version that understands the password-free schema. For data rollback, restore a new Fly volume from the verified pre-migration snapshot as described in `OPERATIONS.md`.