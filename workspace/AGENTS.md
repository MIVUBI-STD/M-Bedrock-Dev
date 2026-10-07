# Workspace Agent Rules

Use `workspace/README.md` as the canonical workspace layout contract. Do not duplicate that tree here.

## Invariants

- Preserve existing report, audit, Drive, approval, and publication semantics while reorganizing physical storage.
- Discover projects from `workspace/projects/**/project.json`; do not create a second global project registry.
- Keep canonical report state inside its project or level `report/` scope.
- Keep generated HTML/JSON inside the matching `output/` scope.
- Never read generated output back as canonical report state.
- Original/current artifact identity must remain bound to the exact Drive file/version/fingerprint.
- Do not create empty optional folders or speculative lifecycle trees.
- Do not flatten a real multi-level game into unrelated top-level projects.
- Private user artifacts remain ignored and must not be committed.
- Planning/todo intent belongs in `planning/`, not `workspace/`.
