export function evaluateProvisioningHealth({ doctorReport }) {
  const blocking = [...doctorReport.blocking];

  return {
    valid: blocking.length === 0 && doctorReport.readyForProvisioning === true,
    blocking,
    unknown: Object.entries(doctorReport.checks)
      .filter(([, value]) => value.status === "UNKNOWN")
      .map(([name]) => name)
  };
}

export function evaluateRuntimeProofHealth({ clientHealth, minimumInteractiveFps }) {
  const reasons = [];

  for (const client of clientHealth) {
    if (!client.networkReachable) reasons.push(`${client.clientId}: network unreachable`);
    if (client.lifecycle === "UNHEALTHY") reasons.push(`${client.clientId}: unhealthy lifecycle`);
    if (client.fps !== null && client.fps < minimumInteractiveFps) {
      reasons.push(`${client.clientId}: FPS below interactive floor`);
    }
  }

  return {
    validForRuntimeProof: reasons.length === 0,
    reasons
  };
}
