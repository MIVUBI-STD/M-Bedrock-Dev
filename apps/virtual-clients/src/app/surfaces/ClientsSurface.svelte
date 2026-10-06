<script lang="ts">
  import type { ClientId, ClientLifecycleActions, ClientStatus, EnginePolicy, EngineSnapshot, SetupAction } from "../../contracts.js";
  import {
    actionForClient,
    blockerLabel,
    hasStoppableClient,
    clientDisplayName,
    primaryClientAction,
    primaryClientBlocker,
    stateLabel,
  } from "../../view-model.js";

  export let snapshot: EngineSnapshot;
  export let policy: EnginePolicy | undefined;
  export let actions: readonly ClientLifecycleActions[];
  export let virtuals: ClientStatus[];
  export let blockerCount: number;
  export let setupAction: SetupAction;
  export let runningVirtuals: number;
  export let busy: string;
  export let onStartAll: () => void | Promise<void>;
  export let onArrange: () => void | Promise<void>;
  export let onConfigureLayout: () => void;
  export let onStopAll: () => void | Promise<void>;
  export let onPrimary: (client: ClientStatus, available: ClientLifecycleActions) => void | Promise<void>;
  export let onRestart: (client: ClientId) => void | Promise<void>;
  export let onSuspend: (client: ClientId) => void | Promise<void>;
  export let onStop: (client: ClientId) => void | Promise<void>;
  export let onSetReady: (client: ClientId) => void | Promise<void>;
  export let onReset: (client: ClientId) => void | Promise<void>;
  export let onReprovision: (client: ClientId) => void;
  export let onSupport: () => void;
  export let onVerifyIdentities: () => void | Promise<void>;
  $: canStopAll = hasStoppableClient(virtuals, actions);
  $: startableVirtuals = virtuals.filter((client) => actionForClient(actions, client.id)?.start.allowed === true).length;
  $: pausedVirtuals = virtuals.filter((client) => client.state === "SUSPENDED").length;
</script>

<section class="hero compact clients-heading">
  <h2>Your clients</h2>
  <p>Choose a client and continue.</p>
</section>

{#if setupAction === "VERIFY_IDENTITIES"}
  <section class="setup-client-banner">
    <div>
      <span class="eyebrow">SETUP · CLIENT CHECK</span>
      <strong>Finish Windows first boot on all three clients</strong>
      <small>Use Start first-time setup on each client, complete Windows first-run screens, then use Check clients. Guests remain running while you complete setup; compatibility is verified by Check clients.</small>
      <small>Identity verification requires all three clients running together. This PC is recommended for {snapshot.doctor.maxRecommendedVirtualClients} simultaneous virtual clients; this recommendation is not a guarantee of available memory.</small>
    </div>
    <button class="primary" disabled={Boolean(busy) || runningVirtuals < 3} on:click={onVerifyIdentities}>
      {busy === "verify-identities" ? "Checking…" : "Check clients"}
    </button>
  </section>
{:else if setupAction === "CREATE_READY_SNAPSHOTS"}
  <section class="setup-client-banner">
    <div>
      <span class="eyebrow">SETUP · ACCOUNTS</span>
      <strong>Sign in once, then save a recovery point</strong>
      <small>Use each client's ••• menu after signing in and stopping that client. Setup completes when all three recovery points are saved.</small>
    </div>
  </section>
{:else if setupAction === "REPROVISION_VIRTUALS"}
  <section class="setup-client-banner">
    <div>
      <span class="eyebrow">SETUP · RECREATE</span>
      <strong>One or more clients need to be recreated</strong>
      <small>Use Recreate virtual client only on affected clients. This removes that client's saved Windows and Minecraft session.</small>
    </div>
  </section>
{/if}

<section class="batch-bar">
  <div>
    <strong>{runningVirtuals ? `${runningVirtuals} running` : "All clients are stopped"}{pausedVirtuals ? ` · ${pausedVirtuals} paused` : ""}</strong>
    {#if !snapshot.diagnostics.runtime.pressure.canStartVirtual}<small>New starts are paused to protect this PC.</small>{/if}
  </div>
  <div class="batch-actions">
    {#if setupAction !== "VERIFY_IDENTITIES" && startableVirtuals > 0}
      <button class="primary" disabled={Boolean(busy) || !policy} on:click={onStartAll}>
        {busy === "start-all" ? "Starting…" : startableVirtuals === virtuals.length ? "Start all" : "Start remaining"}
      </button>
    {/if}
    {#if runningVirtuals > 0}
      <div class="split-action">
        <button class="secondary" disabled={Boolean(busy)} on:click={onArrange}>
          {busy === "arrange" ? "Arranging…" : "Arrange"}
        </button>
        <button class="secondary split-menu" disabled={Boolean(busy)} aria-label="Window Layout settings" on:click={onConfigureLayout}>⌄</button>
      </div>
    {/if}
    {#if canStopAll}
      <button class="secondary" disabled={Boolean(busy)} on:click={onStopAll}>
        {busy === "stop-all" ? "Stopping…" : "Stop all"}
      </button>
    {/if}
  </div>
</section>

<section class="client-list">

  {#each virtuals as client}
    {@const available = actionForClient(actions, client.id)}
    {@const primary = primaryClientAction(available, client.state)}
    <article class="client-row">
      <div class="client-icon">{Number(client.id.slice(-2))}</div>
      <div class="client-main">
        <h3>{clientDisplayName(client.id)}</h3>
        <small><span class="state-dot {client.state.toLowerCase()}" aria-hidden="true"></span>{stateLabel(client.state)}</small>
      </div>
      <div class="row-action">
        {#if available && primary}
          <button class="primary" disabled={Boolean(busy)} on:click={() => onPrimary(client, available)}>
            {busy.endsWith(client.id) ? "Working…" : primary.label}
          </button>
        {:else}
          <div>
            <button class="secondary" disabled title={primaryClientBlocker(available, client.state)}>Unavailable</button>
            <small>{primaryClientBlocker(available, client.state)}</small>
          </div>
        {/if}
        {#if available}
          <details class="manage-menu">
            <summary aria-label={`Manage ${clientDisplayName(client.id)}`}>•••</summary>
            <div class="menu-panel">
              <button disabled={!available.restart.allowed || Boolean(busy)} title={blockerLabel(available.restart.blocker, available.restart.reason)} on:click={() => onRestart(client.id)}>Restart</button>
              <button disabled={!available.suspend.allowed || Boolean(busy)} title={blockerLabel(available.suspend.blocker, available.suspend.reason)} on:click={() => onSuspend(client.id)}>Pause</button>
              <button disabled={!available.stop.allowed || Boolean(busy)} title={blockerLabel(available.stop.blocker, available.stop.reason)} on:click={() => onStop(client.id)}>Stop</button>
              <hr />
              <button disabled={!available.setReady.allowed || Boolean(busy)} title={blockerLabel(available.setReady.blocker, available.setReady.reason)} on:click={() => onSetReady(client.id)}>Save recovery point</button>
              <button disabled={!available.reset.allowed || Boolean(busy)} title={blockerLabel(available.reset.blocker, available.reset.reason)} on:click={() => onReset(client.id)}>Restore recovery point</button>
              <button class="danger-menu" disabled={!available.reprovision.allowed || Boolean(busy)} title={blockerLabel(available.reprovision.blocker, available.reprovision.reason)} on:click={() => onReprovision(client.id)}>Recreate virtual client</button>
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
