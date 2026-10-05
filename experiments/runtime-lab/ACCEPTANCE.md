# Runtime Lab Backend Acceptance

## Source proof

The Experimental backend workflow must pass on Windows and macOS:

```text
cargo fmt --check
cargo check --all-targets
cargo test --all-targets
```

Hosted compilation does not prove VMware, GPU, input, or Minecraft runtime behavior.

## Target-machine proof

```text
doctor
→ Base present and stopped
→ provision
→ verify Virtual identities are not DUPLICATE
→ start 1
→ Virtual-01 manually playable
→ inspect memoryLimitMb = 4096
→ inspect hostWorkingSetMb when available
→ suspend Virtual-01
→ confirm SUSPENDED
→ start 1
→ confirm resume to RUNNING
→ configure + set-ready Virtual-01
→ reset Virtual-01 and confirm QA_READY
→ prepare Virtual-02 / Virtual-03
→ resources 3
→ start 3
→ open Native manually
→ control Native + Virtual-01 + Virtual-02 + Virtual-03
→ observe host pressure and responsiveness
→ suspend one Virtual and confirm pressure improves
→ stop all Virtual instances
→ start 3 again
→ verify recovery
```

Required observations:

- no operation-state corruption;
- Base stays unchanged;
- linked clones remain isolated;
- Virtual identities are unique after initialization;
- 4 GB is a limit, not interpreted as measured host use;
- actual host working set can be lower than the limit;
- CRITICAL pressure blocks new starts but does not kill existing clients;
- suspend reduces active resource pressure enough to be useful;
- resumed client remains manually playable;
- soft stop normally works;
- hard stop remains exceptional recovery;
- reset affects only the selected Virtual;
- reprovision affects only the selected fully stopped Virtual.

Frontend work starts only after the primary platform passes this backend acceptance.
