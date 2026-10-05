import { access } from "node:fs/promises";
import { constants } from "node:fs";

const VMRUN_PATHS = [
  "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe",
  "C:\\Program Files\\VMware\\VMware Workstation\\vmrun.exe"
];

export class VmwareWorkstationProvider {
  id = "vmware-workstation";

  async detect() {
    for (const path of VMRUN_PATHS) {
      try {
        await access(path, constants.X_OK);
        this.vmrun = path;
        return true;
      } catch {
        // Try the next supported installation path.
      }
    }
    return false;
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
