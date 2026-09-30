# Fixtures Agent Rules

Applies to reduced test/evidence fixtures.

## Rules

- Prefer the smallest reproducible input that protects a durable invariant.
- Never commit private/proprietary production worlds as fixtures.
- Synthetic fixtures must be labeled synthetic.
- A minimized real fixture must be redistribution-safe.
- Fixture purpose and expected behavior should be documented close to the fixture.
- Do not let fixture assumptions become semantic policy.
- Production bug fixes that can regress should gain a reduced fixture when practical.
