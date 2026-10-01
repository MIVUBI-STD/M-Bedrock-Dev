export interface MetamorphicVariant<TInput> {
  id: string;
  input: TInput;
  relation: string;
}

export interface MetamorphicObservation<TOutput> {
  id: string;
  relation: string;
  disposition: "preserved" | "violated" | "error";
  output?: TOutput;
  reason?: string;
}

export interface MetamorphicCampaignResult<TOutput> {
  baseline: TOutput;
  observations: readonly MetamorphicObservation<TOutput>[];
  preserved: number;
  violated: number;
  errors: number;
}

export async function runMetamorphicCampaign<TInput, TOutput>(
  baselineInput: TInput,
  variants: readonly MetamorphicVariant<TInput>[],
  execute: (input: TInput) => TOutput | Promise<TOutput>,
  equivalent: (baseline: TOutput, candidate: TOutput, relation: string) => boolean,
): Promise<MetamorphicCampaignResult<TOutput>> {
  const baseline = await execute(baselineInput);
  const observations: MetamorphicObservation<TOutput>[] = [];
  for (const variant of variants) {
    try {
      const output = await execute(variant.input);
      const preserved = equivalent(baseline, output, variant.relation);
      observations.push({ id: variant.id, relation: variant.relation, disposition: preserved ? "preserved" : "violated", output, ...(preserved ? {} : { reason: "Declared metamorphic relation was not preserved." }) });
    } catch (error) {
      observations.push({ id: variant.id, relation: variant.relation, disposition: "error", reason: error instanceof Error ? error.message : "Metamorphic execution failed with a non-Error value." });
    }
  }
  return { baseline, observations, preserved: observations.filter((x) => x.disposition === "preserved").length, violated: observations.filter((x) => x.disposition === "violated").length, errors: observations.filter((x) => x.disposition === "error").length };
}
