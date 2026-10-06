<script lang="ts">
  export let clientName: string;
  export let busy: string;
  export let onCancel: () => void;
  export let onConfirm: () => void | Promise<void>;
</script>

<div class="modal-backdrop">
  <dialog open class="modal" aria-labelledby="restore-title">
    <span class="eyebrow">RESTORE RECOVERY POINT</span>
    <h2 id="restore-title">Restore {clientName}?</h2>
    <p>This stops the selected client if needed and discards changes made after its saved recovery point, including local world changes and later account or settings changes. The client then starts from that recovery point. Other clients are not changed.</p>
    <div class="modal-actions">
      <button class="secondary" disabled={Boolean(busy)} on:click={onCancel}>Cancel</button>
      <button class="danger" disabled={Boolean(busy)} on:click={onConfirm}>Discard changes and restore</button>
    </div>
  </dialog>
</div>
