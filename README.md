# Bongii

Bongii is moderator-led prediction bingo. Players build a board while a campaign is open, then watch every tile update from the moderator's decisions. When the campaign is finalized, Bongii scores every board and publishes a campaign leaderboard.

Try the deployed app at [bongii.fayaz.one](https://bongii.fayaz.one).

> Status: early alpha. Campaign and board creation work, but authoritative real-time moderation, final scoring, leaderboards, and Firebase Authentication are planned work, not shipped features.

## Current capabilities

- Register and sign in with a local username and password.
- Create a campaign with categories, items, a board size, and a start time.
- Browse campaigns and create an anonymous board with a shareable code.
- View campaign and board pages.
- Persist moderator item outcomes through the API.
- Edit a basic local profile and choose a preset avatar.

The current board page still lets each viewer mark tiles only in local React state. Those marks are lost on refresh and are not authoritative. The moderation page does not yet expose working start, outcome, or finalization controls.

## Plans and specifications

| Document | Purpose |
| --- | --- |
| [Product specification](docs/PRODUCT_SPEC.md) | Campaign states, moderation rules, colors, scoring, leaderboard behavior, and UX requirements |
| [Implementation plan](docs/IMPLEMENTATION_PLAN.md) | Prioritized milestones, task checklists, acceptance criteria, and suggested follow-up features |
| [Technical design](docs/TECHNICAL_DESIGN.md) | Database migration, REST and Socket.IO contracts, finalization transaction, Firebase Auth, testing, and rollout |

The next development milestone is Phase 0 in the implementation plan: stabilize the existing API, introduce repeatable SQLite migrations and tests, and close the current security gaps before adding real-time behavior.

## Architecture

| Area | Current technology |
| --- | --- |
| Web client | Next.js 15, React 19, Tailwind CSS 3, Framer Motion |
| API | Node.js, Express 4 |
| Data | SQLite on a Fly.io persistent volume |
| Authentication | Temporary custom JWT flow backed by SQLite |
| Real-time transport | Not implemented; Socket.IO is planned |
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
cd server
npm install

cd ../client
npm install
```

Run the API on port `3000`:

```bash
cd server
JWT_SECRET=replace-with-a-development-secret npm start
```

Run the web client on port `3001`:

```bash
cd client
npm run dev
```

Then open [http://localhost:3001](http://localhost:3001).

Local setup is not fully portable yet: the API currently hard-codes `/data/test.db`, and the client currently defaults to the deployed API URL. Phase 0 replaces those values with `DATABASE_PATH` and `NEXT_PUBLIC_API_BASE_URL` environment variables. Until that work lands, take care not to point local development at production data.

## Available commands

| Directory | Command | Purpose |
| --- | --- | --- |
| `client` | `npm run dev` | Start Next.js on port 3001 |
| `client` | `npm run build` | Create a production client build |
| `client` | `npm run start` | Run the production client build |
| `server` | `npm start` | Start Express on port 3000 |

There is currently no automated test command. Adding unit, API integration, and multi-client end-to-end tests is part of Phases 0 through 3.

## Deployment

The API deploys from `server/`:

```bash
cd server
fly deploy
```

The SQLite database lives on the Fly.io volume mounted at `/data`. Back up that volume before applying future schema migrations.

## Security warning

The current authentication implementation stores passwords without hashing, stores its JWT in browser local storage, and exposes a database cleanup route without authorization. Do not treat the current build as production-ready. The implementation plan makes removal of the cleanup route and migration away from local passwords blocking Phase 0 and authentication work.