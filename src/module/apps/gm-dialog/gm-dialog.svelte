<script lang="ts">
    import { untrack } from "svelte";
    import { fade } from "svelte/transition";
    import dayjs from "dayjs";
    import type { GMDialogContext } from "./gm-dialog.ts";
    import type { ActionRoll, CheckRoll, CounteractRoll, RequestGroup, RequestHistory, RequestRoll } from "../types.ts";
    import { localize } from "@util/misc.ts";
    import TraitsSelect from "@module/components/traits/traits-select.svelte";
    import { compressToBase64, getInlineLink, rollToInline } from "../helpers.ts";

    const props: GMDialogContext = $props();
    const requests: RequestGroup[] = $state(props.initial);
    let selectedGroupId = $state(requests[0]?.id ?? "");
    let selectedGroup = $derived(requests.find((r) => r.id === selectedGroupId) ?? requests[0]);
    let selectedRollId: string | null = $state(null);
    let socketId: string | undefined;
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

    function selectTraits(selections: { label: string; value: string }[], roll: CheckRoll): void {
        roll.traits = selections.map((s) => s.value);
    }

    function loadHistory(item: RequestHistory): void {
        socketId = item.socketId;
        untrack(() => (requests.length = 0));
        requests.push(...fu.deepClone(item.groups));
    }

    async function onSendButtonClick(event: MouseEvent, kind: "chat" | "socket"): Promise<void> {
        const groups = $state.snapshot(requests);
        let success = false;
        switch (kind) {
            case "chat":
                success = await props.foundryApp.sendToChat(groups);
                break;
            case "socket":
                success = await props.foundryApp.sendToSocket(event, groups, socketId);
        }
        socketId = undefined;
        if (success) {
            clearAll();
        }
    }

    function onChangeAction(event: Event & { currentTarget: HTMLSelectElement }, roll: ActionRoll): void {
        roll.slug = event.currentTarget.value;
        const action = props.actions.find((a) => a.slug === roll.slug);
        roll.variant = action?.variants.at(0)?.slug;
        roll.statistic = action?.statistic;
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

    function onRClickRoll(event: MouseEvent, roll: RequestRoll): void {
        if (event.shiftKey) {
            game.clipboard.copyPlainText(rollToInline({ roll, requestOptions: false }));
            ui.notifications.info("PF2ERequestRolls.GMDialog.CopyAsInlineLinkConfirmation", { localize: true });
        }
    }

    async function onClickCopy(): Promise<void> {
        const text = await compressToBase64($state.snapshot(requests));
        game.clipboard.copyPlainText(`@RequestRolls[${text}]`);
        ui.notifications.info("PF2ERequestRolls.GMDialog.CopyAsInlineLinkConfirmation", { localize: true });
    }

    async function clearAll(dialog = false): Promise<void> {
        if (dialog) {
            const confirmed = await foundry.applications.api.DialogV2.confirm({
                content: localize("GMDialog.ConfirmClearAll"),
                rejectClose: false,
                modal: true,
            });
            if (!confirmed) return;
        }
        untrack(() => (requests.length = 0));
        requests.push(props.foundryApp.getNewGroupData());
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

<div class="top-controls">
    <div class="left">
        <button
            type="button"
            aria-labelledby="data-tooltip"
            data-tooltip={localize("GMDialog.CopyAsInlineLink")}
            onclick={() => onClickCopy()}
        >
            <i class="fa-solid fa-copy"></i>
        </button>
    </div>
    <div class="right">
        <button
            type="button"
            aria-labelledby="data-tooltip"
            data-tooltip={localize("GMDialog.Buttons.ClearAllLabel")}
            onclick={() => clearAll(true)}
        >
            <i class="fa-solid fa-arrow-rotate-left"></i>
        </button>
        <button
            type="button"
            class="pf2e-rr--show-history"
            aria-labelledby="data-tooltip"
            data-tooltip={localize("GMDialog.Buttons.ShowHistoryLabel")}
            disabled={props.state.history.length === 0}
            onclick={() => (showHistory = !showHistory)}
        >
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    </div>
</div>
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
            <button type="button" onclick={() => createNewRoll("counteract")}>
                {localize("GMDialog.Buttons.CounteractLabel")}
            </button>
        </div>
        {#if editing}
            {#if editing.type === "action"}
                {@render action(editing)}
            {:else if editing.type === "check"}
                {@render check(editing)}
            {:else if editing.type === "counteract"}
                {@render counteract(editing)}
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
                        {#await getInlineLink({ roll })}
                            <div>Loading...</div>
                        {:then rollHTML}
                            <!-- svelte-ignore a11y_click_events_have_key_events -->
                            <!-- svelte-ignore a11y_no_static_element_interactions -->
                            <div
                                class="roll"
                                class:active={editing === roll}
                                onclick={(e) => onClickRoll(e, request, roll)}
                                oncontextmenu={(e) => onRClickRoll(e, roll)}
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
    <button type="button" onclick={(e) => onSendButtonClick(e, "chat")}>
        {localize("GMDialog.Buttons.SendToChatLabel")}
    </button>
    <button type="button" onclick={(e) => onSendButtonClick(e, "socket")}>
        {localize("GMDialog.Buttons.RequestRollsLabel")}
    </button>
    <button type="button" onclick={() => props.foundryApp.close()}>
        {game.i18n.localize("Close")}
    </button>
</div>

{#if showHistory && props.state.history.length > 0}
    <div class="pf2e-rr--history" transition:fade>
        <div class="header">{localize("GMDialog.HistoryLabel")}</div>
        {#each props.state.history as item}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="item" onclick={() => loadHistory(item)}>{dayjs(item.time).format("YYYY-MM-DD - HH:mm:ss")}</div>
        {/each}
    </div>
{/if}

{#snippet action(roll: ActionRoll)}
    {@const action = props.actions.find((a) => a.slug === roll.slug) ?? { variants: [] }}
    <div class="form-group">
        <label for="action-select-{roll.id}">{game.i18n.localize("PF2E.ActionTypeAction")}:</label>
        <select id="action-select-{roll.id}" name="actions" value={roll.slug} onchange={(e) => onChangeAction(e, roll)}>
            {#each props.actions as action}
                <option value={action.slug}>{action.label}</option>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="action-variant-{roll.id}">{localize("GMDialog.VariantLabel")}:</label>
        <select id="action-variant-{roll.id}" disabled={action.variants.length === 0} bind:value={roll.variant}>
            {#each action.variants as variant}
                <option value={variant.slug}>{variant.label}</option>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="action-dc-{roll.id}">{game.i18n.localize("PF2E.Check.DC.Unspecific")}</label>
        <input
            id="action-dc-{roll.id}"
            type="number"
            min="0"
            placeholder="0"
            bind:value={roll.dc}
            onfocus={selectText}
        />
    </div>
    <div class="form-group">
        <label for="action-statistic-{roll.id}">{localize("GMDialog.StatisticLabel")}:</label>
        <select id="action-statistic-{roll.id}" name="skills" bind:value={roll.statistic}>
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
    <div class="form-group">
        <label for="check-label-{roll.id}">{localize("GMDialog.Label")}:</label>
        <input
            id="check-label-{roll.id}"
            type="text"
            placeholder={localize("GMDialog.LabelPlaceholder")}
            bind:value={roll.label}
        />
    </div>
{/snippet}

{#snippet check(roll: CheckRoll)}
    <div class="form-group">
        <label for="check-select-{roll.id}">{game.i18n.localize("PF2E.Roll.Type")}:</label>
        <select class="check-select" id="check-select-{roll.id}" name="skills" bind:value={roll.slug}>
            <option value="perception">{game.i18n.localize("PF2E.PerceptionHeader")}</option>
            <option value="flat">{game.i18n.localize("PF2E.FlatCheck")}</option>
            <option value="spell-attack">{game.i18n.localize("PF2E.SpellAttackLabel")}</option>
            {#each Object.entries(props.skills) as [key, data]}
                <optgroup label={skillKeyToLabel[key]}>
                    {#each data as d}
                        <option value={d.value}>{d.label}</option>
                    {/each}
                </optgroup>
            {/each}
        </select>
    </div>
    {#if ["fortitude", "reflex", "will"].includes(roll.slug)}
        <div class="form-group">
            <label for="check-basic-{roll.id}">{game.i18n.localize("Basic")}:</label>
            <input type="checkbox" id="check-basic-{roll.id}" bind:checked={roll.basic} />
        </div>
    {/if}
    <div class="form-group">
        <label for="check-traits-{roll.id}">{game.i18n.localize("PF2E.TraitsLabel")}:</label>
        <TraitsSelect
            options={props.traits}
            multiple
            closeAfterSelect
            clearable
            creatable={false}
            placeholder={game.i18n.localize("PF2E.SelectLabel")}
            value={roll.traits}
            onChange={(selections) => selectTraits(selections, roll)}
        />
    </div>
    {#if roll.slug === "spell-attack"}
        <div class="form-group">
            <label for="check-select-against-{roll.id}">{localize("GMDialog.AgainstLabel")}:</label>
            <select
                class="check-select-against"
                id="check-select-against-{roll.id}"
                name="defense"
                bind:value={roll.against}
            >
                <option value="ac">{game.i18n.localize("PF2E.ArmorClassLabel")}</option>
                {#each props.skills.saves as save}
                    <option value={save.value}>
                        {game.i18n.format("PF2E.InlineCheck.DCWithName", { name: save.label })}
                    </option>
                {/each}
            </select>
        </div>
    {:else}
        <div class="form-group">
            <label for="check-dc-{roll.id}">{game.i18n.localize("PF2E.Check.DC.Unspecific")}:</label>
            <input id="check-dc-{roll.id}" type="number" min="0" bind:value={roll.dc} onfocus={selectText} />
        </div>
    {/if}
    <div class="form-group">
        <label for="check-label-{roll.id}">{localize("GMDialog.Label")}:</label>
        <input
            id="check-label-{roll.id}"
            type="text"
            placeholder={localize("GMDialog.LabelPlaceholder")}
            bind:value={roll.label}
        />
    </div>
    <div class="form-group">
        <label for="check-adjustment-{roll.id}">{localize("GMDialog.AdjustmentLabel")}:</label>
        <select id="check-adjustment-{roll.id}" onchange={(e) => (roll.adjustment = Number(e.currentTarget.value))}>
            <option value="0"></option>
            {#each props.dcAdjustments as adjustment}
                <option value={adjustment.value}>{adjustment.label}</option>
            {/each}
        </select>
    </div>
{/snippet}

{#snippet counteract(roll: CounteractRoll)}
    <div class="form-group">
        <label for="check-select-{roll.id}">{game.i18n.localize("PF2E.Roll.Type")}:</label>
        <select class="check-select" id="check-select-{roll.id}" name="skills" bind:value={roll.slug}>
            {#each props.skills.skills as skill}
                <option value={skill.value}>{skill.label}</option>
            {/each}
        </select>
    </div>
    <div class="form-group">
        <label for="check-source-rank-{roll.id}" data-tooltip="PF2ERequestRolls.GMDialog.Counteract.RankHint">
            {localize("GMDialog.SourceRankLabel")}:
        </label>
        <input
            id="check-source-rank-{roll.id}"
            type="number"
            min="0"
            max="10"
            bind:value={roll.sourceRank}
            onfocus={selectText}
        />
    </div>
    <div class="form-group">
        <label for="check-target-rank-{roll.id}" data-tooltip="PF2ERequestRolls.GMDialog.Counteract.RankHint">
            {localize("GMDialog.TargetRankLabel")}:
        </label>
        <input
            id="check-target-rank-{roll.id}"
            type="number"
            min="0"
            max="13"
            bind:value={roll.targetRank}
            onfocus={selectText}
        />
    </div>
    <div class="form-group">
        <label for="check-dc-{roll.id}" data-tooltip="PF2ERequestRolls.GMDialog.Counteract.DCHint">
            {game.i18n.localize("PF2E.Check.DC.Unspecific")}:
        </label>
        <input id="check-dc-{roll.id}" type="number" min="0" bind:value={roll.dc} onfocus={selectText} />
    </div>
    <div class="form-group">
        <label for="check-label-{roll.id}">{localize("GMDialog.Label")}:</label>
        <input
            id="check-label-{roll.id}"
            type="text"
            placeholder={localize("GMDialog.LabelPlaceholder")}
            bind:value={roll.label}
        />
    </div>
{/snippet}

<style lang="scss">
    .top-controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.25em;

        button {
            min-height: unset;
            height: 1.5em;
        }

        .left,
        .right {
            display: flex;
            button {
                margin-right: 0.4em;
            }
        }
    }

    button {
        width: 100%;
        margin: 0 1px;
    }

    .container {
        display: grid;
        grid-template-columns: 1fr 0.95fr;
        min-height: 317px;
        height: auto;
    }

    .submit-buttons {
        display: flex;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }

    .edit {
        .add-buttons {
            display: flex;
            margin-top: 0.5em;
            margin-bottom: 0.5em;

            button {
                line-height: 14px;
            }
        }

        .add-group {
            flex: 1;
            max-width: 2em;
        }

        .check-select {
            margin-bottom: 5px;
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
                    border: 0.1em dashed var(--pf2e-rr--preview-border-color);
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
            background-color: var(--pf2e-rr--preview-bg-color);
            border: 1px solid var(--pf2e-rr--preview-border-color);
            border-radius: 4px;
            margin-bottom: 0.5em;
        }
    }

    .pf2e-rr--history {
        position: absolute;
        top: 36px;
        right: -11.5em;
        padding: 10px;

        background: var(--background);
        border: 1px solid var(--pf2e-rr--preview-border-color);
        border-radius: 4px;

        .header {
            text-align: center;
            margin-bottom: 0.5em;
        }

        .item {
            margin: 0.1em;
            cursor: pointer;

            &:hover {
                text-shadow: 0 0 8px #ff0000;
            }
        }
    }

    input {
        margin: 0.5em;
    }

    select {
        margin: 0.3em;
    }

    :global {
        #pf2e-request-rolls {
            overflow: visible;

            .window-content {
                overflow: visible;
                padding: 0 1rem;
                gap: unset;
            }

            span[data-pf2-action],
            a[data-pf2-check] {
                white-space: unset;
                word-break: normal;
            }
        }
    }
</style>
