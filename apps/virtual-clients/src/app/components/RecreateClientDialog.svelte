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
    <p>This removes this virtual client's Windows and Minecraft sign-in state and creates it again from the prepared environment. Other clients are not changed.</p>
    <div class="modal-actions">
      <button class="secondary" on:click={onCancel}>Cancel</button>
      <button class="danger" disabled={Boolean(busy)} on:click={onConfirm}>Recreate client</button>
    </div>
  </dialog>
</div>
