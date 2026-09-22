# Safe Transaction Application

Transactions may mutate only the working copy.

The application boundary enforces:

- target path must remain inside working root;
- target must not overlap immutable source root;
- preconditions are checked before mutation;
- replace-command requires exact line evidence and exact expected command text;
- replace-text rejects ambiguous multiple matches;
- writes use a temporary file and atomic rename;
- previously written files are restored if a later operation fails.

The returned rollback metadata contains prior working-copy text for successfully changed files. Original source artifacts remain untouched.

This is still source-level validation. It does not prove Minecraft runtime behavior.
