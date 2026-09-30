import type {
  MinecraftRuntimeProfile,
} from "../../runtime-profile/src/index.js";
import type { CapabilityQuery } from "./types.js";
import { parseGameVersion } from "./version.js";

export function capabilityQueryFromRuntimeProfile(
  profile: MinecraftRuntimeProfile,
): CapabilityQuery {
  const gameVersion = parseGameVersion(profile.product.version);
  return {
    edition:
      profile.product.edition === "education"
        ? "education"
        : "bedrock",
    ...(gameVersion === undefined ? {} : { gameVersion }),
    experiments: [...profile.experiments],
  };
}
