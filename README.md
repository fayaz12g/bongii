# Bongii

Bongii is moderator-led prediction bingo. Players build a board while a campaign is open, then watch every tile update from the moderator's decisions. When the campaign is finalized, Bongii scores every board and publishes a campaign leaderboard.

Try the deployed app at [bongii.fayaz.one](https://bongii.fayaz.one).

> Status: early alpha. Phases 0 through 5 are implemented and deployed. Phase 6 release-quality work is partially complete.

## Current capabilities

- Register and sign in with Firebase email/password or Google. Express accepts Firebase ID tokens only and stores no passwords.
- Create a campaign with categories, items, a board size, and a start time.
- Publish, lock, reopen, moderate, or cancel a campaign through owner-only lifecycle controls.
- Browse campaigns and create an anonymous board with a shareable code.
- Import an editable campaign draft from JSON or download an example schema.
- Moderate three-state item outcomes and publish versioned updates through Socket.IO.
- Watch read-only boards update from authoritative server outcomes, including reconnect recovery.
- Edit a basic local profile and choose a preset avatar.

## Plans and specifications

| Document | Purpose |
| --- | --- |
| [Product specification](docs/PRODUCT_SPEC.md) | Campaign states, moderation rules, colors, scoring, leaderboard behavior, and UX requirements |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Prioritized milestones, task checklists, acceptance criteria, and suggested follow-up features |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Database migration, REST and Socket.IO contracts, finalization transaction, Firebase Auth, testing, and rollout |
| [API reference](docs/API.md) | REST endpoints, authentication, errors, real-time events, and operational probes |
| [Moderator and scoring guide](docs/MODERATION_AND_SCORING.md) | Campaign workflow, outcome controls, finalization, and ranking rules |
| [Operations runbook](docs/OPERATIONS.md) | Environment variables, migrations, production backup checks, release verification, and rollback |
| [Firebase Authentication setup](docs/FIREBASE_AUTH.md) | Firebase console setup, credentials, verification, and account-linking safeguards |

The remaining Phase 6 work is a deployed screen-reader smoke check, a Fly volume restore exercise, and a small closed mobile beta.

## Architecture

| Area | Current technology |
| --- | --- |
| Web client | Next.js 16, React 19, Tailwind CSS 3, Framer Motion |
| API | Node.js, Express 5 |
| Data | SQLite on a Fly.io persistent volume |
| Authentication | Firebase Authentication with server-side ID-token verification |
| Real-time transport | Socket.IO campaign rooms with REST snapshot recovery |
| Hosting | Vercel for the client, Fly.io for the API |

```text
bongii/
|- client/                  Next.js application
|  `- src/app/
|- server/                  Express API and SQLite access
|- docs/                    Product and engineering plans
`- README.md
```

## Local development

### Prerequisites

- Node.js 22, matching the server Docker image
- npm

Install each application separately:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env.local
npm --prefix server ci
npm --prefix client ci
```

Run the API on port `3000`:

```bash
cd server
npm start
```

Run the web client on port `3001`:

```bash
cd client
npm run dev
```

Then open [http://localhost:3001](http://localhost:3001).

Local development defaults to `server/data/bongii.db` and `http://localhost:3000`. Deployments must set `NEXT_PUBLIC_API_BASE_URL`; they never inherit a production API fallback from source code. See the [operations runbook](docs/OPERATIONS.md) for all environment variables.

## Available commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `npm run dev` | Start Next.js on port 3001 |
| `client` | `npm test` | Run realtime versioning and campaign import tests |
| `client` | `npm run lint` | Run the Next.js ESLint rules |
| `client` | `npm run build` | Create a production client build |
| `client` | `npm run start` | Run the production client build |
| `server` | `npm start` | Start Express on port 3000 |
| `server` | `npm test` | Run API, authorization, migration, CORS, and Socket.IO tests |
| `server` | `npm run db:migrate` | Apply pending SQLite migrations without starting HTTP |
| `server` | `npm run auth:audit` | Print aggregate Firebase-linking health counts |

GitHub Actions runs server tests, browser journeys, client lint and build, dependency audits, and full-history secret scanning on pushes to `main` and pull requests.

## Deployment

The API deploys from `server/`:

```bash
cd server
fly deploy
```

The SQLite database lives at the historical `/data/test.db` path on the Fly.io volume. Back up that volume before applying schema migrations and follow [docs/OPERATIONS.md](docs/OPERATIONS.md) for verification and rollback.

## Security warning

Client sessions use Firebase-managed credentials and short-lived ID tokens; Bongii does not store those tokens itself. Service-account credentials belong in Fly secrets and must never use a `NEXT_PUBLIC_` variable or enter the repository.