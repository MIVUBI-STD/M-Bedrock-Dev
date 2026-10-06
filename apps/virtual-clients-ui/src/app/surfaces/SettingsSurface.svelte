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
  <h2>Keep the default simple</h2>
  <p>Virtual Clients manages resource safety automatically. Advanced runtime details remain read-only until the backend exposes a safe user setting.</p>
</section>

<section class="settings-card">
  <div>
    <span class="eyebrow">PERFORMANCE</span>
    <h3>Automatic</h3>
    <p>The app watches available memory and host pressure before starting additional virtual clients.</p>
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
        <span class="badge">Ready to install</span>
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
  <span class="badge">{snapshot.diagnostics.runtime.runtimeProfile.parity}</span>
</section>
