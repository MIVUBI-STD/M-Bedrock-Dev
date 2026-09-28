# Review UI

Buildable Svelte prototype for the review-first M-Bedrock interface.

Current status:

- Svelte/Vite web shell is buildable;
- Review data comes from an `EngineeringReviewProjection` fixture through `buildReviewUiViewModel()`;
- the typed artifact loader exists and is proven through the CLI `review-model` path;
- browser file selection/runtime bridging is not connected yet;
- canonical diagnosis, priority, proof, repair, and validation truth remains in core/orchestrator owners.

Commands:

```bash
npm run review-ui:dev
npm run review-ui:build
npm run review-ui:preview
```

The repository verification pipeline runs the Review UI production build so Svelte compilation cannot silently drift.
