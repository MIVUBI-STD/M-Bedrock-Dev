# M-Bedrock-Dev

M-Bedrock-Dev is a modular Minecraft Bedrock and Minecraft Education content-engineering workspace for inspection, diagnosis, repair, modification, validation, and deterministic repackaging.

## Branch authority

```text
Local  → active development / working authority
main   → stable / release authority
```

## Canonical product flow

```text
Artifact
→ safe ingest
→ normalized project model
→ semantic/gameplay analysis
→ diagnostics
→ repair plan
→ transactional mutation
→ validation
→ deterministic package output
→ evidence report
```

## Selected-map gameplay audit

Production gameplay audit has one operator entry and one ordered authority chain:

```text
raw user request
→ AuditUserIntentEnvelope (search guidance only)
→ Pre-Audit Plan: what will be done / checked / proven / reported
→ chat confirmation
→ AuditUserIntentConfirmation
→ audit <selected.mcworld>
→ runSelectedMapAudit()
→ TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
→ Map Audit Output V2
```

Low-level analyzers, specialist audit documents, Work Session projections, and Bug Report tooling are subordinate. They may provide evidence or presentation, but they cannot authorize stage completion independently.

Production output rule: `SelectedMapAuditRun` is internal control-plane authority. The operator-facing output of `audit` is exactly one `Map Audit Output V2`, which carries control state, audit context, causal finding lanes, Audit Obligations, proof guidance, validation plan, honesty, replica context, and the read-only Vital Gameplay Knowledge Closure projection.

Detection honesty rule: risks, detection gaps, model gaps, unresolved runtime dependencies, incomplete counter-proof, and unclassified replica differences remain `Audit Obligation` work. They do not enter `BUG | DESIGN_MISMATCH` until selected-artifact causal analysis establishes a player-visible contradiction.

Prompt-intake rule: user symptoms, suspicions, expectations, design claims, historical examples, and scope requests may only add bounded search pressure. They never replace selected-artifact authority, never suppress canonical audit coverage, and never directly create a report finding.

Pre-testing confirmation rule: the user does not need to know symptoms. Before production work, show one compact Pre-Audit Plan describing the audit objective, systems/checks, proof strategy, requested focus, and expected output. Start the audit only after the user confirms that plan.

Operator work order: `docs/03-analysis/master-selected-map-audit-workflow.md`.

Executable checkpoint authority: `docs/03-analysis/mandatory-audit-procedure.md`.

Vital-knowledge projection: `docs/03-analysis/vital-gameplay-knowledge-closure.md`. It does not introduce a second audit path or authority.

## Project continuity and publication

Project work has one persistent path and one compact tracked registry:

```text
workspace/projects/<project-id>/   working continuity
workspace/project-registry.json    tracked current project summary
workspace/reports/                 canonical current Bug Report V2
```

Project lifecycle is derived from proof pointers rather than stored as a second status field:

```text
no approval proof
→ working

approval snapshot fingerprint
→ approved

approval snapshot fingerprint
+ complete Drive publication receipt fingerprint
→ drive-published
```

Approval readiness is computed on demand and is never persisted.

For audit projects:

```text
SelectedMapAuditRun
→ Work Session + compact project registry pointer sync
→ canonical Bug Report V2 when applicable
→ derive approval readiness
→ explicit user approval
→ immutable approval snapshot
→ historical issue projection (after approval)
→ registry approval proof commit
→ Drive publish plan from one DriveProjectBinding
→ verified publication receipt
→ registry publication proof commit when complete
```

Historical regression/failure-pattern knowledge may prioritize later audits but never proves a current defect.

Canonical details: `docs/06-system/project-lifecycle.md`.

## Repository map

```text
apps/          user-facing executable/UI surfaces
virtual-clients/ durable Virtual Clients runtime, guest, distribution, and acceptance product domain
docs/          canonical product, system, and operations documentation
engine/        Bedrock analysis and repair engine
experiments/   bounded non-authoritative research
tooling/       repository/developer/build/verification tooling
workspace/     project continuity + compact registry + tracked report handoff
```

### Engine map

```text
engine/
├── adapters/      external/container/format adapters
├── analyzers/     semantic analysis and derived diagnostics
├── fixtures/      minimized reproducible evidence
├── design/        Game Design schema/compiler system
├── knowledge/     Minecraft platform/runtime facts
├── contracts/     Engineering Contracts
├── packages/      reusable deterministic engine/control-plane modules
├── reliability/   reliability catalogs and history
├── rules/         versioned Bedrock/Education rules
├── runtime/       bounded runtime-proof harness content
└── schemas/       structural/internal schemas
```

The repository root is intentionally sparse. New top-level entries are allowed only for repository-wide configuration/governance or a durable product domain. Feature folders, fixtures, schemas, experiments, reports, and implementation subdomains must live under their canonical owner.

Interfaces remain thin: Bedrock semantics belong to `engine/`, not CLI/UI/tooling.

## Repository operating model

```text
AGENTS.md                    task routing / execution context
GITHUB_RULES.md              GitHub delivery / proof / STOP rules
CONTEXT.md                   stable architecture facts
docs/README.md               documentation router
.agents/skills/              bounded specialist procedures
DEV.cmd                      sole repository-level developer entrypoint
tooling/windows-toolchain/   developer/build routing
toolchain.json               toolchain authority
```

## Developer commands

```text
DEV.cmd setup
DEV.cmd doctor
DEV.cmd audit
DEV.cmd check
DEV.cmd test
DEV.cmd inspect <artifact>
DEV.cmd finalize-local
```

## Documentation

Start at `docs/README.md`. Read selectively by domain.

Historical audits, superseded architecture, abandoned experiments, and obsolete continuation belong in Git history or `experiments/`, not as parallel current-state authorities.
