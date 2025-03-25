<script lang="ts">
    import type { ResultsDialogContext } from "./results-dialog.ts";
    import { rollToInline } from "../helpers.ts";

    const props: ResultsDialogContext = $props();

    function onClickRoll(event: MouseEvent): void {
        event.stopPropagation();
    }
</script>

<div class="preview">
    {#each props.state.results as player (player.userId)}
        <div class="result-container">
            <div class="header">
                <strong>{player.name}</strong>
            </div>
            {#if player.outcome && player.roll}
                <div class="results">
                    {#if player.groupLabel}
                        <div class="group">
                            {player.groupLabel}
                        </div>
                    {/if}
                    {#await TextEditor.enrichHTML(rollToInline(player.roll))}
                        <div>Loading...</div>
                    {:then rollHTML}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div class="roll" onclick={onClickRoll}>
                            {@html rollHTML}
                        </div>
                    {/await}
                    <div class="result degree-of-success">
                        <span class="label">
                            {game.i18n.localize("PF2ERequestRolls.ResultsDialog.ResultLabel")}:
                        </span>
                        <span class="outcome {player.outcome}">
                            {game.i18n.localize(`PF2E.Check.Result.Degree.Check.${player.outcome}`)}
                        </span>
                        {#if player.reroll === "hero-point"}
                            <i class="fa-solid fa-hospital-symbol reroll-indicator"></i>
                        {:else if player.reroll === "other"}
                            <i class="fa-solid fa-dice reroll-indicator"></i>
                        {/if}
                    </div>
                </div>
            {:else}
                <div class="no-result"><i class="fa-solid fa-hourglass"></i></div>
            {/if}
        </div>
    {/each}
</div>
<button type="button" onclick={() => props.foundryApp.close()}>{game.i18n.localize("Close")}</button>

<style lang="scss">
    .result-container {
        display: flex;
        flex-direction: column;
        margin-bottom: 1em;

        .header {
            margin-bottom: 0.5em;
        }

        .no-result {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 1.5em;
        }

        .results {
            display: flex;
            flex-direction: column;
            background-color: var(--pf2e-rr-results-bg-color);
            border: 1px solid var(--pf2e-rr-results-bg-color);
            padding: 5px;

            .roll {
                height: 1.5em;
            }

            .result {
                display: flex;
                align-items: center;
                height: 1.5em;
                padding: 3px;

                .label {
                    color: var(--color-text-dark-primary);
                }

                i {
                    margin-left: 5px;
                }

                &.degree-of-success {
                    .outcome {
                        margin-left: 5px;
                    }

                    .criticalSuccess {
                        color: var(--degree-success-critical, rgb(0, 128, 0));
                    }
                    .success {
                        color: var(--degree-success, rgb(0, 0, 255));
                    }
                    .failure {
                        color: var(--degree-failure, rgb(255, 69, 0));
                    }
                    .criticalFailure {
                        color: var(--degree-failure-critical, rgb(255, 0, 0));
                    }
                }
            }
        }
    }
</style>
