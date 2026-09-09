# Bongii operations

This runbook covers the Phase 0 configuration, SQLite migrations, backup checks, and rollback boundaries.

## Environment variables

### API

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | HTTP listen port |
| `DATABASE_PATH` | No | `./data/bongii.db` | SQLite file; Fly explicitly retains `/data/test.db` for existing production data |
| `JWT_SECRET` | Yes | Generated secret | Signs temporary local-auth tokens |
| `CLIENT_ORIGINS` | No | `http://localhost:3001,https://bongii.fayaz.one,https://bongii-git-feature-account.vercel.app` | Exact comma-separated browser origins allowed by REST and Socket.IO CORS |

Set the production JWT secret with Fly secrets, never in `fly.toml`:

```bash
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" -a bongii
```

Changing this value signs every user out. The Firebase migration will eventually remove it.

`CLIENT_ORIGINS` accepts origins only: scheme, hostname, and optional non-default port. Wildcards, paths, and trailing slashes fail startup validation. Keep `http://localhost:3001` for local development, list the production Vercel/custom domain, and add the exact `https://${VERCEL_URL}` value for each active Vercel preview deployment. Remove stale preview origins after testing.

### Client

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes in deployment | `https://bongii.fly.dev` | API origin without `/api` |

The source default is `http://localhost:3000`, so an unconfigured local build cannot silently write to production. Set the production value in Vercel for Production and Preview environments as appropriate.

## Local setup

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
npm --prefix server ci
npm --prefix client ci
npm --prefix server run db:migrate
```

The API also runs migrations before it starts listening.

## Migration behavior

- Ordered migrations live in `server/db/migrations`.
- `schema_migrations` records each filename, SHA-256 checksum, and application time.
- An applied migration must never be edited. Add a new numbered migration instead.
- A changed checksum stops startup rather than applying uncertain schema changes.
- Each migration runs inside `BEGIN IMMEDIATE` and rolls back completely on error.
- Foreign-key enforcement is enabled on every application and migration connection.

Check a database without starting the API:

```bash
DATABASE_PATH=./data/bongii.db npm --prefix server run db:migrate
```

## Production migration checklist

1. Confirm the deployed app and volume: `fly status -a bongii` and `fly volumes list -a bongii`.
2. Confirm `DATABASE_PATH=/data/test.db`. This is the historical production filename and must not be renamed as part of a schema release.
3. Create a Fly volume snapshot and confirm it is listed. Follow the current [Fly volume snapshot documentation](https://fly.io/docs/volumes/volume-manage/#restore-a-volume-from-a-snapshot) because flyctl syntax can change.
4. Record the snapshot ID, current image version, expected migration filenames, and current row counts.
5. Deploy one machine first. Startup applies pending migrations before opening the HTTP port.
6. Verify `/api/health`, an existing campaign, an existing board, and the expected rows in `schema_migrations`.
7. Only then continue normal traffic and client deployment.

SQLite migrations in this repository are forward-only. Never solve a failed deploy by deleting columns or migration records.

## Rollback

### Application failure with healthy data

Roll back to an application image that understands the migrated schema. New migrations should be additive or maintain a compatibility window whenever a code rollback may be needed.

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