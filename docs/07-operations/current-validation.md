# Current Validation

Status: EXACT-HEAD SOURCE VERIFICATION ENABLED ON LOCAL

GitHub Actions evidence:

- commit `a65b93cff46f48b8a30e785ac06227b324a9d124` completed the Repository Policy workflow successfully;
- that policy-only success did **not** include TypeScript typecheck or Vitest because the Verify workflow previously ran on push only for `main`;
- the Verify workflow now also runs on every push to `Local`, so future Local commits receive repository policy + typecheck + Vitest proof automatically.

Historical proof:

- exact commit `27852249e008c6f178db68d3f7ff566ead4a02c8` completed Verify successfully;
- Node.js 24 setup, dependency installation, TypeScript typecheck and the then-current Vitest suite succeeded;
- later reliability, mutation, invariant-mining and repair-hardening work requires a fresh exact-head Verify run before source proof is promoted.

Still not proven:

- a genuine Minecraft-loadable mcworld fixture;
- Minecraft package import/load acceptance;
- production-map analysis;
- Minecraft runtime behavior.
