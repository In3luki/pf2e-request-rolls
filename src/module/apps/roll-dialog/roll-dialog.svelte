<script lang="ts">
    import type { RollDialogContext } from "./roll-dialog.ts";
    import type { RequestRoll } from "../types.ts";
    import { getInlineLink } from "../helpers.ts";
    import { cssSettings } from "src/settings/data.svelte.ts";

    const props: RollDialogContext = $props();
    const groups = $state(props.request.groups);
    const rolled: string[] = $state([]);

    function onClickRoll(roll: RequestRoll): void {
        rolled.push(roll.id);
    }
</script>

<div class="preview" style={cssSettings.outerContainer}>
    {#each groups as group (group.id)}
        <div class="request-container" style={cssSettings.groupContainer}>
            <div class="header" style={cssSettings.groupHeader}>
                <div class="title">
                    <strong>{group.title}</strong>
                </div>
            </div>
            <div class="rolls" style={cssSettings.rollContainer}>
                {#each group.rolls as roll}
                    {#await getInlineLink({ actor: game.user.character, roll, requestId: props.request.id })}
                        <div>Loading...</div>
                    {:then rollHTML}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="roll" onclick={() => onClickRoll(roll)}>
                            {@html rollHTML}
                            <div class="rolled">
                                {#if rolled.includes(roll.id)}
                                    <i class="fa-solid fa-dice"></i>
                                {/if}
                            </div>
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
                display: flex;
                align-items: center;
                margin-bottom: 0.5em;

                .rolled {
                    min-width: 1.6em;

                    i {
                        margin-left: 5px;
                    }
                }
            }
        }
    }
</style>
