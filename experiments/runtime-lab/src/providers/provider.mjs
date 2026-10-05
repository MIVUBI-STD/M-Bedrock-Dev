import os from "node:os";
import { VmwareFusionProvider } from "./vmware-fusion.mjs";
import { VmwareWorkstationProvider } from "./vmware-workstation.mjs";

export async function createProviderForCurrentPlatform() {
  const platform = os.platform();

  if (platform === "win32") {
    const provider = new VmwareWorkstationProvider();
    return (await provider.detect()) ? provider : null;
  }

  if (platform === "darwin") {
    const provider = new VmwareFusionProvider();
    return (await provider.detect()) ? provider : null;
  }

  return null;
}
