# Topology Outlier Fixture

This reduced fixture models four translated command groups. The fourth group intentionally contains one bad fill offset.

Expected baseline pattern:

- arena 1: X +0
- arena 2: X +100
- arena 3: X +200
- arena 4: X +300

The broken arena 4 command uses X +298 and should be repairable to X +300 through an explicit command-line patch transaction.
