# Review UI

Buildable Svelte prototype for the review-first M-Bedrock interface.

Current status:

- Svelte/Vite web shell is buildable;
- Review data comes from an `EngineeringReviewProjection` fixture through `buildReviewUiViewModel()`;
- the typed artifact loader exists and is proven through the CLI `review-model` path;
- the Vite development server exposes a controlled local runtime endpoint when `M_BEDROCK_REVIEW_ARTIFACT` is configured;
- browser file selection supports `.mcworld` and `.zip` through a streamed local-development upload boundary;
- successfully opened maps are copied into a managed local recent store under `.cache/review-ui/recent/`;
- successful analysis operations are recorded as bounded per-artifact history under `.cache/review-ui/history/`;
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


## Open map flow

In development mode, **Open map** uses the browser file picker. The selected file is streamed to a temporary local runtime file, analyzed, and then deleted. The browser never supplies an arbitrary filesystem path.

The current upload limit is 1 GB and only `.mcworld` / `.zip` are accepted. Recent-map rows are still explicit prototype examples until persistence is implemented.


## Recent maps

Recent maps use managed local copies rather than arbitrary original filesystem paths. The store keeps up to 8 artifacts under `.cache/review-ui/recent/`, which is already ignored by Git.

Opening a recent item re-validates the managed copy. Missing cached artifacts are reported as unavailable instead of silently falling back to another file.


## History

Runtime History records only actions that actually exist today: successful analysis from file open, recent-map open, re-analysis, or the configured development artifact. Repair and validation events are intentionally absent until those actions are wired to the UI.

History is bounded to 40 events per artifact and 240 total events.
