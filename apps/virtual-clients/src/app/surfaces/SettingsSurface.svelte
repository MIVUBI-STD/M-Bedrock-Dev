<script lang="ts">
  import type { EnginePolicy, EngineSnapshot, UpdateCheck } from "../../contracts.js";
  import { updateLabel } from "../../view-model.js";

  export let snapshot: EngineSnapshot;
  export let policy: EnginePolicy | undefined;
  export let update: UpdateCheck | undefined;
  export let busy: string;
  export let onStageUpdate: () => void | Promise<void>;
</script>

<section class="hero compact">
  <span class="eyebrow">SETTINGS</span>
  <h2>Performance & updates</h2>
  <p>Virtual Clients manages safe performance automatically. Review resource limits and application update status here.</p>
</section>

<section class="settings-card">
  <div>
    <span class="eyebrow">PERFORMANCE</span>
    <h3>Memory admission</h3>
    <p>Virtual Clients checks available host memory before starting another client. The configured memory value is a ceiling, not measured usage. Running clients are never stopped automatically.</p>
  </div>
  <div class="setting-meta">
    <span>{policy?.virtualMemoryLimitMb ? `${policy.virtualMemoryLimitMb / 1024} GB` : "—"} ceiling per client</span>
    <span>{policy?.virtualVcpus ?? "—"} vCPU per client</span>
    <span>Up to {policy?.maxVirtualClients ?? 3} virtual clients</span>
  </div>
</section>

{#if update}
  <section class="settings-card">
    <div>
      <span class="eyebrow">APPLICATION UPDATE</span>
      <h3>{updateLabel(update.state)}</h3>
      <p>Current {update.currentVersion}{#if update.latestVersion} · Latest {update.latestVersion}{/if}</p>
    </div>
    <div>
      {#if update.state === "UPDATE_AVAILABLE"}
        <button class="secondary" disabled={Boolean(busy)} on:click={onStageUpdate}>{busy === "stage-update" ? "Preparing…" : "Prepare update"}</button>
      {:else if update.state === "UPDATE_STAGED"}
        <span class="badge">Installer prepared</span>
      {/if}
    </div>
  </section>
{/if}

<section class="settings-card">
  <div>
    <span class="eyebrow">VERSION COMPATIBILITY</span>
    <h3>{snapshot.diagnostics.runtime.runtimeProfile.parity === "MATCH" ? "Minecraft versions match" : "Needs attention"}</h3>
    <p>Virtual clients follow the Minecraft Education version installed on this PC.</p>
  </div>
  <span class="badge">{snapshot.diagnostics.runtime.runtimeProfile.parity === "MATCH" ? "Matched" : snapshot.diagnostics.runtime.runtimeProfile.parity === "MISMATCH" ? "Mismatch" : "Unknown"}</span>
</section>
