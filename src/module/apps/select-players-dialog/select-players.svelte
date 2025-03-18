<script lang="ts">
    import type { SelectPlayersDialogContext } from "./select-players.ts";

    const props: SelectPlayersDialogContext = $props();
</script>

<div class="players">
    {#each props.state.players as player (player.id)}
        <div class="form-group">
            <label for={player.id}>{player.name}</label>
            <input type="checkbox" id={player.id} value={player.id} bind:checked={player.checked} />
        </div>
    {/each}
</div>
<div>
    <button type="button" onclick={() => props.foundryApp.close()}>
        {game.i18n.localize("Confirm")}
    </button>
</div>

<style lang="scss">
    .players {
        display: flex;
        flex-direction: column;
    }
</style>
