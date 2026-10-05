# Runtime Lab Backend Acceptance

Backend acceptance is split into source proof and real-machine proof.

## Source proof

The dedicated `Runtime Lab Backend` workflow on branch `Experimental` runs on Windows and macOS and must pass:

```text
cargo fmt --check
cargo check --all-targets
cargo test --all-targets
```

A green hosted workflow proves Rust source compatibility on the hosted OS runners. It does not prove that VMware, Minecraft Education, local accounts, GPU acceleration, or the target PC behave correctly.

## Target-machine proof

The backend is ready for frontend work only after the target machine completes this sequence:

```text
doctor
→ base VM present + stopped
→ provision
→ Virtual-01 starts and is manually playable
→ configure Virtual-01 and set-ready
→ reset Virtual-01 and confirm QA_READY recovery
→ repeat readiness for Virtual-02 / Virtual-03
→ start 4
→ manually control all four players
→ verify acceptable responsiveness
→ stop all
→ start 4 again
→ verify recovery
```

Required observations:

- no simultaneous-operation corruption;
- linked clones remain independent;
- each virtual client keeps its own sign-in/session identity;
- input remains usable on every client;
- normal gameplay interaction is practical at low graphics;
- soft stop normally succeeds;
- hard-stop fallback is exceptional, not normal;
- reset returns only the selected client to `QA_READY`;
- reprovision affects only the selected stopped virtual client;
- host remains within the resource gate.

## Proof boundary

Do not mark Windows or macOS runtime support as accepted from hosted compilation alone.

Frontend work may begin when:

1. hosted Windows/macOS Rust verification is green;
2. the primary target platform completes the target-machine proof above;
3. no backend architectural workaround is needed to make the lifecycle usable.

The second platform may remain explicitly unverified while frontend development starts, provided the provider boundary remains unchanged and the unverified status is visible.
