import type { ParsedScriptFile } from "../../../../analyzers/scripts/src/index.js";

export interface CinematicControlEvidence {
  cameraMethodCalls: number;
  fadeCalls: number;
  fadeTimingAuthored: number;
  restrictedCallbackCameraCalls: number;
}

export function analyzeCinematicControls(
  scripts: readonly ParsedScriptFile[],
): CinematicControlEvidence {
  let cameraMethodCalls = 0;
  let fadeCalls = 0;
  let fadeTimingAuthored = 0;
  let restrictedCallbackCameraCalls = 0;

  for (const script of scripts) {
    for (const call of script.methodCalls) {
      if (!/(?:^|\.)camera\.(?:setCamera|clear|fade)$|^(?:setCamera|clearCamera|fade)$/i.test(call.symbol)) {
        continue;
      }
      cameraMethodCalls += 1;
      const isFade = /(?:^|\.)fade$/i.test(call.symbol);
      if (isFade) {
        fadeCalls += 1;
        if ((call.argumentTexts ?? []).some((arg) =>
          /fadeTime|fadeInTime|holdTime|fadeOutTime/i.test(arg)
        )) {
          fadeTimingAuthored += 1;
        }
      }
      if (
        script.restrictedMutations.some((mutation) =>
          mutation.source.range?.lineStart === call.source.range?.lineStart
        )
      ) {
        restrictedCallbackCameraCalls += 1;
      }
    }
  }

  return {
    cameraMethodCalls,
    fadeCalls,
    fadeTimingAuthored,
    restrictedCallbackCameraCalls,
  };
}
