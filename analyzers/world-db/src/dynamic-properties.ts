const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PersistedDynamicPropertyNamespace {
  identity: string;
  propertyIds: readonly string[];
}

export function extractDynamicPropertyNamespaces(
  value: unknown,
): PersistedDynamicPropertyNamespace[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => UUID_RE.test(key))
    .map(([identity, properties]) => ({
      identity,
      propertyIds:
        properties && typeof properties === "object" && !Array.isArray(properties)
          ? Object.keys(properties as Record<string, unknown>).sort()
          : [],
    }))
    .sort((a, b) => a.identity.localeCompare(b.identity));
}
