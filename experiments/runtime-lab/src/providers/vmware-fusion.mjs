import { access } from "node:fs/promises";
import { constants } from "node:fs";

const VMRUN = "/Applications/VMware Fusion.app/Contents/Library/vmrun";

export class VmwareFusionProvider {
  id = "vmware-fusion";

  async detect() {
    try {
      await access(VMRUN, constants.X_OK);
      this.vmrun = VMRUN;
      return true;
    } catch {
      return false;
    }
  }

  async status(clientId) {
    return { id: clientId, state: "NOT_PROVISIONED" };
  }

  async start(clientId) {
    throw new Error(`${clientId} is not provisioned yet.`);
  }

  async stop(clientId) {
    throw new Error(`${clientId} is not provisioned yet.`);
  }

  async reset(clientId) {
    throw new Error(`${clientId} is not provisioned yet.`);
  }

  async open(clientId) {
    throw new Error(`${clientId} is not provisioned yet.`);
  }
}
