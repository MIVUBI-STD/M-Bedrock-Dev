const CLIENT_IDS = new Set(["MCE-01", "MCE-02", "MCE-03", "MCE-04"]);

export class ClientRuntime {
  constructor({ provider, clients }) {
    this.provider = provider;
    this.clients = clients;
  }

  find(clientId) {
    if (!CLIENT_IDS.has(clientId)) throw new Error(`Unknown client: ${clientId}`);
    const client = this.clients.find((entry) => entry.id === clientId);
    if (!client) throw new Error(`Client is not configured: ${clientId}`);
    return client;
  }

  async status() {
    const out = [];
    for (const client of this.clients) {
      if (client.runtime === "native") {
        out.push({ id: client.id, runtime: "native", state: "MANUAL" });
        continue;
      }
      out.push({
        id: client.id,
        runtime: "virtual",
        state: this.provider ? await this.provider.status(client.id) : "PROVIDER_UNAVAILABLE"
      });
    }
    return out;
  }

  async start(count) {
    if (!this.provider && count > 1) throw new Error("Virtualization provider is unavailable.");

    const targets = this.clients.slice(0, count);
    const results = [];

    for (const client of targets) {
      if (client.runtime === "native") {
        results.push({ id: client.id, state: "MANUAL", action: "open Minecraft Education on host" });
        continue;
      }
      results.push(await this.provider.start(client.id));
    }

    return results;
  }

  async stop(clientId = null) {
    if (!this.provider) throw new Error("Virtualization provider is unavailable.");

    const targets = clientId
      ? [this.find(clientId)]
      : this.clients.filter((client) => client.runtime === "virtual");

    const results = [];
    for (const client of targets) {
      if (client.runtime === "native") {
        results.push({ id: client.id, state: "MANUAL", action: "close native client manually" });
      } else {
        results.push(await this.provider.stop(client.id));
      }
    }
    return results;
  }

  async reset(clientId) {
    const client = this.find(clientId);
    if (client.runtime === "native") {
      throw new Error("MCE-01 is native and cannot be VM-reset.");
    }
    if (!this.provider) throw new Error("Virtualization provider is unavailable.");
    return this.provider.reset(client.id);
  }

  async open(clientId) {
    const client = this.find(clientId);
    if (client.runtime === "native") {
      return { id: client.id, state: "MANUAL", action: "focus native Minecraft Education" };
    }
    if (!this.provider) throw new Error("Virtualization provider is unavailable.");
    return this.provider.open(client.id);
  }
}
