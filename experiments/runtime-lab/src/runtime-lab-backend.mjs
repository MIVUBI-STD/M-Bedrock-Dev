import { loadLabConfig, loadScenario } from "./config/load-config.mjs";
import { runDoctor } from "./doctor.mjs";
import { evaluateProvisioningHealth } from "./health/evaluate-health.mjs";
import { resolveRuntimeProvider } from "./providers/provider-registry.mjs";
import { planScenario } from "./scenarios/plan-scenario.mjs";

export class RuntimeLabBackend {
  async doctor() {
    return runDoctor();
  }

  async status() {
    const [config, doctorReport, provider] = await Promise.all([
      loadLabConfig(),
      runDoctor(),
      resolveRuntimeProvider()
    ]);

    return {
      schemaVersion: 1,
      backend: "RuntimeLabBackend",
      provisioning: evaluateProvisioningHealth({ doctorReport }),
      provider: provider.selected,
      clients: config.clients.map((client) => ({
        id: client.id,
        runtime: client.runtime,
        profileId: client.profileId,
        configuredProvider: client.provider,
        lifecycle: "NOT_PROVISIONED"
      }))
    };
  }

  async planScenario(id) {
    const [config, scenario] = await Promise.all([
      loadLabConfig(),
      loadScenario(id)
    ]);

    return planScenario({ scenario, clients: config.clients });
  }

  async provision() {
    throw new Error("Provisioning is not implemented yet.");
  }

  async start() {
    throw new Error("Client start lifecycle is not implemented yet.");
  }

  async stop() {
    throw new Error("Client stop lifecycle is not implemented yet.");
  }

  async reset() {
    throw new Error("Client reset lifecycle is not implemented yet.");
  }

  async runScenario() {
    throw new Error("Scenario execution is not implemented yet.");
  }
}
