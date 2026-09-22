# Regression Corpus Fixtures

Each real bug that materially matters should eventually become a minimized regression case.

A regression case records:

- stable regression id;
- affected domain/capability tags;
- invariant(s) violated;
- trigger/reproduction sequence;
- expected vs observed behavior;
- first observed and last-known-good versions when known;
- optional redistribution-safe minimized fixture.

Do not store full private/client worlds here.

Preferred lifecycle:

```text
runtime/manual incident
→ minimize
→ invariant
→ regression case
→ fixture when safe
→ future update retest signal
```
