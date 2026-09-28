# Review UI

Buildable Svelte prototype for the review-first M-Bedrock interface.

Current status:

- Svelte/Vite web shell is buildable;
- Review data comes from an `EngineeringReviewProjection` fixture through `buildReviewUiViewModel()`;
- the typed artifact loader exists and is proven through the CLI `review-model` path;
- the Vite development server exposes a controlled local runtime endpoint when `M_BEDROCK_REVIEW_ARTIFACT` is configured;
- browser file selection is not connected yet;
- canonical diagnosis, priority, proof, repair, and validation truth remains in core/orchestrator owners.

Commands:

```bash
npm run review-ui:dev
npm run review-ui:build
npm run review-ui:preview
```

The repository verification pipeline runs the Review UI production build so Svelte compilation cannot silently drift.


## Development runtime

To analyze a real local artifact while running the web UI:

```bash
M_BEDROCK_REVIEW_ARTIFACT=/absolute/path/to/map.mcworld npm run review-ui:dev
```

Optional target overrides:

```bash
M_BEDROCK_REVIEW_EDITION=bedrock
M_BEDROCK_REVIEW_VERSION=1.26.32
```

The browser cannot submit arbitrary local paths. The development server owns the configured path and exposes only review-model JSON to the UI.
