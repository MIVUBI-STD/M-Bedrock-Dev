function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function captureBaselineSurfaces(
  providers,
  requestedSurfaces,
  context
) {
  const requested =
    uniqueSorted(requestedSurfaces);
  const supportedSurfaces = [];
  const unsupportedSurfaces = [];
  const surfaceSnapshots = {};

  for (const surface of requested) {
    const provider =
      providers[surface];
    if (
      !provider ||
      typeof provider.capture !==
        "function" ||
      typeof provider.compare !==
        "function"
    ) {
      unsupportedSurfaces.push(
        surface
      );
      continue;
    }

    surfaceSnapshots[surface] =
      provider.capture(context);
    supportedSurfaces.push(
      surface
    );
  }

  return {
    requestedSurfaces: requested,
    supportedSurfaces,
    unsupportedSurfaces,
    surfaceSnapshots,
  };
}

export function compareBaselineSurfaces(
  providers,
  baseline,
  context
) {
  const perSurface = {};
  let residueCount = 0;
  let matches = true;

  for (
    const surface of
      baseline.supportedSurfaces ?? []
  ) {
    const provider =
      providers[surface];
    if (
      !provider ||
      typeof provider.compare !==
        "function"
    ) {
      return {
        complete: false,
        matches: false,
        residueCount: -1,
        unsupportedSurfaces: [
          surface,
          ...(
            baseline
              .unsupportedSurfaces ?? []
          ),
        ],
        perSurface,
      };
    }

    const result =
      provider.compare(
        baseline.surfaceSnapshots?.[
          surface
        ],
        context
      );

    const normalized = {
      matches:
        result?.matches === true,
      residueCount:
        Number(
          result?.residueCount ?? 0
        ),
      ...(result?.measurements ===
      undefined
        ? {}
        : {
            measurements:
              result.measurements,
          }),
      ...(result?.note === undefined
        ? {}
        : { note: result.note }),
    };

    perSurface[surface] =
      normalized;
    matches =
      matches &&
      normalized.matches;
    residueCount +=
      Number.isFinite(
        normalized.residueCount
      )
        ? normalized.residueCount
        : 0;
  }

  const unsupportedSurfaces =
    baseline.unsupportedSurfaces ?? [];

  return {
    complete:
      unsupportedSurfaces.length ===
      0,
    matches:
      matches &&
      unsupportedSurfaces.length ===
        0,
    residueCount,
    unsupportedSurfaces,
    perSurface,
  };
}
