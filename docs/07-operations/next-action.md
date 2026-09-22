# Next Action

Reliability Search now includes Bedrock-specific mutation testing.

Implemented:

1. selector-scope broadening mutations;
2. absolute coordinate ±1 mutations;
3. structure-reference redirect mutations;
4. reset/disconnect progress-preservation mutations;
5. phase-skip mutation;
6. shared cutscene-lock mutation;
7. source mutation campaign interface;
8. session mutation campaign;
9. killed/survived/invalid classification;
10. global and per-domain mutation scores.

Next high-value work:

1. connect source mutations to real command/graph/topology detectors so source mutants receive actual kill evidence;
2. add mutation operators for function redirect, scoreboard objective substitution, tag omission, event drop/duplicate and timing shift;
3. prioritize survived mutants as blindspot backlog;
4. add domain-specific failure minimization for surviving/killed cases;
5. only after that begin dynamic invariant mining from known-good traces.

Do not optimize for a single mutation-score number; inspect survived classes by domain.
