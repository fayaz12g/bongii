# Bongii technical design

This document describes the target implementation for the product rules in [PRODUCT_SPEC.md](PRODUCT_SPEC.md). It is intentionally specific enough to turn into small pull requests, but endpoint and column names may change during Phase 0 cleanup.

## Current-state audit

The existing implementation has useful campaign, category, item, board, and tile tables, but several advertised capabilities are prototypes or dead paths:

- `server/index.js` declares campaign retrieval and creation routes twice.
- The start route calls `database.updateCampaignStatus`, which is not exported or implemented.
- The client has a results service method, but the server has no results route.
- Item outcomes can be written through REST, but the moderation page has no controls and there is no push transport.
- The board page owns a local `marks` array and lets viewers mark their own tiles.
- Board queries already join each tile to its campaign item's status, which is the correct source for authoritative display.
- SQLite initialization mixes schema creation and unconditional ad hoc migration attempts.
- Passwords are stored and compared as plain text; full user rows can be returned and logged.
- `POST /api/clean` is unauthenticated.
- There is no automated test suite.

Phase 0 addresses these defects before new game behavior is layered on top.

## Design principles

1. The server owns campaign state, item outcomes, and scores.
2. REST performs authenticated writes; Socket.IO distributes committed changes.
3. Every client can recover from missed events by fetching a complete snapshot.
4. State transitions and finalization are transactional and idempotent.
5. Completed results are immutable snapshots with a scoring rules version.
6. SQLite remains the game database; Firebase replaces only identity and password handling.
7. Public responses expose the minimum fields needed for a board or leaderboard.

## Target modules

```text
server/
|- app.js                         Express app factory
|- index.js                       HTTP and Socket.IO startup
|- config.js                      Validated environment configuration
|- auth/
|  `- verifyFirebaseToken.js
|- campaigns/
|  |- campaignRoutes.js
|  |- campaignService.js          Lifecycle and authorization
|  |- outcomeService.js
|  `- scoring.js                  Pure scoring functions
|- realtime/
|  `- campaignGateway.js
|- db/
|  |- connection.js
|  |- migrate.js
|  `- migrations/
`- tests/

client/src/
|- app/
|  |- leaderboards/
|  |- moderate/[campaignCode]/
|  `- boards/[boardCode]/
|- auth/
|- components/
|- lib/apiClient.js
`- lib/realtime.js
```

This is a target ownership map, not a requirement to perform one large refactor. Move code when the corresponding behavior is changed.

## Database design

### Migration mechanism

- Store numbered SQL migrations under `server/db/migrations`.
- Record each applied migration and checksum in `schema_migrations`.
- Run pending migrations before accepting HTTP traffic.
- Use a configured `DATABASE_PATH`; use a temporary file for integration tests.
- Enable `PRAGMA foreign_keys = ON` on every connection.
- Back up the Fly.io volume before production migration.

SQLite cannot add every constraint in place. For constrained enum migrations, create a replacement table, copy mapped rows, verify counts, swap tables, and recreate indexes inside a transaction.

### Campaigns

Retain core fields and add:

```sql
status TEXT NOT NULL CHECK (
  status IN ('draft', 'open', 'locked', 'moderating', 'completed', 'cancelled')
),
publishedAt TEXT,
boardCreationClosedAt TEXT,
moderationStartedAt TEXT,
finalizedAt TEXT,
cancelledAt TEXT,
version INTEGER NOT NULL DEFAULT 1
```

The migration maps `waiting` to `open` and `active` to `moderating`. `isActive` should be removed after callers use explicit states; soft deletion or archive state should not be conflated with play state.

### Campaign item outcomes

Replace the current `status`, `calledAt` meaning with:

```sql
outcome TEXT NOT NULL DEFAULT 'pending' CHECK (
  outcome IN ('pending', 'happened', 'did_not_happen')
),
decidedAt TEXT,
decidedBy INTEGER REFERENCES users(id)
```

Map `correct` to `happened`, `incorrect` to `did_not_happen`, and all other values to `pending`.

An optional `campaignItemOutcomeEvents` append-only table can record before and after values, actor, and timestamp. Add it with the first release if audit history is a launch requirement; otherwise retain only current outcome fields and schedule it as `P1` follow-up.

### Result snapshots

```sql
CREATE TABLE campaignResults (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaignId INTEGER NOT NULL UNIQUE,
  finalizedAt TEXT NOT NULL,
  finalizedBy INTEGER NOT NULL,
  rulesVersion INTEGER NOT NULL,
  FOREIGN KEY (campaignId) REFERENCES campaigns(id),
  FOREIGN KEY (finalizedBy) REFERENCES users(id)
);

CREATE TABLE boardResults (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaignResultId INTEGER NOT NULL,
  boardId INTEGER NOT NULL UNIQUE,
  rank INTEGER NOT NULL,
  longestRun INTEGER NOT NULL,
  completedLineCount INTEGER NOT NULL,
  matchedTileCount INTEGER NOT NULL,
  FOREIGN KEY (campaignResultId) REFERENCES campaignResults(id),
  FOREIGN KEY (boardId) REFERENCES playerBoards(id)
);
```

Add indexes for result pagination and campaign board lookup. Do not store a single `winnerBoardId`; shared ranks can produce multiple first-place boards.

### Users after Firebase migration

SQLite still stores application-specific profile and ownership data:

```sql
firebaseUid TEXT UNIQUE,
displayName TEXT NOT NULL,
email TEXT,
photoUrl TEXT,
legacyUsername TEXT
```

The Firebase UID becomes the external identity key. Email is profile data and must not be used as a foreign key because it can change. Remove the password column only after migration is verified and backed up.

## Lifecycle service

All state changes go through one service that checks current state, ownership, requested transition, and any transition-specific invariant.

| From | Action | To | Invariant |
| --- | --- | --- | --- |
| `draft` | publish | `open` | Campaign has enough selectable items for its board size |
| `open` | lock | `locked` | None; zero-board campaigns are allowed with confirmation |
| `locked` | reopen | `open` | Moderation has never started |
| `locked` | start moderation | `moderating` | Board creation is closed |
| `moderating` | finalize | `completed` | Finalization transaction succeeds |
| Any non-final state | cancel | `cancelled` | Owner confirms cancellation |

Every successful mutation increments `campaigns.version`. Updates should use a current-state predicate, for example `WHERE id = ? AND status = 'open'`, and verify that one row changed. That prevents stale concurrent transitions.

## REST API

The exact URL prefix remains `/api`. Use a consistent response envelope only if the existing client is migrated in the same slice.

### Public reads

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/campaigns?group=open&query=` | Browse open campaigns |
| `GET` | `/campaigns?group=awaiting&query=` | Browse locked and moderating campaigns |
| `GET` | `/campaigns?group=results&query=` | Browse completed campaigns |
| `GET` | `/campaigns/:code` | Campaign snapshot with public fields and version |
| `POST` | `/campaigns/:code/boards` | Create a board while open |
| `GET` | `/boards/:boardCode` | Board snapshot with campaign and tile outcomes |
| `GET` | `/campaigns/:code/results?page=1` | Paginated finalized leaderboard |

### Moderator writes

| Method | Path | Body or behavior |
| --- | --- | --- |
| `POST` | `/campaigns` | Create a campaign |
| `POST` | `/campaigns/:code/publish` | Draft to open |
| `POST` | `/campaigns/:code/lock` | Open to locked |
| `POST` | `/campaigns/:code/reopen` | Locked to open |
| `POST` | `/campaigns/:code/moderation` | Locked to moderating |
| `PATCH` | `/campaigns/:code/items/:itemId/outcome` | `{ "outcome": "happened" }` |
| `POST` | `/campaigns/:code/finalize` | Resolve pending, score, and complete |
| `POST` | `/campaigns/:code/cancel` | Cancel an unfinished campaign |

Mutation responses include the new campaign `version`. Outcome updates validate both campaign ownership and that `itemId` belongs to the campaign, preventing cross-campaign writes.

Use `409 Conflict` for an otherwise valid action that is illegal in the current state. Finalization accepts an idempotency key or treats the campaign's unique result row as the idempotency boundary.

## Real-time protocol

### Connection model

- Socket.IO runs on the same HTTP server as Express.
- A client joins `campaign:<CODE>` after the server validates that the campaign exists.
- Public board updates contain no profile or authentication data.
- Moderator writes still use REST, which keeps authorization and error handling testable.
- Fly.io and Vercel origins are explicit in CORS configuration; do not use wildcard credentialed origins.

### Server events

| Event | Payload |
| --- | --- |
| `campaign:status-changed` | `{ code, status, version, changedAt }` |
| `campaign:item-outcome-changed` | `{ code, itemId, outcome, version, decidedAt }` |
| `campaign:finalized` | `{ code, version, finalizedAt, resultsUrl }` |
| `campaign:cancelled` | `{ code, version, cancelledAt }` |

The server emits only after a successful commit. Payloads include no display names, user IDs, emails, or tokens.

### Reconnect behavior

The client tracks the last applied `version`:

1. Ignore an event with a version at or below the current snapshot.
2. Apply an event exactly one version ahead when its shape is valid.
3. Refetch the campaign or board snapshot after any version gap.
4. Always refetch after Socket.IO reconnect, because multiple changes may have occurred offline.

Socket events are notifications, not an event-sourced database. The REST snapshot remains authoritative.

## Scoring module

Expose a pure function similar to:

```js
scoreBoard({ boardSize, tiles, outcomeByItemId })
```

It returns `longestRun`, `completedLineCount`, and `matchedTileCount`. A separate pure `rankBoards(scores)` function assigns competition ranks.

Test at least:

- Empty and partially filled boards.
- Center free space on odd-sized boards.
- Runs interrupted by red, pending, or empty tiles.
- Every row, column, and diagonal orientation.
- Multiple completed lines sharing tiles.
- All-red and all-green boards for each supported size.
- Shared ranks and the rank following a tie.
- Tiles whose item ID is missing from the outcome map.

The scorer treats any unknown or pending outcome as not matched. In production, finalization first eliminates pending outcomes, so unknown data should also raise a structured integrity warning.

## Finalization transaction

Finalization is the highest-risk write and must occur in one database transaction:

1. Start `BEGIN IMMEDIATE` to serialize competing writers.
2. Load the campaign and verify owner and `moderating` state.
3. If a result already exists, return it as an idempotent success.
4. Update all pending campaign items to `did_not_happen` with actor and timestamp.
5. Load all boards, ordered tiles, and final outcomes.
6. Score and rank all boards with the pure scoring module.
7. Insert one campaign result and all board result rows.
8. Set campaign status and `finalizedAt`, then increment version.
9. Commit.
10. Emit `campaign:finalized` after commit.

Any failure rolls back item outcomes, result rows, and campaign state together. Never emit a completion event from inside the transaction.

## Firebase Authentication recommendation

Firebase Authentication is a good fit for Bongii's email/password reset and Google sign-in needs while Express and SQLite remain in place.

As checked against the official documentation on 2026-09-08:

- The no-cost Spark plan lists 3,000 daily active users for Tier 1 providers.
- Spark allows 1,000 verification emails and 150 password-reset emails per day.
- Phone verification SMS requires the Blaze plan and is not recommended for this project.
- Cloud Storage for Firebase requires the Blaze plan, although eligible storage usage may still fall within Google Cloud's Always Free allowance.

Sources: [Firebase Authentication limits](https://firebase.google.com/docs/auth/limits) and [Cloud Storage for Firebase setup](https://firebase.google.com/docs/storage/web/start).

Use Firebase Authentication for identity only:

1. The Next.js client signs in with the Firebase Web SDK.
2. It obtains an ID token and sends `Authorization: Bearer <token>` to Express.
3. Express verifies the token with the Firebase Admin SDK.
4. Middleware loads or creates the local user by `firebaseUid`.
5. Existing campaign ownership continues to reference the local integer user ID.

For profile pictures, first use the Google provider's `photoURL` or existing preset avatars. Direct uploads add billing, security rules, content validation, resizing, deletion, and abuse concerns; schedule them separately.

### Migration options

Choose after auditing current account count and email quality:

- Small user base: create Firebase accounts through a controlled reset flow and manually recover accounts without email.
- Larger user base: provide a one-time legacy login that verifies the old credential, requires a unique email, creates and links the Firebase account, then clears the local password.

Do not silently create Firebase accounts from all stored plaintext passwords. Minimize the period in which the legacy password route remains available and log migration status without logging credentials.

## Security baseline

Complete these alongside Phase 0 and Firebase work:

- Remove the cleanup route or restrict it to a non-production maintenance command.
- Use an origin allowlist instead of unrestricted CORS.
- Add secure headers, request body limits, validation, and rate limits.
- Never include password, Firebase UID, email, or auth token in public campaign, board, result, or socket payloads.
- Redact authorization headers and user records from logs.
- Keep Firebase service credentials in Fly.io secrets, never in client variables or the repository.
- Rotate the existing JWT secret after legacy authentication is removed.
- Decide whether board codes alone grant public read access; if so, retain enough entropy and rate-limit enumeration attempts.

## Test strategy

### Unit

- Lifecycle transition table.
- Scoring and ranking fixtures.
- Outcome mapping and response serializers.

### API integration

- Temporary SQLite database migrated from zero.
- Authorization and ownership for every write.
- Board submission versus lock concurrency.
- Outcome validation and cross-campaign item rejection.
- Finalization rollback, idempotency, and persistence.

### End to end

Use Playwright with separate browser contexts for one moderator and at least two board viewers:

1. Create a campaign and two different boards.
2. Lock entries and reject a late board.
3. Start moderation and change an item.
4. Observe the correct tile update in both relevant clients.
5. Disconnect one viewer, make more changes, reconnect, and verify its snapshot.
6. Finalize with pending items.
7. Verify red defaults, immutable boards, shared ranks, and leaderboard links.

### Accessibility and visual checks

- Automated Axe checks on browse, moderation, board, and leaderboard pages.
- Keyboard-only lifecycle and outcome controls.
- Screenshots at mobile, tablet, and desktop sizes.
- Reduced-motion screenshots and checks proving the particle canvas is absent.
- Contrast checks for every outcome and focus state.

## Deployment sequence

1. Back up the production SQLite volume and verify restore instructions.
2. Deploy code that understands both old and new columns where a compatibility window is needed.
3. Run migrations as a release step before serving traffic.
4. Verify health, migration version, campaign reads, and board reads.
5. Release lifecycle and outcome writes to the moderator UI.
6. Release socket listeners with HTTP snapshot fallback.
7. Enable finalization and results after scoring fixtures pass against staged campaign data.
8. Deploy Firebase authentication behind a migration flag, then remove legacy login after adoption is verified.

Rollback must never reverse a migration by deleting columns or result rows. Roll application code back to a version that can read the migrated schema, then restore from backup only for confirmed data corruption.