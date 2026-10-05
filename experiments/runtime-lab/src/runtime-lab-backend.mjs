import os from "node:os";
import { runDoctor } from "./doctor.mjs";
import { ClientRuntime } from "./client-runtime.mjs";
import { createProviderForCurrentPlatform } from "./providers/provider.mjs";

const DEFAULT_CLIENTS = [
  { id: "MCE-01", runtime: "native" },
  { id: "MCE-02", runtime: "virtual" },
  { id: "MCE-03", runtime: "virtual" },
  { id: "MCE-04", runtime: "virtual" }
];

export class RuntimeLabBackend {
  constructor() {
    this.clients = DEFAULT_CLIENTS;
  }

  async doctor() {
    return runDoctor();
  }

  async status() {
    const doctor = await runDoctor();
    const provider = await createProviderForCurrentPlatform();
    const runtime = new ClientRuntime({ provider, clients: this.clients });

    return {
      backend: "RuntimeLabBackend",
      platform: os.platform(),
      provider: provider?.id ?? null,
      ready: doctor.readyForProvisioning,
      clients: await runtime.status()
    };
  }

  async start(count) {
    if (!Number.isInteger(count) || count < 1 || count > 4) {
      throw new Error("Client count must be between 1 and 4.");
    }

    const doctor = await runDoctor();
    if (!doctor.readyForProvisioning) {
      throw new Error("Runtime Lab host is not ready. Run doctor first.");
    }

    const provider = await createProviderForCurrentPlatform();
    const runtime = new ClientRuntime({ provider, clients: this.clients });
    return runtime.start(count);
  }

  async stop(clientId = null) {
    const provider = await createProviderForCurrentPlatform();
    const runtime = new ClientRuntime({ provider, clients: this.clients });
    return runtime.stop(clientId);
  }

  async reset(clientId) {
    if (!clientId) throw new Error("Client id is required.");
    const provider = await createProviderForCurrentPlatform();
    const runtime = new ClientRuntime({ provider, clients: this.clients });
    return runtime.reset(clientId);
  }

  async open(clientId) {
    if (!clientId) throw new Error("Client id is required.");
    const provider = await createProviderForCurrentPlatform();
    const runtime = new ClientRuntime({ provider, clients: this.clients });
    return runtime.open(clientId);
  }
}
