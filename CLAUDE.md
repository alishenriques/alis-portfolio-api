# alis-portfolio-api

Before changing anything, read the ecosystem docs in the main repo: `../alis-portfolio/docs/ai/README.md` (architecture, conventions, non-negotiables).

Quick rules: zero cost, everything typed and Zod-validated, tests required, throw `GraphQLError` (not `Error`) for client-visible errors, keep `.js` extensions in imports. Verify with `yarn lint && yarn typecheck && yarn test`.

## Scope and PR workflow (decided by Alisson, 2026-10-06)

- This API feeds two front-ends: `alis-portfolio` (corporate career portfolio only) and a future, separate services sales site. Keep types, resolvers and content generic, not tied to one site; a new consumer also needs its origin in `CORS_ORIGIN`.
- Big changes: new branch, then a detailed PR (what changed, what problem it solves, new or changed GraphQL types/operations and how to call them, migrations, architecture decisions, how it was verified). **Never merge without Alisson's explicit approval on the PR**; he reviews by commenting, so reply and fix on the same branch. Full rule: "Pull requests" in `../alis-portfolio/docs/ai/conventions.md`.
