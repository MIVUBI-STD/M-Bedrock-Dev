# Benchmark Corpus Rules

- Prefer reduced/synthetic fixtures over full production maps.
- Do not commit private client maps as general regression fixtures.
- Keep positive and negative examples for material detectors.
- Version-pin Minecraft behavior when semantics changed across releases.
- Preserve known expected failures explicitly.
- Separate detector correctness from runtime-proof availability.
- Do not remove a difficult case because a new implementation cannot pass it.
- Corpus changes require a reason independent of the implementation under test.
