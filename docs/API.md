# Bongii API reference

The Express API uses the `/api` prefix. JSON requests must send `Content-Type: application/json`. Owner-only endpoints require a verified Firebase ID token in `Authorization: Bearer <token>`.

## Response behavior

- `400`: invalid request data
- `401`: missing, malformed, expired, revoked, or wrong-project token
- `403`: verified user lacks ownership, or the Firebase email is unverified
- `404`: resource or removed legacy endpoint not found
- `409`: invalid lifecycle transition, ambiguous profile link, or immutable completed data
- `429`: upstream Firebase authentication rate limit

Every response includes `X-Request-Id`. Error bodies use `{ "error": "message" }`; validation errors also include field details.

## Operational endpoints

| Method | Path | Contract |
| --- | --- | --- |
| `GET` | `/api/health` | Process liveness; returns `{ "status": "ok" }` |
| `GET` | `/api/ready` | SQLite readiness; returns `200` ready or generic `503` unavailable |
| `GET` | `/api/metrics` | Prometheus metrics for HTTP, Socket.IO, finalization, and migration state |

## Profiles

| Method | Path | Auth | Contract |
| --- | --- | --- | --- |
| `GET` | `/api/users/current` | Firebase | Synchronize and return the current local profile |
| `PUT` | `/api/users/current` | Firebase | Update `{ displayName, profileIcon? }` |
| `GET` | `/api/users` | Firebase | Return public profile fields for local users |

`POST /api/users` and `POST /api/login` no longer exist. Password registration, sign-in, verification, reset, and provider linking are Firebase client operations.

## Campaigns and boards

| Method | Path | Auth | Contract |
| --- | --- | --- | --- |
| `GET` | `/api/campaigns?group=&query=` | Public | Browse `open`, `awaiting`, or `results` campaigns |
| `GET` | `/api/campaigns/:code` | Public | Read a public campaign snapshot |
| `GET` | `/api/campaigns/validate/:code` | Public | Validate a public campaign code |
| `POST` | `/api/campaigns` | Firebase | Create a draft campaign |
| `POST` | `/api/campaigns/:code/board` | Public | Submit a complete board while entries are open |
| `GET` | `/api/campaigns/:code/boards` | Public | List submitted boards for a public campaign |
| `GET` | `/api/boards/:boardCode` | Public | Read an authoritative board snapshot |
| `GET` | `/api/boards` | Public | List boards |
| `GET` | `/api/campaigns/:code/results?page=1` | Public | Read paginated finalized results |
| `GET` | `/api/moderate/campaigns` | Firebase | List campaigns owned by the current user |
| `GET` | `/api/moderate/campaigns/:code` | Firebase | Read owner details and allowed actions |
| `DELETE` | `/api/campaigns/:code` | Firebase owner | Delete a non-completed campaign |

A campaign create body contains `title`, optional `description`, `backgroundPreset`, `boardSize` (`3`, `4`, or `5`), `startDateTime`, and one or more categories. A board body contains `playerName` and exactly one tile per board position; the center tile has no category item.

## Lifecycle and outcomes

| Method | Path | Result |
| --- | --- | --- |
| `POST` | `/api/campaigns/:code/publish` | `draft` to `open` |
| `POST` | `/api/campaigns/:code/lock` | `open` to `locked` |
| `POST` | `/api/campaigns/:code/reopen` | `locked` to `open` |
| `POST` | `/api/campaigns/:code/moderation` | `locked` to `moderating` |
| `POST` | `/api/campaigns/:code/cancel` | Eligible state to `cancelled` |
| `POST` | `/api/campaigns/:code/finalize` | Atomically score and complete a moderating campaign |
| `POST` | `/api/campaigns/:code/items/:itemId/outcome` | Set `{ status }` to `pending`, `happened`, or `did_not_happen` |

All lifecycle and outcome writes require the Firebase-authenticated campaign owner. Responses include the authoritative campaign version. Finalization is idempotent.

## Socket.IO

Connect to the API origin, then emit `campaign:join` with `{ campaignCode }`. A successful acknowledgement returns `{ ok, campaignCode, campaignVersion }`.

Server events are notifications; REST remains authoritative:

- `campaign:status`: status and campaign version
- `campaign:outcome`: item ID, outcome, decision time, and campaign version
- `campaign:finalized`: completion metadata and leaderboard path
- `campaign:snapshot-invalidated`: reason and campaign version

Ignore duplicate or stale versions. Refetch the REST snapshot after malformed events, version gaps, initial version mismatch, or reconnect.