<script lang="ts">
  import type { ClientId, ClientLifecycleActions, ClientStatus, EnginePolicy, EngineSnapshot } from "../../contracts.js";
  import {
    actionForClient,
    blockerLabel,
    clientDisplayName,
    primaryClientAction,
    recoveryLabel,
    stateLabel,
  } from "../../view-model.js";

  export let snapshot: EngineSnapshot;
  export let policy: EnginePolicy | undefined;
  export let actions: readonly ClientLifecycleActions[];
  export let native: ClientStatus | undefined;
  export let virtuals: ClientStatus[];
  export let blockerCount: number;
  export let runningVirtuals: number;
  export let busy: string;
  export let onStartAll: () => void | Promise<void>;
  export let onArrange: () => void | Promise<void>;
  export let onStopAll: () => void | Promise<void>;
  export let onPrimary: (client: ClientStatus, available: ClientLifecycleActions) => void | Promise<void>;
  export let onRestart: (client: ClientId) => void | Promise<void>;
  export let onSuspend: (client: ClientId) => void | Promise<void>;
  export let onStop: (client: ClientId) => void | Promise<void>;
  export let onSetReady: (client: ClientId) => void | Promise<void>;
  export let onReset: (client: ClientId) => void | Promise<void>;
  export let onReprovision: (client: ClientId) => void;
  export let onSupport: () => void;
</script>

<section class="hero compact">
  <span class="eyebrow">DAILY USE</span>
  <h2>Your Minecraft clients</h2>
  <p>Start what you need, open each client, and keep recovery actions out of the way until they are needed.</p>
</section>

<section class="batch-bar">
  <div>
    <strong>{runningVirtuals === 0 ? "No virtual clients running" : `${runningVirtuals} virtual client${runningVirtuals === 1 ? "" : "s"} running`}</strong>
    <small>{snapshot.diagnostics.runtime.pressure.canStartVirtual ? "Automatic resource protection is active" : "This PC is under resource pressure; new starts are paused"}</small>
  </div>
  <div class="batch-actions">
    <button class="primary" disabled={Boolean(busy) || !snapshot.diagnostics.runtime.pressure.canStartVirtual || !policy} on:click={onStartAll}>
      {busy === "start-all" ? "Starting…" : "Start all"}
    </button>
    <button class="secondary" disabled={Boolean(busy) || runningVirtuals === 0} on:click={onArrange}>
      {busy === "arrange" ? "Arranging…" : "Arrange"}
    </button>
    <button class="secondary" disabled={Boolean(busy) || runningVirtuals === 0} on:click={onStopAll}>
      {busy === "stop-all" ? "Stopping…" : "Stop all"}
    </button>
  </div>
</section>

<section class="client-list">
  {#if native}
    <article class="client-row native">
      <div class="client-icon">PC</div>
      <div class="client-main">
        <span class="client-kind">PHYSICAL CLIENT</span>
        <h3>{clientDisplayName(native.id)}</h3>
        <small>Minecraft Education {native.minecraftVersion ?? "version unknown"} · Version reference</small>
      </div>
      <span class="state running">{stateLabel(native.state)}</span>
      <div class="row-action"><span class="managed">Managed on this PC</span></div>
    </article>
  {/if}

  {#each virtuals as client}
    {@const available = actionForClient(actions, client.id)}
    {@const primary = primaryClientAction(available)}
    <article class="client-row">
      <div class="client-icon">{Number(client.id.slice(-2))}</div>
      <div class="client-main">
        <span class="client-kind">VIRTUAL CLIENT</span>
        <h3>{clientDisplayName(client.id)}</h3>
        <small>{client.minecraftVersion ? `Minecraft Education ${client.minecraftVersion}` : "Minecraft Education"} · {recoveryLabel(client.readySnapshot)}</small>
      </div>
      <span class="state {client.state.toLowerCase()}">{stateLabel(client.state)}</span>
      <div class="row-action">
        {#if available && primary}
          <button class="primary" disabled={Boolean(busy)} on:click={() => onPrimary(client, available)}>
            {busy.endsWith(client.id) ? "Working…" : primary.label}
          </button>
        {:else}
          <button class="secondary" disabled>Unavailable</button>
        {/if}
        {#if available}
          <details class="manage-menu">
            <summary aria-label={`Manage ${clientDisplayName(client.id)}`}>•••</summary>
            <div class="menu-panel">
              <button disabled={!available.restart.allowed || Boolean(busy)} title={blockerLabel(available.restart.blocker)} on:click={() => onRestart(client.id)}>Restart</button>
              <button disabled={!available.suspend.allowed || Boolean(busy)} title={blockerLabel(available.suspend.blocker)} on:click={() => onSuspend(client.id)}>Pause</button>
              <button disabled={!available.stop.allowed || Boolean(busy)} title={blockerLabel(available.stop.blocker)} on:click={() => onStop(client.id)}>Stop</button>
              <hr />
              <button disabled={!available.setReady.allowed || Boolean(busy)} title={blockerLabel(available.setReady.blocker)} on:click={() => onSetReady(client.id)}>Save recovery point</button>
              <button disabled={!available.reset.allowed || Boolean(busy)} title={blockerLabel(available.reset.blocker)} on:click={() => onReset(client.id)}>Restore recovery point</button>
              <button class="danger-menu" disabled={!available.reprovision.allowed || Boolean(busy)} title={blockerLabel(available.reprovision.blocker)} on:click={() => onReprovision(client.id)}>Recreate virtual client</button>
            </div>
          </details>
        {/if}
      </div>
    </article>
  {/each}
</section>

{#if blockerCount}
  <button class="support-callout" on:click={onSupport}>
    <div><strong>{blockerCount} item{blockerCount === 1 ? "" : "s"} need attention</strong><small>See what needs to be fixed before continuing.</small></div>
    <span>Open support →</span>
  </button>
{/if}
