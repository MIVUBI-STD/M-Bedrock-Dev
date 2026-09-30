# Experiments Agent Rules

Applies to bounded research under `experiments/`.

## Boundary

Experiments are non-authoritative. They may study future UI, architecture, heuristics, or external approaches, but production behavior must not depend on them.

## Rules

- Do not import experiment code/data from `engine/`, `apps/`, or `tooling/` production paths.
- Do not treat an experiment, benchmark, mock, or prototype as shipped capability or runtime proof.
- Promote only the minimal proven idea into its real canonical owner; do not move the experiment wholesale.
- Historical or abandoned experiments belong in Git history rather than permanent parallel architectures.
- Keep each experiment explicitly scoped and disposable.
