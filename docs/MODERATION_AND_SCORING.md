# Moderation and scoring

## Campaign workflow

1. Sign in with a verified Firebase email/password or Google account.
2. Create a campaign manually or import JSON, then review the title, board size, theme, date, categories, and items.
3. Provide at least $n^2 - 1$ selectable items for an $n \times n$ board because the center is free.
4. Publish the draft to make its four-letter code public and accept boards.
5. Lock entries before the event outcome is known. Reopen only if board submission should resume.
6. Start moderation, then mark each item `Happened`, `Did not happen`, or `Pending`.
7. Finalize after reviewing the confirmation count. Every pending item becomes `Did not happen`, scores are persisted, and the campaign becomes read-only.

Keep the moderator page open during live play. Board viewers receive versioned Socket.IO notifications and automatically refetch after reconnect or a version gap. If the connection indicator reports an error, use its reconnect control and verify the current board snapshot before continuing.

## Outcome behavior

- `Happened` tiles are green and count toward scores.
- `Did not happen` tiles are red and do not count.
- `Pending` tiles are neutral before finalization and become red during finalization.
- The center free tile always counts as happened.
- Only the campaign owner can change outcomes or lifecycle state.
- Outcomes cannot change after completion.

## Scoring

The server evaluates every row, every column, and both diagonals. For each board it stores:

1. **Longest run**: the longest contiguous sequence of happened tiles in any evaluated line.
2. **Completed lines**: the number of rows, columns, and diagonals whose every tile happened.
3. **Matched tiles**: the total number of happened tiles, including the free center.

Boards rank lexicographically by longest run, then completed lines, then matched tiles, all descending. Equal tuples share a rank, and the next rank uses competition ranking. For example, two boards tied at rank 1 are followed by rank 3. Player name and board code only make display ordering deterministic; they do not break score ties.

Scoring rules are versioned. Finalization resolves pending outcomes, scores every board, writes campaign and board snapshots, and changes campaign state in one `BEGIN IMMEDIATE` transaction. Repeating finalization returns the existing snapshots rather than recalculating them.

## Release verification

Before a public event:

- Create test boards on at least two phones or browser contexts.
- Lock entries and confirm a late board is rejected.
- Change one outcome and verify both boards update without refresh.
- Disconnect and reconnect one viewer, then verify its snapshot catches up.
- Finalize with at least one pending item and verify it turns red.
- Open each result board from the leaderboard and confirm shared ranks display correctly.