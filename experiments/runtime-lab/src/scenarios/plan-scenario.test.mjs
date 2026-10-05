import test from "node:test";
import assert from "node:assert/strict";
import { planScenario } from "./plan-scenario.mjs";

test("scenario planner assigns stable clients to dynamic roles", () => {
  const clients = [
    { id: "MCE-01" },
    { id: "MCE-02" },
    { id: "MCE-03" },
    { id: "MCE-04" }
  ];
  const scenario = {
    id: "multi-arena-4p",
    requiredClients: 4,
    mode: "interactive",
    roleSlots: ["PLAYER_A", "PLAYER_B", "PLAYER_C", "PLAYER_D"]
  };

  const plan = planScenario({ scenario, clients });
  assert.equal(plan.clients[0].id, "MCE-01");
  assert.equal(plan.clients[0].role, "PLAYER_A");
  assert.equal(plan.clients[3].role, "PLAYER_D");
});
