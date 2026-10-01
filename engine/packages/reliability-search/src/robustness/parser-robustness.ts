export interface TextRobustnessCase {
  id: string;
  mutation: "truncate" | "duplicate-span" | "insert-unicode" | "insert-null" | "line-ending-shift";
  text: string;
}

export interface ParserRobustnessObservation {
  id: string;
  mutation: TextRobustnessCase["mutation"];
  disposition: "accepted" | "rejected" | "harness-error";
  reason?: string;
}

export interface ParserRobustnessResult {
  observations: readonly ParserRobustnessObservation[];
  accepted: number;
  rejected: number;
  harnessErrors: number;
}

export function deterministicTextRobustnessCases(text: string): TextRobustnessCase[] {
  const midpoint = Math.floor(text.length / 2);
  const spanStart = Math.max(0, midpoint - 8);
  const spanEnd = Math.min(text.length, midpoint + 8);
  const span = text.slice(spanStart, spanEnd);
  return [
    { id: "truncate-half", mutation: "truncate", text: text.slice(0, midpoint) },
    { id: "duplicate-mid-span", mutation: "duplicate-span", text: text.slice(0, midpoint) + span + text.slice(midpoint) },
    { id: "insert-unicode", mutation: "insert-unicode", text: text.slice(0, midpoint) + "🧪Ω" + text.slice(midpoint) },
    { id: "insert-null", mutation: "insert-null", text: text.slice(0, midpoint) + "\\u0000" + text.slice(midpoint) },
    { id: "line-ending-shift", mutation: "line-ending-shift", text: text.replace(/\\r?\\n/g, "\\r\\n") },
  ];
}

export async function runParserRobustnessCampaign(
  cases: readonly TextRobustnessCase[],
  parse: (text: string) => "accepted" | "rejected" | Promise<"accepted" | "rejected">,
): Promise<ParserRobustnessResult> {
  const observations: ParserRobustnessObservation[] = [];
  for (const item of cases) {
    try {
      const disposition = await parse(item.text);
      if (disposition !== "accepted" && disposition !== "rejected") {
        observations.push({ id: item.id, mutation: item.mutation, disposition: "harness-error", reason: "Parser robustness callback returned an unsupported disposition." });
      } else {
        observations.push({ id: item.id, mutation: item.mutation, disposition });
      }
    } catch (error) {
      observations.push({ id: item.id, mutation: item.mutation, disposition: "harness-error", reason: error instanceof Error ? error.message : "Parser robustness callback threw a non-Error value." });
    }
  }
  return { observations, accepted: observations.filter((x) => x.disposition === "accepted").length, rejected: observations.filter((x) => x.disposition === "rejected").length, harnessErrors: observations.filter((x) => x.disposition === "harness-error").length };
}
