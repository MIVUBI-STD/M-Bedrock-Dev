<script lang="ts">
  import type { RuntimeErrorPresentation } from "../runtimeErrorPresentation.js";

  export let error: RuntimeErrorPresentation;
  export let onRetry: () => void | Promise<void>;
  export let onSupport: () => void;
</script>

<section class="error-banner" aria-live="polite">
  <div>
    <strong>{error.title}</strong>
    <span>{error.message}</span>
    {#if error.details}
      <details>
        <summary>Technical details</summary>
        <code>{error.details}</code>
      </details>
    {/if}
  </div>
  <div class="error-actions">
    {#if error.retryable}
      <button on:click={onRetry}>Try again</button>
    {/if}
    <button on:click={onSupport}>Help & Support</button>
  </div>
</section>
