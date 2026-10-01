# Bug Report UI Tooling

This directory owns server-side support for the Bug Report UI.

## Responsibilities

- GitHub canonical report persistence;
- revision-safe report loading and saving;
- closed-repair persistence bridge;
- client-report publication endpoint;
- Google Docs / Drive publication provider.

It does not own Bug Report semantics or document meaning.

Canonical owners:

```text
Bug semantics
→ engine/packages/bug-report/

Client document grammar
→ engine/packages/bug-report/DOCUMENT.md

UI
→ apps/bug-report-ui/

Server-side provider / transport
→ tooling/bug-report-ui/
```

## Publication flow

```text
canonical GitHub report revision
→ POST /api/bug-report/publish
→ buildBugReportPublicationPayload()
→ client document quality gate
→ GoogleBugReportPublicationProvider
→ native Google Doc
→ Drive PDF export
```

The publish route requires `expectedRevision`. If GitHub changed after the report was opened, publication returns a conflict instead of publishing stale content.

## Google provider

`GoogleBugReportPublicationProvider` is server-side only.

Constructor:

```ts
new GoogleBugReportPublicationProvider({
  accessToken,
})
```

The access token must never be sent to the browser or persisted in canonical report JSON.

The host is responsible for OAuth/token acquisition and refresh. The provider only consumes a valid token.

### Runtime environment

Vite dev/preview API wiring uses:

```text
M_BEDROCK_GITHUB_TOKEN         required for canonical GitHub report access
M_BEDROCK_GITHUB_OWNER         optional, default MIVUBI-STD
M_BEDROCK_GITHUB_REPOSITORY    optional, default M-Bedrock-Dev
M_BEDROCK_GITHUB_BRANCH        optional, default Local
M_BEDROCK_GOOGLE_ACCESS_TOKEN  optional; required only for client publication
```

Without the GitHub token, bug-report API routes fail closed with 503. Without the Google token, normal GitHub report reading still works but publication returns 503.

The token must have access sufficient to:

- read the audited map Drive item and its parent;
- create/update files in the map folder;
- read/write native Google Docs;
- export native Google Docs as PDF.

Current implementation uses Google Drive and Google Docs APIs directly through injected `fetch`; no Google SDK dependency is required.

## Drive destination

Publication uses canonical `report.map.drive`.

Resolution:

```text
map.drive points to folder
→ publish inside that folder

map.drive points to map/file
→ read its Drive parent
→ publish inside that parent folder
```

Do not infer a folder from a display name.

## Duplicate prevention

The provider uses exact name + MIME type + parent folder.

Google Doc:

```text
<Map Name> v<Map Version> - Bug Report
```

PDF:

```text
<Map Name> v<Map Version> - Bug Report.pdf
```

If the exact file already exists in the target folder, it is updated instead of creating another copy.

This makes Drive publication idempotent at the human file level.

## Google Docs rendering

The renderer uses:

- semantic Title / Heading styles;
- Aptos-based typography;
- explicit document margins;
- compact Issue Summary table;
- numbered reproduction lists;
- client-facing issue detail sections;
- text severity labels in addition to color.

Issue details remain linear rather than table-heavy to preserve readability and page flow.

Google Docs table creation is intentionally multi-stage:

```text
insert table
→ read structural indexes
→ fill cells
→ read back
→ style table
```

Do not collapse this into guessed indexes.

## PDF

PDF is always exported from the generated Google Doc.

There is no independent PDF content renderer.

The PDF file is then upserted in the same Drive folder.

## Failure behavior

Publication fails closed when:

- report revision is stale;
- publication provider is not configured;
- client document quality gate fails;
- Drive destination cannot be resolved;
- Google API request fails;
- table structure cannot be resolved;
- PDF export/upload fails.

Do not silently fall back to a different folder, local file, or alternate content model.

## Security

Do not:

- expose Google access tokens to Svelte/browser code;
- put tokens in report JSON;
- commit tokens;
- log Authorization headers;
- make Drive files public as part of publication;
- add broad sharing permissions automatically.

Sharing remains a user/Drive policy concern.
