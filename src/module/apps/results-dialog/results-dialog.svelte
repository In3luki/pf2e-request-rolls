<script lang="ts">
    import * as R from "remeda";
    import type { ResultsDialogContext } from "./results-dialog.ts";
    import { getInlineLink } from "../helpers.ts";
    import type { CounteractRoll } from "../types.ts";
    import type { DegreeOfSuccessString } from "foundry-pf2e";

    const props: ResultsDialogContext = $props();

    function getCounteractResult(roll: CounteractRoll, outcome: DegreeOfSuccessString): string {
        const finalCounteractRank = {
            criticalSuccess: roll.sourceRank + 3, // Counteract the target if its counteract rank is no more than 3 higher than your effect's counteract rank.
            success: roll.sourceRank + 1, // Counteract the target if its counteract rank is no more than 1 higher than your effect's counteract rank.
            failure: roll.sourceRank - 1, // Counteract the target if its counteract rank is lower than your effect's counteract rank.
            criticalFailure: -1, // You fail to counteract the target.
        }[outcome];
        return roll.targetRank <= finalCounteractRank ? "success" : "failure";
    }

    function onClickRoll(event: MouseEvent): void {
        event.stopPropagation();
    }
</script>

<div class="preview">
    {#each props.state.results as result (result.userId)}
        <div class="result-container">
            <div class="header">
                <strong>{result.name}</strong>
            </div>
            {#if R.keys(result.groups).length > 0}
                {#each R.entries(result.groups) as [_id, group]}
                    <div class="results">
                        {#if group.label}
                            <div class="group">
                                {group.label}
                            </div>
                        {/if}
                        {#await getInlineLink({ roll: group.roll })}
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
                            <span class="outcome {group.outcome}">
                                {game.i18n.localize(`PF2E.Check.Result.Degree.Check.${group.outcome}`)}
                            </span>
                            {#if group.reroll === "hero-point"}
                                <i class="fa-solid fa-hospital-symbol reroll-indicator"></i>
                            {:else if group.reroll === "other"}
                                <i class="fa-solid fa-dice reroll-indicator"></i>
                            {/if}
                        </div>
                        {#if group.roll.type === "counteract" && group.outcome}
                            {@const outcome = getCounteractResult(group.roll, group.outcome)}
                            <div class="result degree-of-success">
                                <span class="label">
                                    {game.i18n.localize("PF2ERequestRolls.ResultsDialog.CounteractLabel")}:
                                </span>
                                <span class="outcome {outcome}">
                                    {game.i18n.localize(`PF2E.Check.Result.Degree.Check.${outcome}`)}
                                </span>
                            </div>
                        {/if}
                    </div>
                {/each}
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

        .no-result {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 1.5em;
            padding-top: 0.5em;
        }

        .results {
            display: flex;
            flex-direction: column;
            background-color: var(--pf2e-rr-results-bg-color);
            border: 1px solid var(--pf2e-rr-results-border-color);
            border-radius: 4px;
            padding: 5px;

            .group {
                margin-bottom: 0.2em;
                color: var(--color-text-dark-primary);
            }

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
                    color: var(--color-text-dark-primary);
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
