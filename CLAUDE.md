# alis-portfolio-api

Before changing anything, read the ecosystem docs in the main repo: `../alis-portfolio/docs/ai/README.md` (architecture, conventions, non-negotiables).

Quick rules: zero cost, everything typed and Zod-validated, tests required, throw `GraphQLError` (not `Error`) for client-visible errors, keep `.js` extensions in imports. Verify with `yarn lint && yarn typecheck && yarn test`.
