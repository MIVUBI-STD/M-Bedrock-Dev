<script lang="ts">
  import type { ClientStatus, EngineSnapshot } from "../../contracts.js";
  import { setupExperience, setupPhaseIndex } from "../setupFlow.js";

  export let snapshot: EngineSnapshot;
  export let virtuals: ClientStatus[];
  export let readyVirtuals: number;
  export let busy: string;
  export let onContinue: () => void | Promise<void>;
  export let onOpenClients: () => void;
  export let onSupport: () => void;

  $: action = snapshot.doctor.nextSetupAction;
  $: experience = setupExperience(action);
  $: phaseIndex = setupPhaseIndex(action);
</script>

<section class="hero">
  <span class="eyebrow">FIRST-TIME SETUP</span>
  <h2>Get your virtual Minecraft clients ready</h2>
  <p>Virtual Clients handles every safe app-owned step. It asks for your input only when Windows, VMware, or account setup requires a person.</p>
</section>

<section class="setup-focus">
  <div class="step-number">{experience.owner === "APP" ? "→" : experience.owner === "BLOCKED" ? "!" : "•"}</div>
  <div class="setup-copy">
    <span class="eyebrow">{experience.owner === "APP" ? "READY TO CONTINUE" : experience.owner === "CLIENTS" ? "CONTINUE IN CLIENTS" : experience.owner === "BLOCKED" ? "NEEDS ATTENTION" : "NEEDS YOU"}</span>
    <h2>{experience.title}</h2>
    <p>{experience.description}</p>
    {#if experience.steps.length}
      <ol class="setup-instructions">
        {#each experience.steps as step}<li>{step}</li>{/each}
      </ol>
    {/if}
  </div>
  <div class="setup-action">
    {#if experience.owner === "APP" && action !== "READY"}
      <button class="primary large" disabled={Boolean(busy)} on:click={onContinue}>
        {busy === "setup" ? "Working…" : experience.primaryLabel}
      </button>
    {:else if experience.owner === "CLIENTS" || action === "READY"}
      <button class="primary large" on:click={onOpenClients}>{experience.primaryLabel}</button>
    {:else if experience.owner === "BLOCKED"}
      <button class="secondary large" on:click={onSupport}>{experience.primaryLabel}</button>
    {:else}
      <button class="primary large" disabled={Boolean(busy)} on:click={onContinue}>{experience.primaryLabel}</button>
      <small class="manual-note">Virtual Clients will check the result before moving to the next step.</small>
    {/if}
  </div>
</section>

<section class="progress-row">
  {#each ["Computer", "Environment", "Virtual clients", "Accounts"] as label, index}
    <article class:done={index < phaseIndex} class:current={index === phaseIndex}>
      <span>{index < phaseIndex ? "✓" : index + 1}</span>
      <div>
        <strong>{label}</strong>
        <small>{index < phaseIndex ? "Complete" : index === phaseIndex ? "Current" : "Next"}</small>
      </div>
    </article>
  {/each}
</section>

{#if action === "CREATE_READY_SNAPSHOTS"}
  <section class="setup-summary-line">
    <strong>{readyVirtuals} of {virtuals.length || 3} recovery points saved</strong>
  </section>
{/if}
