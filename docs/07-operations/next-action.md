# Next Action

Bedrock source mutations are now connected to real M-Bedrock-Dev analyzers.

Implemented:

1. source mutation generation;
2. selector broadening + tag-filter omission;
3. coordinate ±1;
4. structure/function reference redirects;
5. scoreboard objective substitution;
6. timing ±1 mutation;
7. real state-scope kill evidence;
8. real known-reference kill evidence;
9. real topology-outlier kill evidence;
10. survived-operator backlog output.

Next high-value work:

1. add Script API event drop/duplicate mutations and detect capability/event graph changes;
2. add function-graph mutation fixtures spanning multiple functions, not only one function body;
3. add domain-specific minimization for killed/survived source mutants;
4. automatically convert survived operator classes into targeted search tasks;
5. after detector gaps are reduced, begin dynamic invariant mining from known-good traces.

A survived coordinate mutation in a non-repeated context is expected evidence of insufficient oracle context, not a framework failure.
