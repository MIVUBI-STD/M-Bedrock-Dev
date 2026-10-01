# Capacity and Concurrency Audit Contract

## Purpose

Audit must verify that advertised gameplay capacity matches actual playable capacity.

A system is not complete by checking isolation only. It must also check whether available instances, players, and sessions behave according to the intended design.

## Required Review

### Instance Availability

Check:

- number of available arenas/instances;
- number of playable sessions;
- whether all visible options can actually be used.

### Concurrency Contract

Check:

- maximum simultaneous matches;
- player group capacity;
- queue behavior;
- waiting state feedback.

### Design vs Limitation

Do not classify a limit as a bug automatically.

Determine first:

- Is the limit intentional?
- Is it documented in gameplay behavior?
- Does player expectation match the limitation?

## Bug Admission

A capacity issue is a defect when:

1. player-facing expectation contradicts actual behavior;
2. available gameplay surface cannot be used as intended;
3. limitation creates blocked or degraded gameplay without clear design communication.

## Example

Visible:

- 6 arenas available

Runtime:

- only 2 arenas can run simultaneously

Required questions:

- Are the other 4 arenas a queue pool by design?
- Is queue feedback visible?
- Was simultaneous usage promised by the game design?
