<script lang="ts">
  export let clientName: string;
  export let busy: string;
  export let onCancel: () => void;
  export let onConfirm: () => void | Promise<void>;
</script>

<div class="modal-backdrop">
  <dialog open class="modal" aria-labelledby="reprovision-title">
    <span class="eyebrow">ADVANCED RECOVERY</span>
    <h2 id="reprovision-title">Recreate {clientName}?</h2>
    <p>This removes this client's saved Windows and Minecraft sign-in state and creates a fresh copy that matches the current setup. Other clients are not changed.</p>
    <div class="modal-actions">
      <button class="secondary" on:click={onCancel}>Cancel</button>
      <button class="danger" disabled={Boolean(busy)} on:click={onConfirm}>Recreate virtual client</button>
    </div>
  </dialog>
</div>
