# Bug Report UI

Thin Svelte/Vite interface for M-Bedrock Bug Report V1.

The web UI is an import/view/export surface. It does **not** analyze Minecraft maps, diagnose bugs, or decide repairs.

Flow:

```text
ChatGPT / tester bug finding
→ M-Bedrock Bug Report V1 JSON
→ import and validate
→ review by bug finder category
→ export canonical JSON
→ ChatGPT / Codex repair
```

Report scope is intentionally strict:

- one export represents one tested map and one test session;
- map name, map version, Minecraft version, and related Google Drive map link are required;
- severity is `blocker | major | minor`;
- discovery source is `ai | tester | ai+tester`;
- AI code evidence and tester gameplay evidence remain distinct;
- canonical parsing, semantic validation, classification rules, normalization, and serialization live in `packages/bug-report/`.

Commands:

```bash
npm run review-ui:dev
npm run review-ui:build
npm run review-ui:preview
```

The Vite server is intentionally static. Previous local map-analysis endpoints, recent-map cache behavior, and analysis history are not part of the Bug Report UI product direction.
