# Bongii operations

This runbook covers the Phase 0 configuration, SQLite migrations, backup checks, and rollback boundaries.

## Environment variables

### API

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP listen port |
| `DATABASE_PATH` | No | `./data/bongii.db` | SQLite file; Fly explicitly retains `/data/test.db` for existing production data |
| `FIREBASE_PROJECT_ID` | Yes | `bongii-production` | Firebase project accepted by the API |
| `FIREBASE_CLIENT_EMAIL` | Conditional | Service-account email | Set together with the private key outside the emulator |
| `FIREBASE_PRIVATE_KEY` | Conditional | Service-account private key | Fly secret; escaped `\n` sequences are supported |
| `FIREBASE_AUTH_EMULATOR_HOST` | No | `127.0.0.1:9099` | Uses the local Auth emulator; never set in production |
| `CLIENT_ORIGINS` | No | `http://localhost:3001,https://bongii.fayaz.one,https://bongii-git-feature-account.vercel.app` | Exact comma-separated browser origins allowed by REST and Socket.IO CORS |

`CLIENT_ORIGINS` accepts origins only: scheme, hostname, and optional non-default port. Wildcards, paths, and trailing slashes fail startup validation. Keep `http://localhost:3001` for local development, list the production Vercel/custom domain, and add the exact `https://${VERCEL_URL}` value for each active Vercel preview deployment. Remove stale preview origins after testing.

### Client

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes in deployment | `https://bongii.fly.dev` | API origin without `/api` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes for Firebase | Firebase Web app value | Public Firebase client identifier |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes for Firebase | `project.firebaseapp.com` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes for Firebase | `bongii-production` | Must match the API project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes for Firebase | Firebase Web app value | Public Firebase app identifier |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | No | `127.0.0.1:9099` | Local development only |

The source default is `http://localhost:3000`, so an unconfigured local build cannot silently write to production. Set the production value in Vercel for Production and Preview environments as appropriate.

See [Firebase Authentication setup and rollout](FIREBASE_AUTH.md) for provider, authorized-domain, service-account, account-linking, and staged-release steps.

## Local setup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
npm --prefix server ci
npm --prefix client ci
npm --prefix server run db:migrate
npm --prefix server run auth:audit
```

The API also runs migrations before it starts listening.

For emulator-backed browser tests, run `npm --prefix client run test:a11y`. Playwright starts the Firebase Auth emulator, an isolated API on test-only port `43900`, and Next.js on test-only port `43901`; it never uses the development or production database. The lifecycle journey opens three independent Chromium contexts: one moderator and two anonymous viewers. The API permits only the test client origin and removes its temporary database when the process stops.

## Service probes

- `GET /api/health` is a liveness probe. It returns `200` while the HTTP process can respond and does not query SQLite.
- `GET /api/ready` is a readiness probe. It returns `200` only when SQLite answers a trivial query, or `503` with a generic response when the database is unavailable.

Neither response includes environment values, database paths, credentials, or internal error details. Fly checks `/api/ready` before routing traffic to a machine.

## Request logging

Every API response includes an `X-Request-Id` header that is also present in its completion log. Completion records contain only the request ID, method, matched route path, status code, and duration. Unhandled-error records contain only the request ID and error class; request headers, query values, bodies, exception messages, stack traces, credentials, and database paths are not logged.

Use the request ID to correlate a reported `500` response with its server records without asking a user for authentication data.

## Metrics

Fly scrapes `GET /api/metrics` in Prometheus format. The endpoint reports HTTP requests by status class, total HTTP errors, active and total Socket.IO connections, reconnects, campaign finalization count and duration, and the latest applied migration. Use rates over the counters rather than treating process-lifetime totals as an alert threshold.

## Migration behavior

- Ordered migrations live in `server/db/migrations`.
- `schema_migrations` records each filename, SHA-256 checksum, and application time.
- An applied migration must never be edited. Add a new numbered migration instead.
- A changed checksum stops startup rather than applying uncertain schema changes.
- Each migration runs inside `BEGIN IMMEDIATE` and rolls back completely on error.
- Foreign-key enforcement is enabled on every application and migration connection.
- Migration `007_remove_legacy_password.js` refuses to run while any account lacks a Firebase UID or retains a password value.

Check a database without starting the API:

```bash
DATABASE_PATH=./data/bongii.db npm --prefix server run db:migrate
```

## Production migration checklist

1. Confirm the deployed app and volume: `fly status -a bongii` and `fly volumes list -a bongii`.
2. Confirm `DATABASE_PATH=/data/test.db`. This is the historical production filename and must not be renamed as part of a schema release.
3. Create a Fly volume snapshot and confirm it is listed. Follow the current [Fly volume snapshot documentation](https://fly.io/docs/volumes/volume-manage/#restore-a-volume-from-a-snapshot) because flyctl syntax can change.
4. Record the snapshot ID, current image version, expected migration filenames, and current row counts. Before migration `007`, run `npm run auth:audit` and require every account to be Firebase-linked with zero legacy passwords.
5. Deploy one machine first. Startup applies pending migrations before opening the HTTP port.
6. Verify `/api/health`, `/api/ready`, an existing campaign, an existing board, and the expected rows in `schema_migrations`.
7. Only then continue normal traffic and client deployment.

SQLite migrations in this repository are forward-only. Never solve a failed deploy by deleting columns or migration records.

## Rollback

### Application failure with healthy data

Roll back to an application image that understands the migrated schema. New migrations should be additive or maintain a compatibility window whenever a code rollback may be needed.

After migration `007_remove_legacy_password.js`, do not roll back to an image that queries local passwords or accepts legacy JWTs. Such an image is schema-incompatible.

### Confirmed data corruption

1. Stop writes to the affected database.
2. Create a new Fly volume from the recorded pre-deploy snapshot.
3. Attach the restored volume according to Fly's current volume restore procedure.
4. Verify campaign, board, user, and migration row counts before restoring traffic.

Do not overwrite the only production volume in place. Keep the failed volume until recovery is verified.

## Release checks

Run the same gates as CI:

```bash
npm --prefix server test
npm --prefix server audit --omit=dev --audit-level=high
npm --prefix client test
npx --prefix client playwright install chromium
npm --prefix client run test:a11y
npm --prefix client run lint
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 npm --prefix client run build
npm --prefix client audit --omit=dev --audit-level=high
```

The full development dependency audit should also be reviewed periodically with `npm audit` in each package, even though CI blocks only high or critical advisories in deployable dependencies.

CI also runs Gitleaks against the complete Git history on every pull request and push to `main`. Treat any finding as compromised: rotate the credential before removing it from the repository and, when necessary, its history.

See [API.md](API.md) for transport contracts and [MODERATION_AND_SCORING.md](MODERATION_AND_SCORING.md) for the operator workflow and ranking rules.