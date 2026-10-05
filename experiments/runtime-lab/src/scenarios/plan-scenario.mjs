export function planScenario({ scenario, clients }) {
  if (!Number.isInteger(scenario.requiredClients) || scenario.requiredClients < 1 || scenario.requiredClients > 4) {
    throw new Error("Scenario requiredClients must be between 1 and 4.");
  }

  const selected = clients.slice(0, scenario.requiredClients);
  if (selected.length !== scenario.requiredClients) {
    throw new Error(`Scenario requires ${scenario.requiredClients} clients, only ${selected.length} are configured.`);
  }

  if (scenario.roleSlots.length !== scenario.requiredClients) {
    throw new Error("Scenario roleSlots must match requiredClients.");
  }

  return {
    scenarioId: scenario.id,
    mode: scenario.mode,
    clients: selected.map((client, index) => ({
      ...client,
      role: scenario.roleSlots[index]
    }))
  };
}
