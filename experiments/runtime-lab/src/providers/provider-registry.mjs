import { discoverProviders, selectPreferredProvider } from "./provider-discovery.mjs";

export async function resolveRuntimeProvider({ requested = "auto" } = {}) {
  const providers = await discoverProviders();

  if (requested !== "auto") {
    const explicit = providers.find((provider) => provider.id === requested && provider.available);
    if (!explicit) throw new Error(`Requested provider is unavailable: ${requested}`);
    return { selected: explicit, detected: providers };
  }

  const selected = selectPreferredProvider(providers);
  return { selected, detected: providers };
}
