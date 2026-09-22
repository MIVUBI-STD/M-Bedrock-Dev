# Security Policy

M-Bedrock-Dev processes untrusted archives, JSON, scripts, NBT/LevelDB data, filesystem paths, identifiers, commands, and user-supplied world content.

## Sensitive data

Never commit credentials, tokens, private keys, production configuration, account data, private player data, proprietary client worlds, or access details.

## Artifact safety

Security-sensitive boundaries include:

- archive path construction and extraction;
- decompression size/file-count limits;
- duplicate/case-colliding paths;
- symlink or destination escape;
- arbitrary script execution;
- JSON/NBT/LevelDB parsing;
- filesystem mutation;
- command construction;
- external process invocation;
- package output destinations;
- user-provided paths and filenames.

Original artifacts remain immutable.

Fail closed for unsafe archive paths, stale patch preconditions, ambiguous replacement, unsupported destructive mutation, or uncertain destination ownership.

Analyzed script content must never be executed merely because it exists in an artifact.

## Dependency safety

New runtime dependencies require a concrete capability gap, active maintenance review, license/security review, and bounded ownership. Prefer standard-library/native capability or an existing dependency when sufficient.

## Logging and reports

Do not expose secrets, absolute private paths, or unnecessary user data in diagnostics. Preserve enough evidence to debug without leaking unrelated content.

## Reporting

Report sensitive findings privately to repository maintainers rather than publishing exploitable details in a public issue.
