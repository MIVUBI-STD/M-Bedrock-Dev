# Security

M-Bedrock-Dev processes untrusted archives, JSON, scripts and world content.

Security-sensitive requirements:

- archive extraction must prevent path traversal;
- decompression must have bounded resource limits;
- source artifacts are immutable;
- mutations occur in controlled working/output locations;
- arbitrary scripts from analyzed content must never execute as part of inspection;
- external commands require explicit ownership and bounded arguments;
- reports must avoid leaking local filesystem secrets or credentials.

Report security issues privately to the repository maintainers rather than publishing exploit details in a public issue.
