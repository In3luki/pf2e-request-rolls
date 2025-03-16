<script lang="ts">
    import { untrack } from "svelte";
    import { fade } from "svelte/transition";
    import dayjs from "dayjs";
    import type {
        ActionRoll,
        CheckRoll,
        RequestGroup,
        RequestHistory,
        RequestRoll,
        RequestRollsContext,
    } from "./app.ts";
    import { localize } from "@util/misc.ts";
    import TraitsSelect from "../traits/traits-select.svelte";

    const props: RequestRollsContext = $props();
    const requests: RequestGroup[] = $state(props.initial);
    let selectedGroupId = $state(requests[0]?.id ?? "");
    let selectedGroup = $derived(requests.find((r) => r.id === selectedGroupId) ?? requests[0]);
    let selectedRollId: string | null = $state(null);
    let editing = $derived(selectedGroup.rolls.find((r) => r.id === selectedRollId));
    let showHistory = $state(false);

    const skillKeyToLabel: Record<string, string> = {
        skills: game.i18n.localize("PF2E.SkillsLabel"),
        lores: game.i18n.localize("PF2E.LoreSkillsHeader"),
        saves: game.i18n.localize("PF2E.SavesHeader"),
    };

    function createGroup(): void {
        if (requests.length === 1 && requests[0].rolls.length === 0) {
            return;
        }
        requests.push(props.foundryApp.getNewGroupData());
        selectedGroupId = requests[requests.length - 1].id;
        selectedRollId = null;
    }

    function createNewRoll(type: RequestRoll["type"]): void {
        selectedGroup.rolls.push(props.foundryApp.getNewRollData(type));
        selectedRollId = selectedGroup.rolls.at(-1)?.id ?? null;
    }

    function selectText(event: Event & { currentTarget: HTMLInputElement }): void {
        event.currentTarget.select();
    }

    function getActionVariants(slug: string): [string, string][] {
        const variants = game.pf2e.actions.get(slug)?.variants ?? [];
        return variants.map((v) => [v.slug, game.i18n.localize(v.name ?? "")]) as [string, string][];
    }

    function selectTraits(selections: { label: string; value: string }[], roll: CheckRoll): void {
        roll.traits = selections.map((s) => s.value);
    }

    function loadHistory(item: RequestHistory): void {
        untrack(() => (requests.length = 0));
        requests.push(...fu.deepClone(item.groups));
    }

    function onClickRoll(event: MouseEvent, group: RequestGroup, roll: RequestRoll): void {
        if (!event.ctrlKey) {
            event.stopPropagation();
        }

        if (event.shiftKey) {
            const copy = fu.deepClone(roll);
            copy.id = fu.randomID();
            selectedGroup.rolls.push(copy);
            selectedRollId = copy.id;
            return;
        }
        switchActive(group, roll);
    }

    function switchActive(group: RequestGroup, roll?: RequestRoll): void {
        selectedGroupId = group.id;
        selectedRollId = roll?.id ?? selectedGroup.rolls.at(0)?.id ?? null;
    }

    async function deleteGroup(event: MouseEvent, request: RequestGroup): Promise<void> {
        event.stopPropagation();

        const confirmed =
            request.rolls.length === 0 ||
            (await foundry.applications.api.DialogV2.confirm({
                content: localize("GMDialog.ConfirmDeleteGroup"),
                rejectClose: false,
                modal: true,
            }));
        if (confirmed) {
            const index = requests.findIndex((r) => r === request);
            if (requests.length === 1) {
                requests.push(props.foundryApp.getNewGroupData());
            }
            if (selectedGroupId === request.id) {
                const newActive = requests.at(Math.max(index - 1, 0));
                selectedGroupId = newActive?.id ?? requests[0].id;
                selectedRollId = newActive?.rolls.at(0)?.id ?? null;
            }
            requests.splice(index, 1);
        }
    }

    async function deleteRoll(event: MouseEvent, roll: RequestRoll): Promise<void> {
        event.stopPropagation();

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            content: localize("GMDialog.ConfirmDeleteRoll"),
            rejectClose: false,
            modal: true,
        });
        if (confirmed) {
            const rolls = selectedGroup.rolls;
            const index = rolls.findIndex((r) => r.id === roll.id);
            if (selectedRollId === roll.id) {
                const newActive = rolls.at(Math.max(index - 1, 0));
                selectedRollId = newActive?.id ?? null;
            }
            selectedGroup.rolls.findSplice((r) => r === roll);
        }
    }
</script>

<div class="container">
    <div class="edit">
        <div class="form-group">
            <label for="new-group">{localize("GMDialog.GroupHeader")}:</label>
            <input
                id="new-group"
                type="text"
                placeholder={localize("GMDialog.GroupHeaderPlaceholder")}
                autocomplete="off"
                bind:value={selectedGroup.title}
            />
            <button
                type="button"
                class="add-group"
                data-tooltip="PF2ERequestRolls.GMDialog.AddGroupButtonTooltip"
                onclick={() => createGroup()}
            >
                &plus;
            </button>
        </div>
        <div class="add-buttons">
            <button type="button" onclick={() => createNewRoll("action")}>
                {localize("GMDialog.Buttons.ActionLabel")}
            </button>
            <button type="button" onclick={() => createNewRoll("check")}>
                {localize("GMDialog.Buttons.CheckLabel")}
            </button>
        </div>
        {#if editing}
            {#if editing.type === "action"}
                {@render action(editing)}
            {:else if editing.type === "check"}
                {@render check(editing)}
            {/if}
        {/if}
    </div>
    <div class="preview">
        {#each requests as request (request.id)}
            <div class="request-container">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="header" onclick={() => switchActive(request)}>
                    <div class="title">{request.title}</div>
                    <div class="controls">
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <i class="fa-solid fa-trash" onclick={(e) => deleteGroup(e, request)}></i>
                    </div>
                </div>
                <div class="rolls">
                    {#each request.rolls as roll}
                        {#await props.foundryApp.renderRoll(roll)}
                            <div>Loading...</div>
                        {:then rollHTML}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="roll"
                                class:active={editing === roll}
                                onclick={(e) => onClickRoll(e, request, roll)}
                                transition:fade
                            >
                                {@html rollHTML}
                                <div class="controls">
                                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                                    <i class="fa-solid fa-trash" onclick={(e) => deleteRoll(e, roll)}></i>
                                </div>
                            </div>
                        {/await}
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
<div class="submit-buttons">
    <button type="button" onclick={() => props.foundryApp.sendToChat($state.snapshot(requests))}>
        {localize("GMDialog.Buttons.SendToChatLabel")}
    </button>
</div>

{#if props.history.length > 0}
    <button
        type="button"
        class="pf2e-rr--show-history"
        aria-label="show-history"
        data-tooltip={localize("GMDialog.Buttons.ShowHistoryLabel")}
        onclick={() => (showHistory = !showHistory)}
    >
        <i class="fa-solid fa-chevron-right"></i>
    </button>
{/if}
{#if showHistory && props.history.length > 0}
    <div class="pf2e-rr--history" transition:fade>
        <div class="header">{localize("GMDialog.HistoryLabel")}</div>
        {#each props.history as item}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="item" onclick={() => loadHistory(item)}>{dayjs(item.time).format("YYYY-MM-DD - HH:mm:ss")}</div>
        {/each}
    </div>
{/if}

{#snippet action(data: ActionRoll)}
    <div class="form-group">
        <label for="action-select-{data.id}">{game.i18n.localize("PF2E.ActionTypeAction")}:</label>
        <select id="action-select-{data.id}" bind:value={data.slug} onchange={() => (data.variant = undefined)}>
            {#each props.actions as action}
                <option value={action.value}>{action.label}</option>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="action-variant-{data.id}">{localize("GMDialog.VariantLabel")}:</label>
        <select id="action-variant-{data.id}" bind:value={data.variant}>
            <option value=""></option>
            {#each getActionVariants(data.slug) as [slug, label]}
                <option value={slug}>{label}</option>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="action-dc-{data.id}">{game.i18n.localize("PF2E.Check.DC.Unspecific")}</label>
        <input id="action-dc-{data.id}" type="number" placeholder="0" bind:value={data.dc} onfocus={selectText} />
    </div>
    <div class="form-group">
        <label for="action-statistic-{data.id}">{game.i18n.localize("PF2E.SkillLabel")}:</label>
        <select id="action-statistic-{data.id}" bind:value={data.statistic}>
            <option value=""></option>
            <option value="perception">{game.i18n.localize("PF2E.PerceptionHeader")}</option>
            {#each Object.entries(props.skills) as [key, data]}
                <optgroup label={skillKeyToLabel[key]}>
                    {#each data as d}
                        <option value={d.value}>{d.label}</option>
                    {/each}
                </optgroup>
            {/each}
        </select>
    </div>
{/snippet}

{#snippet check(data: CheckRoll)}
    <div class="form-group">
        <label for="check-select-{data.id}">{game.i18n.localize("PF2E.SkillLabel")}:</label>
        <select id="check-select-{data.id}" bind:value={data.slug}>
            <option value="perception">{game.i18n.localize("PF2E.PerceptionHeader")}</option>
            {#each Object.entries(props.skills) as [key, data]}
                <optgroup label={skillKeyToLabel[key]}>
                    {#each data as d}
                        <option value={d.value}>{d.label}</option>
                    {/each}
                </optgroup>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="check-traits-{data.id}">{game.i18n.localize("PF2E.TraitsLabel")}:</label>
        <TraitsSelect
            options={props.traits}
            multiple
            closeAfterSelect
            clearable
            creatable={false}
            placeholder={game.i18n.localize("PF2E.SelectLabel")}
            value={data.traits}
            onChange={(selections) => selectTraits(selections, data)}
        />
    </div>
    <div class="form-group">
        <label for="check-dc-{data.id}">{game.i18n.localize("PF2E.Check.DC.Unspecific")}:</label>
        <input id="check-dc-{data.id}" type="number" bind:value={data.dc} onfocus={selectText} />
    </div>
    <div class="form-group">
        <label for="check-adjustment-{data.id}">{localize("GMDialog.AdjustmentLabel")}:</label>
        <select id="check-adjustment-{data.id}" bind:value={data.adjustment}>
            <option value="0"></option>
            {#each props.dcAdjustments as adjustment}
                <option value={adjustment.value}>{adjustment.label}</option>
            {/each}
        </select>
    </div>
{/snippet}

<style lang="scss">
    .container {
        display: grid;
        grid-template-columns: 1fr 0.95fr;
        height: 285px;
    }

    .edit {
        .add-buttons {
            display: flex;
            margin-top: 0.5em;
            margin-bottom: 0.5em;
        }

        .add-group {
            flex: 1;
            max-width: 2em;
        }
    }

    .preview {
        margin: 0.5em;
        flex: 1;
        overflow-y: auto;

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .rolls {
            display: flex;
            flex-direction: column;
            align-items: center;

            .roll {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                min-height: 2em;
                padding-left: 0.2em;
                margin-bottom: 0.3em;

                &.active {
                    border: 0.1em dashed var(--preview-border-color);
                }
            }
        }

        .controls {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 1.5em;
            margin-left: 5px;

            i {
                cursor: pointer;
                margin: 0.1em;
            }
        }

        .request-container {
            padding: 0.3em;
            background-color: var(--preview-bg-color);
            border: 1px solid var(--preview-border-color);
            border-radius: 4px;
            margin-bottom: 0.5em;
        }
    }

    .pf2e-rr--history {
        position: absolute;
        top: 0px;
        right: -11.5em;
        padding: 10px;

        background: var(--background);

        .header {
            text-align: center;
            margin-bottom: 0.5em;
        }

        .item {
            margin: 0.1em;
            cursor: pointer;

            &:hover {
                text-shadow: 0 0 8px var(--color-shadow-primary);
            }
        }
    }

    button.pf2e-rr--show-history {
        position: absolute;
        top: 2px;
        right: 10px;
        width: 16px;
        height: 16px;
    }

    input {
        margin: 0.5em;
    }

    select {
        margin: 0.3em;
    }

    :global {
        .theme-dark #pf2e-request-rolls {
            --visibility-gm-bg: var(--color-dark-6);
            --preview-bg-color: var(--color-dark-2);
            --preview-border-color: var(--color-dark-3);
        }

        #pf2e-request-rolls {
            --preview-bg-color: #999;
            --preview-border-color: var(--color-dark-3);
        }

        #pf2e-request-rolls {
            overflow: visible;

            .window-content {
                overflow: visible;
            }

            span[data-pf2-action] {
                white-space: unset;
                word-break: normal;
            }
        }

        .pf2e-rr--roll-container {
            display: flex;
            flex-direction: column;

            a.inline-check,
            span[data-pf2-action] {
                width: fit-content;
                margin-bottom: 5px;
                white-space: unset;
                word-break: normal;
            }
        }

        .pf2e-rr--roll-container:not(:last-child) {
            margin-bottom: 0.5em;
        }

        [data-theme][data-dorako-ui-scope="unlimited"] {
            button.pf2e-rr--show-history {
                top: unset;
                bottom: 355px;
            }

            div.pf2e-rr--history {
                top: 28px;
            }
        }
    }
</style>
