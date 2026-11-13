# Dependency security — DealPilot

Validation on 2026-11-12 used the committed lockfile and local Node.js 24.22.2. `npm ci`, `npm audit` and `npm audit --omit=dev` completed successfully; both audit commands reported 0 vulnerabilities.

The previously prepared dependency fixes are retained: Zod 4.6.7, Vitest 4.1.12, and the scoped `@typescript-eslint/typescript-estree` override for minimatch 11.0.1. Application schemas, domain tests, lint, TypeScript, production build and browser scenarios were checked with these versions. No forced dependency upgrade was used.

The audit result reflects the npm advisory database at the time of the check; it is not a guarantee that vulnerabilities cannot exist. No cloud backend, authentication or multi-user server security is claimed.

Non-blocking warnings observed:

- npm marks ESLint 9.39.5 as deprecated.
- npm reports an esbuild postinstall script not covered by its allowScripts policy; the available platform binary successfully builds the application.
- Rollup removes two misplaced annotation comments in Zod; the build succeeds.

The initial sandboxed install could not access the npm registry. Installation succeeded with the required network access. Temporary caches and raw logs remain ignored under `.tools/`.
