# Maintenance and UX review — 7 September 2026

Reviewed the working tree based on `7630af8`, the architecture guide, dependency configuration, API behavior, and the demo dashboard at desktop and 390px mobile widths. This was a focused maintenance pass, not a complete production security or accessibility audit. The existing `bun.lock` edits and `latest` dependency addition were preserved.

## Changes delivered

The subsequent [database review](./database-review-2026-09-07.md) adds query batching, corrected repository and team aggregates, atomic settings writes, migration repairs, and measured index improvements. It records the metric definitions and migration policy in detail.

- **Category analytics:** support the dashboard's default 14-day period in API totals, time series, chart labels, and chart cutoffs. Team totals now select that team's authors within the requested organization. Invalid category filters return HTTP 400. Regression tests execute the production query against in-memory libSQL.
- **Authentication configuration:** reject application contexts without organization read permission; respect an explicit `NEXTAUTH_URL`; report the correct GitHub private-key environment variable.
- **Dashboard data scope:** apply repository/team/date selections to summary, recent PRs and their pagination count, category totals, repository insights and time series. Explicit organization selection must match the user's memberships and uses that organization's permissions. Real SQLite and middleware regressions cover combined filters, foreign scopes, old records and denied selections; completed URL/UI integration checks are recorded below.
- **AI categorization:** upgrade to `ai` 7.0.93, Google provider 4.0.64, OpenAI provider 4.0.60, and Anthropic provider 4.0.49. Update Google provider creation and prompt instructions for AI SDK 7. Recommend stable `gemini-3.8-flash` for new Google settings, preserve existing `gemini-3.5-flash` selections, and resolve the retired Gemini 2.5 Pro preview ID to stable `gemini-2.5-pro` when reading saved settings. Remove raw AI settings and API key values from server logs.
- **Team query performance:** route the canonical team-with-members loader through the existing single-query implementation. Preserve membership timestamps and valid zero/empty IDs. Real in-memory libSQL tests verify organization isolation and returned records for 1, 5, and 50 teams: query counts drop from 2, 6, and 51 respectively to one per request.
- **Team metric correctness:** aggregate authored PRs and distinct reviewed PRs separately, scope reviews by their submitted date and the reviewed PR's organization/repository, and include reviewer-only contributors and PRs whose authors were deleted. Team membership follows the contributor. Team cycle/size means are weighted by PR counts; coverage measures selected authored PRs with a non-self review. Seven SQLite regressions cover these definitions, duplicate reviews, boundaries and isolation.
- **Settings and transaction safety:** migration 6 retains the newest scoped setting by chronological update time and ID, archives every displaced original row, and installs separate partial unique indexes for users and organizations. Saves use one atomic batch of upserts, preserving omitted/null/empty/zero semantics. Native libSQL transaction handles replace separate HTTP transaction statements, and migrations commit their SQL and version marker together. Migration 7 adds synchronization checkpoints. No live database was migrated.
- **Request and UI state:** reuse the existing SWR hook for recent PRs, isolate responses by filter, retry within the table, and provide useful empty states. Quality analysis no longer spins forever on empty results.
- **Quality calculations:** correct reversed size/speed score bounds and include insertion-only/deletion-only PRs in size analysis. UI regression tests verify that small, fast PRs score better than large, slow ones. The distribution issue below remains open.
- **Accessibility and layout:** wrap dashboard filters on narrow screens, label controls, announce errors, expose the active navigation link, make the quality chart control keyboard accessible, and remove implementation badges from metric panels.
- **Build health:** consolidate the two competing Next.js configs, remove obsolete PPR configuration, correct Recharts formatter types and test fixtures, fix onboarding callback dependencies, and remove unused Jest transformers.
- **Repeatable checks:** use Bun 1.4.2 and the authoritative `bun.lock`, require Node 24+ or 22.13+ within the 22.x series, and add a `typecheck` command and a GitHub Actions workflow for frozen installation, lint, types, tests, and build. Dependabot follows Bun for this manifest. Package scripts use `bun run`; the test runner remains Jest.
- **Setup documentation:** correct the migration request method and authorization requirements, canonical environment example, and runtime prerequisites.

The September 8 follow-up upgrades the complete lint chain: ESLint 10.10.0, typescript-eslint 8.70.0, React Hooks plugin 7.1.1, TypeScript import resolver 4.4.5, and Node import resolver 0.4.0. Next.js and its ESLint config remain aligned at 16.3.4; React/React DOM were already current at 19.2.8. The latest React (7.37.5), import (2.32.0), and accessibility (6.10.2) plugins still advertise ESLint peers through version 9 and use removed context APIs. ESLint's official `@eslint/compat` 2.1.1 adapts those rules; this is a tested compatibility configuration, not a claim of native upstream support. Resolver overrides cover the older ranges requested by Next's config. Dependabot now groups this chain and no longer holds ESLint on version 9.

An executable ESLint API probe compared 172 enabled rule entries across representative TS/TSX files and exercised React, Hooks, TypeScript, accessibility, Next, and import diagnostics, including successful project-alias resolution and rejection of a nonexistent alias. No enabled severity was reduced. The one upstream retirement is `react-hooks/component-hook-factories`, removed in Hooks 7.1 and retained upstream only as a deprecated no-op; re-enabling it would provide no check. See the [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0) and [official compatibility package](https://www.npmjs.com/package/@eslint/compat).

## Completed dashboard and onboarding work

- Shared organization, team, repository and 7/14/30/90-day filters now drive every dashboard panel, lifecycle, analytics and repository insights. URLs support sharing, Back/Forward and reload; explicit URLs take precedence over saved filters. Organization switches reset dependent selections, and stale responses cannot replace current data.
- Refresh revalidates the current SWR entries and filter lists. Failed revalidation retains the last good data and reports an error; successful refresh time is separate from the latest successful repository sync time. Sync coverage is explicit when only some repositories have completed a sync.
- Removed duplicate server-enhanced chart implementations that could render the primary organization's data under a different selection. Removed unused cache helpers and the unsupported daily-completeness heuristic. Authenticated responses use private/no-store caching; SWR provides the browser's application cache.
- Replaced hardcoded 48-hour delivery, 24-hour feedback, invented focus hours and directional changes in headline cards with measured merged/open PR counts, recorded size, and categorization coverage. Size averages exclude missing additions/deletions and distinguish unavailable data from a recorded zero-line change.
- Replaced the fabricated 40/40/20 quality distribution with PR sample counts, data coverage and measured means. Remaining quality scores explicitly describe their size/speed heuristic. Review/coding estimates in flow charts are labeled with their formulas.
- Onboarding verifies installation and repository access, provides retry/reconnect states, ignores late responses, and blocks advancement after empty or failed requests. Removed unsaved API-key and tracking controls; the final step links to the existing Settings flow that persists configuration.
- Contributor rows show created/reviewed PR counts and metric definitions instead of an ambiguous review-quality percentage. Mobile contributor values stack, chart legends wrap, and priority tabs fit without overflowing.
- Demo PRs use relative dates, canonical repository IDs and scoped pagination. Demo contribution counts reconcile; aggregate/time-series demo data remains explicitly labeled simulated.

Headless Chrome checked real local demo routes in both development and production builds at 1365px and 390px. All six dashboard panels received the same selected filters; Refresh issued new requests; sidebar navigation, Back/Forward and reload retained selections. No page exceptions or failed API responses occurred. The mobile document width is exactly 390px after fixing legend overflow. Screenshots: [desktop](screenshots/dashboard-desktop.png), [mobile](screenshots/dashboard-mobile.png).

## Dead code and weak-test cleanup

Measured against the working tree at the start of this cleanup, after the earlier maintenance changes:

| Area | Net lines removed |
| --- | ---: |
| Application source and obsolete generator | 6,379 |
| Abandoned dashboard JSON fixtures | 9,884 |
| Tests and test scaffolding, including new regression cases | 964 |

Deleted 51 unused source, fixture and test-support files. Removed 18 direct dependencies and updated `bun.lock`; the active demo adapters and landing-page motion library remain in use.

- Deleted unused dashboard widgets, landing experiments, server forwarding components, cache controls, duplicate theme/provider wrappers and their orphaned dependencies. Removed the obsolete mock-data generator and its package script.
- Removed the unused GitHub forwarding adapter, duplicate service-locator singleton cache, grouped service loaders, hook-style wrappers, unused repository getters and three metrics contracts that returned empty or fabricated data. Typed getters and registered production/demo adapters remain because routes use them.
- Removed an unused parallel environment validator, server HTTP self-call, test-only crypto exports, commented-out KV integration and missing-function deployment placeholders. Repository grouping reuses the existing user-scoped query; ID zero remains explicitly scoped.
- Deleted 17 auth cases that tested configured mocks or local toy implementations, unreliable signature timing measurements and duplicate query-count runs. Replaced SQL-string/result mocks with real SQLite CRUD, mapping, search and isolation checks. Migration routes now use native Next request/response objects. Signature checks use an independently generated HMAC vector.
- The SQLite checks exposed invalid `datetime("now")` literals. Fixed every occurrence in sign-in persistence and team, membership, repository, tracking, category, user and organization updates. Regression checks execute those writes against SQLite, including sign-in insert/conflict-update paths. Added real single-organization coverage, including organization ID zero and inaccessible organizations.
- Mounted the existing toast host, removed an inert export control and redundant Suspense skeletons, and made component errors consistently visible with Retry. AI settings now preserve saved keys when inputs are blank and require an explicit removal action to clear one. Removed debug logging of settings payloads and API keys. UI regressions exercise key preservation/removal and error recovery.

At the end of that cleanup, the suite had 251 tests in 35 suites. Fewer tests were intentional: mock self-tests and repeated scenarios were removed, while real SQL, authorization, retry, rollback and UI behavior checks remained. The subsequent boundary coverage is described below. No new generic frameworks, lower coverage thresholds or quality suppressions were introduced.

## September 8 boundary coverage and simplification

- Added request-level checks for AI settings, installation management, webhooks and the request proxy, plus real demo/production DI registration checks. These execute actual handlers and isolated SQLite where persistence matters, replacing only session and external API boundaries. Fixtures exercise denied scopes, malformed inputs, failed writes and retries rather than asserting mock configuration.
- Installation lists, details, syncs and token-cache actions now verify organization access. First-install bootstrap requires both the user's GitHub organization membership and installation access. Foreign installations remain hidden; IDs reject suffixes and unsafe integers; partial synchronization returns a failure status. Organization insertion now preserves installation IDs, and SQLite repository flags map to actual booleans.
- Webhook validation requires a delivery ID, validates signature encoding, enforces the 5 MB limit on bytes actually read, and reserves only fully validated deliveries. Failed processing releases the claim so the same delivery can retry. Installation repository failures propagate instead of being swallowed; retry tests verify already persisted repositories are not duplicated. The cache is bounded to 10,000 entries and remains process-local with a five-minute lifetime. The proxy no longer mistakes GitHub's opaque delivery ID for a timestamp.
- Reviews use the existing shared persistence path, creating missing reviewers and updating later review states. Removed the two obsolete review repository helpers. DI resolution now shares in-flight singleton construction and permits retry after construction failure. AI-settings errors reject malformed JSON/IDs and avoid returning unexpected database diagnostics that may contain keys.
- Onboarding uses SWR for organization/repository requests; filters use one URL normalization/persistence effect instead of four. Measured cognitive complexity fell from 80 to 59 for onboarding and 62 to 58 for the filter provider during this follow-up. Mobile detection uses `useSyncExternalStore`; chart defaults follow viewport changes without overwriting an explicit selection.
- AI, category and repository settings use keyed SWR data rather than mirrored fetched-state effects. AI organization selection is controlled by the parent; an organization-scoped draft and captured save endpoint preserve edits when requests complete out of order. Failed initial loads offer Retry without exposing an editable form; a completed save followed by failed reload reports both outcomes accurately. Provider fields share one metadata-driven block, and metrics reuse the shared JSON fetcher.
- UI regressions cover organization switches, stale responses, save/edit races, key preservation/removal, failed refreshes and permission changes. Webhook controls disable after access revalidation fails even if SWR retains cached grants; partial initial-sync results refresh tracking and show the server's warning.

Coverage now includes `hooks/`, root `auth.ts`, and `proxy.ts`, which the earlier configuration omitted. The broader denominator makes comparison conservative: the follow-up raises measured coverage while also exposing previously unmeasured code. Global thresholds remain 60%.

## Remaining maintenance work

1. **Coverage at important boundaries.** The global 60% coverage gate still fails for lines/statements/functions. Branch coverage now exceeds the threshold. Keep expanding route, webhook and deployment integration coverage before wider refactors.
2. **Very large initial syncs.** Memory and concurrency are bounded, but a full initial backfill can exceed a deployment request timeout. Durable jobs or a resumable initial-backfill cursor remain future work. The nonexistent cron configuration has been removed.
3. **Team-first information hierarchy.** The contributor block still appears above the headline cards. A later product/design pass can lead with PR age and review bottlenecks and make individual activity secondary.
4. **Finish architecture migration in small slices.** Keep new behavior behind core ports/adapters and migrate legacy routes when changing their behavior. Dashboard pagination now rejects non-finite, fractional and out-of-range query values with HTTP 400.

## Verification and limits

Integrated validation uses Bun 1.4.2 and Node 26.5.0 locally; CI uses Node 24. The final results are recorded below.

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed; final dependency check required no lockfile changes |
| Production build in demo mode | Passed |
| TypeScript and generated route types | Passed |
| ESLint and architecture boundaries | Passed, with no lint warnings |
| Jest tests | All 338 tests in 42 suites passed |
| AI SDK/provider integration | Passed with injected fetch; verified the Gemini 3.8 endpoint, serialized instructions, and returned text without a network call |
| Coverage gate | Failed: 41.96% lines/statements, 74.90% branches, 48.08% functions; the global threshold is 60% (branches pass) |

The new workflow runs tests without the coverage threshold; `bun run test:ci` remains a separate coverage gate and is still failing. This distinction is intentional and should remain visible until coverage is adequate. Lines/statements improved from 29.92% to 41.96%, functions from 37.03% to 48.08%, and branches from 69.49% to 74.90%, with the wider collection scope. AI-settings handlers and the filter/onboarding code have full measured line coverage; this describes executed code, not exhaustive behavior. ESLint 10 reports no warnings; no warning suppressions were added.

Live UI checks used the built-in demo. No production credentials, live GitHub installation, database migration, deployment, or authenticated end-to-end flow was exercised. The SQL regressions use an isolated in-memory database. The GitHub Actions workflow has been added locally; its first remote run will happen when these changes are pushed.

The static quality gate remains non-clean: 51 gating findings against git HEAD across the entire accumulated maintenance diff, not just the September 8 follow-up. The count comprises 30 syntax-duplication findings, 11 unused-graph findings, seven complexity findings, two size findings and one similar-helper finding. Real remaining complexity is in filters, metrics, header/quality rendering and the expanded webhook validator; the migration list also grew. Onboarding complexity improved below its HEAD baseline, and AI settings no longer add a nesting regression. Existing Radix wrappers, straightforward repository lookups and demo search produce syntax matches that are not reasons to invent generic abstractions. Registered SWR fetchers, JSX handlers, domain port implementations, fixture date getters and the SQLite progress callback produce unresolved/unused graph findings despite runtime use. The static test map also misses most Jest/DI edges, so its output was reviewed alongside actual Jest coverage and the full suite; neither static gate is reported as passing. No suppressions or lower thresholds were added.

Framework/tooling references: [Next.js 16 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [Next.js Jest integration](https://nextjs.org/docs/pages/guides/testing/jest), [ESLint 10 migration guide](https://eslint.org/docs/latest/use/migrate-to-10.0.0). Accessibility review used the [Vercel interface guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md).

The AI update follows the [AI SDK 7 migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0), [Gemini 3.8 Flash documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), and [Gemini model deprecations](https://ai.google.dev/gemini-api/docs/deprecations). Bun setup follows its [override configuration](https://bun.sh/docs/pm/overrides) and [GitHub Actions setup](https://github.com/oven-sh/setup-bun); Dependabot supports the [Bun ecosystem and text lockfile](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories#bun).
