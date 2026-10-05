# Archive Safety

User-supplied Bedrock archives are untrusted input.

The generic archive boundary must reject:

- absolute paths;
- parent traversal;
- Windows reserved device paths;
- duplicate normalized paths;
- case collisions that are unsafe on common target filesystems;
- excessive path depth;
- excessive file count;
- excessive expanded byte volume;
- excessive single-file expansion;
- suspicious compression ratios.

The current implementation provides path and inventory validation contracts. It intentionally does not yet choose a ZIP transport library or write extracted bytes to disk. That decision should be made separately so transport mechanics do not own safety policy.
