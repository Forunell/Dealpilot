# GitHub preparation — DealPilot

Reviewed on 2026-11-13 in the original project folder `D:\proek\DEALPILOT`.

- Origin: `https://github.com/Forunell/Dealpilot.git`.
- Existing working branch: `portfolio/verified-2026-11-11`.
- Fetched base: `0c166a704fedb1f164237c75c68d4838f380b0cf` (`origin/main`).
- Existing staged source changes, tests, documentation and genuine screenshots were preserved and reviewed.
- The owner explicitly authorized commits, pushing the working branch and updating `main` by fast-forward after successful checks.
- No force push, history rewrite or destructive cleanup is required.

## Publication procedure

1. Run the checks documented in [VALIDATION](VALIDATION.md).
2. Review staged changes and scan tracked files for credentials and unwanted runtime data.
3. Commit and push the existing working branch.
4. Fetch again and verify that `origin/main` is an ancestor of the reviewed commit.
5. Fast-forward local `main`, push `origin main`, then compare the remote branch hashes with the local commit.
6. If fast-forward or branch protections prevent the update, retain the published working branch and use a pull request.

`node_modules`, `.tools`, build output, browser reports, raw diagnostic logs and local databases are excluded. Screenshot PNGs, regression tests and useful technical documentation are included.

GitHub source publication does not deploy a public application. See [DEPLOYMENT](../DEPLOYMENT.md) for local launch, static hosting constraints and proposed About/Topics values.
