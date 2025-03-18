<script lang="ts">
    import type { RollDialogContext } from "./roll-dialog.ts";
    import { rollToInline } from "../helpers.ts";

    const props: RollDialogContext = $props();
    const groups = $state(props.request.groups);
</script>

<div class="preview">
    {#each groups as group (group.id)}
        <div class="request-container">
            <div class="header">
                <div class="title">
                    <strong>{group.title}</strong>
                </div>
            </div>
            <div class="rolls">
                {#each group.rolls as roll}
                    {#await TextEditor.enrichHTML(rollToInline(roll))}
                        <div>Loading...</div>
                    {:then rollHTML}
                        <div class="roll">
                            {@html rollHTML}
                        </div>
                    {/await}
                {/each}
            </div>
        </div>
    {/each}
</div>
<button type="button" onclick={() => props.foundryApp.close()}>{game.i18n.localize("Close")}</button>

<style lang="scss">
    .preview {
        display: flex;
        flex-direction: column;
        align-self: center;
        width: fit-content;
        margin-top: 0.5em;

        .request-container {
            display: flex;
            flex-direction: column;
            margin-bottom: 1em;

            .header {
                margin-bottom: 0.5em;
            }

            .roll {
                margin-bottom: 0.5em;
            }
        }
    }
</style>
