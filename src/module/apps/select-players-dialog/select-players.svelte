<script lang="ts">
    import type { SelectPlayersDialogContext } from "./select-players.ts";

    const props: SelectPlayersDialogContext = $props();

    function onSelectAllClick(event: MouseEvent & { currentTarget: HTMLInputElement }): void {
        for (const player of props.state.players) {
            player.checked = event.currentTarget.checked;
        }
    }
</script>

<div class="players">
    {#if props.state.players.length > 1}
        <div class="form-group">
            <label for="select-all">{game.i18n.localize("PF2ERequestRolls.SelectPlayersDialog.SelectAllLabel")}</label>
            <input type="checkbox" id="select-all" checked onclick={onSelectAllClick} />
        </div>
        <hr />
    {/if}
    {#each props.state.players as player (player.id)}
        <div class="form-group">
            <label for={player.id}>{player.name}</label>
            <input type="checkbox" id={player.id} value={player.id} bind:checked={player.checked} />
        </div>
    {/each}
</div>
<div>
    <button type="button" onclick={() => props.foundryApp.confirm()}>
        {game.i18n.localize("Confirm")}
    </button>
</div>

<style lang="scss">
    .players {
        display: flex;
        flex-direction: column;

        hr {
            margin: 0.2rem 0;
        }
    }

    button {
        width: 100%;
    }
</style>
