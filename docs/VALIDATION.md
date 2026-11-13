# Validation — DealPilot

Current source reviewed on 2026-11-12–13 in `D:\proek\DEALPILOT`. Runtime: Node.js 24.22.2; browser: Microsoft Edge through Playwright.

| Command / check | Result |
|---|---|
| `npm ci` | PASS, 209 packages installed from the lockfile |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, 27 tests in 2 files, exit 0 |
| `npm run build` | PASS, exit 0 |
| `CI=1 npm run test:e2e` (PowerShell: `$env:CI='1'; npm.cmd run test:e2e`) | PASS on 2026-11-13, 20 tests, exit 0 (1.3 minutes) |
| `npm audit` | PASS, 0 vulnerabilities, exit 0 |
| `npm audit --omit=dev` | PASS, 0 vulnerabilities, exit 0 |
| Production browser smoke | PASS: overview, deals, contacts, tasks, history and settings at 390/768/1440 px; reload persistence; no page, console or HTTP errors |
| Documentation / publication files | PASS: local Markdown links resolve; no tracked runtime directories, database/credential files or files above 5 MiB; credential-pattern scan found no matches |

The browser suite covers contact/deal/task CRUD, client relationships, drag/drop and keyboard stage changes, KPI/currency/period filters, search, sorting, pagination, JSON and CSV, damaged imports, storage quota failures, migration, conflict rejection between tabs, confirmed recovery, responsive layouts and HTML escaping. The new backup regression exports and restores 1,800 contacts with notes near the 3 MiB limit.

## Interrupted runs and warnings

- The first sandboxed dependency install failed with EACCES accessing the npm registry. The network-enabled install succeeded.
- The first browser run reported all 20 scenarios successful but hung during process teardown and was interrupted; it does not count as an exit-0 run.
- After resuming, a run reused a stale local server and failed with ERR_CONNECTION_REFUSED. It was stopped and rerun with `CI=1`, which starts an owned server.
- Non-blocking dependency/build warnings are recorded in [DEPENDENCY_SECURITY](DEPENDENCY_SECURITY.md).

## Limits

NOT TESTED: Firefox, Safari/WebKit, physical mobile devices, manual screen-reader review and publicly deployed hosting. Backend accounts, cloud synchronization and real payments are not implemented. No third-party hosting was published.

The portfolio cover and screenshots show the actual application with fictional demo records. Four UI captures are refreshed by the existing browser suite. Temporary production screenshots and logs remain ignored; useful screenshots and tests remain tracked. The About/Topics suggestions are in [DEPLOYMENT](../DEPLOYMENT.md).
