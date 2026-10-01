# Map Bug Audit Specification

## Intent
Use stable detection capability to classify target-map bug candidates without changing the detector.

## In scope
- map-specific inspection/retest;
- defect vs designed-behavior vs ambiguity;
- proof-ceiling classification;
- detection-gap handoff.

## Out of scope
- engine detector development;
- target repair;
- generic product development.

## Evidence model
Expected-behavior authority and observed evidence are independent. Platform Knowledge explains Minecraft behavior but never defines Map Game Design.

## Acceptance
- every candidate has one disposition;
- defects alone receive Blocker/Major/Minor;
- proof ceiling is explicit;
- unresolved detector limitations become detection-gap;
- no engine or target mutation occurs.

## Limits
Static/package evidence does not prove live runtime behavior. Unknown design remains ambiguous rather than defaulting to defect.
