# Runtime Action Handler Contract

This harness advertises only runtime actions implemented by
`scripts/action.js`.

The multiplayer disconnect/reconnect/session actions are
**server-simulated fixture controls**. They mutate harness tags and
fixture state on already-connected players. They do not prove actual
network disconnect/reconnect behavior.

Evidence from these actions therefore contains an explicit note that
the observation is server-simulated.

The global-state lease fixture currently supports command-backed values
for:

- `gamerule:<name>`
- `difficulty`
- `weather`
- `time`
- `daylock`

Exact baseline-value restoration requires a resource-specific reader.
If a baseline cannot be read safely, the handler clears lease ownership
and emits a note rather than fabricating a restored value.

For live client lifecycle proof, use an external multi-client adapter.
