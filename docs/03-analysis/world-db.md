# World Database Analysis

Initial world-database analysis is intentionally conservative.

The first analyzer classifies key representation only:

printable ASCII full key → ascii-named
otherwise → binary
empty → empty

It does not infer chunk, actor, player, or dynamic-property semantics from byte patterns yet.

That semantic work requires dedicated decoders and evidence-backed key layouts.

## Why conservative

Bedrock world DB keys include both named and binary records. A false semantic classification can lead directly to destructive repair if downstream code trusts it.

Unknown binary keys are preserved as bytes and are not eligible for semantic mutation until a dedicated decoder proves the layout.
