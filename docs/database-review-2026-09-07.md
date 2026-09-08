# Database review — 7 September 2026

Reviewed the working tree based on `7630af8`, including the live route-to-repository paths, Turso adapters, settings, synchronization, and migration runner. Query-count regressions run production SQL against isolated in-memory libSQL. Index comparisons use synthetic SQLite data; the measurements below describe database work, not production latency.

## Fixes delivered

| Area | Before | After | Evidence |
| --- | --- | --- | --- |
| Repositories grouped by organization | One organization query plus one repository query per organization | Two queries for any nonempty organization list; one for users without organizations | `__tests__/lib/repository-service.test.ts`: 1/5/50 organizations, membership isolation, empty groups, tracking and sorting |
| Organization AI settings | Six sequential settings reads | One query for the six requested keys | `__tests__/lib/ai-settings.test.ts`: defaults, threshold zero, saved model compatibility, key presence and query count. Categorization still reads the selected secret separately, so its settings work falls from seven reads to two. |
| Dashboard summary | Five queries, including repeated scans with identical filters | Three queries: tracked repositories, merged-period counts, creation-period statistics | `__tests__/lib/metrics-summary.test.ts`: period boundaries, old PRs merged recently, team/organization isolation, empty results and counts |
| Repository insights | Joining every review duplicated PR rows and distorted counts, averages and percentages | An indexed `EXISTS` check preserves one row per PR | `__tests__/lib/repository-insights.test.ts`: two PRs with three reviews previously reported four PRs. Additional reviews now leave PR totals and averages unchanged. |
| Migration compatibility | Fresh schema already contained AI columns; migration 2 tried adding them again and stopped before indexes and teams | Migration 2 adds only missing columns, preserving existing values; status checks the current schema version | `__tests__/lib/migrations.test.ts`: fresh, legacy and partially applied states, version-4 upgrade, repeated execution |
| PR range indexes | Repository lookups still scanned old PRs and sorted recent pages | Migration 5 adds `(repository_id, created_at)` and `(repository_id, state, merged_at)` | Query plans and repeatable benchmark below |
| Scoped settings writes | Nullable scope columns defeated the three-column uniqueness constraint; six-field saves needed twelve queries | Migration 6 archives duplicate rows, enforces separate user/organization uniqueness, and saves supplied fields with one atomic upsert batch | `__tests__/lib/migrations.test.ts`, `settings-upsert.test.ts`, and `ai-settings.test.ts`: chronological winner selection, ties, original values, scoped uniqueness, overlapping saves, null/empty/zero semantics and failure rollback |
| Native transactions | Separate HTTP `BEGIN`/write/`COMMIT` calls did not guarantee a shared transaction | Native libSQL write batches and transaction handles; every migration commits together with its version marker | `__tests__/lib/db-transactions.test.ts`: committed callback results, rollback, handle closure, batch failure and diagnostics without parameter values |
| Team performance | Joining authored PRs to all reviews multiplied rows and included unrelated reviews | Aggregate authored PRs and distinct reviewed PRs separately within the organization/repository scope, then combine contributors | `__tests__/lib/team-performance.test.ts`: repeated reviews, reviewer-only contributors, deleted authors, date boundaries, weighted averages and team isolation |
| Dashboard scope | Repository selection was missing from several query paths | Repository/team filters reach summary, recent PRs, categories, insights and time series; authentication resolves the selected member organization | `__tests__/lib/dashboard-repository-filters.test.ts` and `auth-middleware.test.ts`: combined filters, old records, foreign repositories/teams, selected-organization permissions and rejected selections |
| PR synchronization | Legacy sync loaded all PRs and started unbounded work; repeated PR/author lookups, writes and readbacks grew with every record | Shared core/legacy sync processes 100 PRs per page, deduplicates author lookups, batches changed rows and limits review requests to four at once; 100 unchanged PRs require two reads and one checkpoint write | `__tests__/lib/github-sync.test.ts`: pagination, update-based cutoff, paginated reviews, unchanged writes, concurrent retries, partial failures and monotonic checkpoints |
| Organization and sign-in synchronization | Repository lookup/write/readback loops, first-page-only discovery and heavy repository/member work during sign-in | Shared page batches preserve tracking flags and membership roles; sign-in awaits only organization associations, while explicit sync loads repositories and members | `__tests__/lib/github-organization-sync.test.ts` and `auth-bootstrap.test.ts`: 101 organizations/repositories/members, two repository page lookups, no unchanged repository writes and awaited lightweight bootstrap |

The grouped repository endpoint's N+1 branch is reachable when `/api/github/organizations/repositories` is called without `orgId`; the current repository manager normally sends a specific organization. The summary and settings improvements affect their normal paths.

## Index measurements

Run `python3 scripts/benchmark-database-indexes.py`. It creates 100,000 PRs across 100 repositories and 10 organizations, compares the existing indexes with migration 5, and prints query plans, result counts and approximate SQLite VM instruction counts. Python's standard-library progress handler measures instructions in increments of 100. All data stays in memory.

| Workload | Before | After | Result |
| --- | ---: | ---: | --- |
| Organization creation-date range | 50,300 | 900 | Same 280 PRs; covering repository/date range lookup |
| Organization merged-date range | 25,200 | 500 | Same 150 PRs; covering repository/state/merge-date lookup |
| Most recent 20 PRs in a repository | 16,800 | 500 | Same 20 PRs; temporary sort removed |

These counts depend on the fixture, SQLite version, and query plan. They do not imply equivalent reductions in HTTP latency. SQLite's [query-plan documentation](https://www.sqlite.org/eqp.html) explains the scan/search and temporary-sort evidence; its [query planner guide](https://www.sqlite.org/queryplanner.html) describes composite and covering indexes.

Migrations 5–7 are included in the runtime `MIGRATIONS` list in `lib/migrate.ts`, mirrored in their ordered SQL files and `lib/schema.sql`. Version 7 adds `repository_sync_state` for successful synchronization checkpoints. Existing deployed databases need the normal authenticated `POST /api/migrate` to reach version 7 before using the new settings upserts and checkpoint queries. No live database was accessed or migrated during this review.

## Settings migration and write semantics

Migration 6 keeps one row for each `(user_id, organization_id, key)` scope. It orders candidates by the chronological `updated_at` value using `julianday`, then descending ID for ties; invalid timestamps sort behind valid dates. Every displaced row, including its original ID, scope, value and timestamps, is copied into `settings_duplicates_v6_archive` before deletion. The archive has no cascading foreign keys, so deleting a user or organization does not erase these preserved values. This archive retains the same sensitive values as the original settings; no API exposes it and migration diagnostics do not print those values.

Archiving, deletion, both partial unique indexes and the migration version marker run in one native write batch. An injected deletion failure leaves all original rows and version 5 intact; retry then succeeds. Organization saves use one batch containing an `INSERT … ON CONFLICT DO UPDATE` per supplied key. Omitted fields remain unchanged, null clears a stored value while retaining the row, empty strings remain empty, and threshold zero remains zero. Updates preserve row IDs and creation timestamps. Defaults and saved-model compatibility remain in the read path. These operations use the SDK's [native batches and transactions](https://docs.turso.tech/sdk/ts/reference), with the existing callback transaction API retained.

## Team metric and filter definitions

Authored-PR metrics use PR creation dates within the requested window, through the current time. Review activity uses `submitted_at` within that window and counts each reviewed PR once per reviewer, excluding self-reviews. A current review of an older PR still counts. The reviewed PR must belong to the selected organization and repositories; its author may be absent. Contributor membership controls team selection independently of the author of a reviewed PR, so a team member's reviews of another team's PRs remain visible.

Team cycle time is total cycle hours divided by the number of merged authored PRs; size is total changed lines divided by authored PR count. Reviewer-only contributors do not dilute these averages. Review coverage is the percentage of selected authored PRs that have a non-self review by the current time. The collaboration index is distinct reviewer/PR contributions divided by authored PR count, so it may exceed one. The per-person review ratio has the same numerator and that person's authored PR count; a contributor with no authored PRs receives zero for this ratio while their review count remains visible.

Repository and team filters now apply to summary, recent PRs and their pagination count, category totals, repository insights, throughput and category time series. Explicit organization selection is accepted only from the authenticated user's organizations, and permissions are loaded for that selection. Adapter/authentication regressions verify these contracts; final dashboard URL and UI integration validation is recorded separately in the maintenance review.

## Synchronization and retry semantics

The repository sync routes and core adapter share `pull-request-sync.ts`. GitHub PRs are read in pages of 100 sorted by update time descending, so changes to old PRs are included. Each page resolves existing PRs once, deduplicates missing authors and writes changed PRs in a native batch. Source fields are updated without replacing categorization, and stale or identical concurrent snapshots do not overwrite a newer record. Submitted reviews are paginated separately, preserving review updates and preventing duplicates during retries. Groups of at most four review requests settle completely before returning an error.

A successful run saves its start time in `repository_sync_state.updated_through` and its completion time in `last_synced_at`. Both values advance monotonically. Later runs overlap the watermark by one minute; a caller cannot request a start date that skips unsynchronized changes. PR, review, API-page or database failures leave the successful checkpoint unchanged. Already committed pages remain available and retries skip unchanged PR writes while retrying their reviews. API responses expose processed/created/updated/unchanged counters and return failure status for incomplete work; `processed` counts PRs whose review synchronization also completed.

Organization, repository and member discovery also pages through results. Repository metadata writes preserve existing tracking choices, and new repositories start untracked for explicit selection. Organization membership bootstrap preserves existing roles and grants new associations member access. Sign-in waits for these associations, without fetching repositories or members. Heavy discovery runs through authenticated manual sync actions. The stale Vercel cron entry pointing to a nonexistent route has been removed; scheduled synchronization is not implemented. Vercel duration settings now point to the actual organization sync routes.

Memory and request concurrency are bounded for PR backfills, but total execution time still grows with the initial history and review count. A sufficiently large first sync can exceed the deployment request-duration limit; retrying preserves saved records but restarts from the last successful checkpoint. Durable background jobs or a resumable initial-backfill cursor remain future work. No live GitHub API or database was accessed for these changes.

## Highest-priority follow-ups

| Priority | Finding | Recommended next change |
| --- | --- | --- |
| P2 | **Date functions prevent range lookups in time-series queries.** `optimized-metrics.adapter.ts:173` and `optimized-pull-request.adapter.ts:253` wrap the filtered column in `DATE()`. The benchmark still uses roughly 61,500 instructions after the new index, versus 900 for a raw timestamp range. | Normalize timestamp storage and preserve inclusive-day semantics, then use raw start/exclusive-end timestamp bounds. Keep `DATE()` in grouping where needed. |
| P2 | **Review indexing should be measured against the shared sync path.** The earlier standalone `github_id` lookup was removed when webhooks adopted `savePullRequestReviews`. Current reads and writes combine `pull_request_id` with `github_id`; the old full-table benchmark no longer represents that caller. | Re-run the benchmark for the current compound predicates before adding a forward index migration. Decide uniqueness separately from performance. |
| P2 | **The dashboard team selector loads membership details it does not display.** `hooks/use-team-filter.tsx:134` requests full teams; the service loads every member/user record. Its query count is bounded, but result size grows with all memberships. | Return summaries using the existing `getTeamsWithMemberCount` for the selector; retain full member data for team management. |

Additional cleanup candidates: categorization reloads a category already in its fetched category list, and three category/status updates read back rows their caller discards. Several explicit indexes duplicate constraint indexes or their prefixes; compare write cost and production query plans before removing them.

## SQL write regression cleanup

Replacing mocked query results with SQLite execution exposed invalid double-quoted `now` literals. All affected sign-in, team, membership, repository/tracking, category, user and organization writes now use `datetime('now')`. Tests verify persisted fields, timestamp behavior and unchanged unrelated rows; sign-in tests execute both insert and conflict-update branches. The shared repository lookup also handles organization ID zero explicitly, preserving organization filtering when reused by the single-organization service.

## Verification

- All 338 Jest tests in 42 suites pass, including real SQLite settings/migration/transaction, team/filter and sync regressions, webhook/installation/AI-settings request contracts, DI registrations, and SWR/onboarding UI behavior.
- `bun run lint` and architecture checks pass without warnings; `bun run typecheck` passes.
- The separate coverage gate still fails its existing 60% thresholds for lines/statements (41.96%) and functions (48.08%). Branches reach 74.90%. All tests pass during the coverage run; collection now also includes hooks, root authentication and the request proxy.
- Production build passes in demo mode. Existing-data migrations were exercised only in disposable databases.
- Headless Chrome verified shared filters, actual refresh, navigation, browser history and reload against local demo APIs; no failed API responses/page exceptions. Desktop and 390px layouts are recorded in the maintenance review.
- The index benchmark produces identical result counts before and after migration 5.
- The static quality/test-map gates remain non-clean; their unresolved dynamic calls, syntax-duplication and added state/SQL complexity findings are documented in the maintenance review. No score suppressions or reduced thresholds were added.

Summary PR size now averages only records with both additions and deletions known; `sizedPRCount` distinguishes a measured zero from unavailable data. Tests cover missing/partial size data and zero-line changes.

Apply migrations through version 7 as part of rollout before using the new upserts/checkpoint reads. Production rollout, live GitHub synchronization and live migrations have not been exercised. The remaining follow-ups include durable initial backfills and additional query/index work.
