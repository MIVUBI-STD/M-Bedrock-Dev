# Runtime Lab Backend Acceptance

## Source proof

The Experimental backend workflow must pass on Windows and macOS:

```text
cargo fmt --check
cargo check --all-targets
cargo test --all-targets
```

Hosted compilation does not prove VMware or Minecraft runtime behavior.

## Target-machine proof

```text
doctor
→ Base present and stopped
→ provision
→ start 1
→ Virtual-01 manually playable
→ configure + set-ready Virtual-01
→ reset Virtual-01 and confirm QA_READY
→ prepare Virtual-02 and Virtual-03
→ resources 3
→ start 3
→ open Native manually
→ control Native + Virtual-01 + Virtual-02 + Virtual-03
→ verify acceptable responsiveness
→ stop all Virtual instances
→ start 3 again
→ verify recovery
```

Required observations:

- no operation-state corruption;
- each Virtual clone has independent identity/session state;
- all four players remain manually controllable;
- adaptive allocation leaves usable host headroom;
- no Virtual instance is resized while running;
- soft stop normally works;
- hard stop remains exceptional recovery;
- reset affects only the selected Virtual instance;
- reprovision affects only the selected stopped Virtual instance.

Frontend work starts only after the primary platform passes this backend acceptance.
