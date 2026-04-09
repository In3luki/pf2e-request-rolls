import type { ChatContextFlag, CheckContextChatFlag } from "@module/chat-message/data.ts";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { MacroPF2e } from "@module/macro.ts";
import * as R from "remeda";
import { RequestGroup, RequestRoll, SocketRollRequest } from "../types.ts";
import type { ResultsDialogConfiguration, RollResult } from "./results-dialog.ts";

/** The Result Dialog svelte state */
const resultState: { results: RollResult[] } = $state({ results: [] });

function prepareResults(options: ResultsDialogConfiguration): void {
    const results = options.request.users.map((id) => ({
        groups: {},
        userId: id,
        name: game.users.get(id, { strict: true }).character?.name ?? "Unknown",
    }));
    for (const message of R.takeLast(game.messages.contents, 10)) {
        findResultMessage(message, options.request, results);
    }
    resultState.results = results;
}

function findGroupAndRoll(
    message: ChatMessagePF2e,
    request: SocketRollRequest,
): { context: CheckContextChatFlag; group: RequestGroup; roll: RequestRoll } | null {
    if (!message.author?.id) return null;
    if (!request.users.includes(message.author.id)) return null;
    const context = message.flags.pf2e.context;
    if (!isCheckMessageContext(context)) return null;
    const options = context.options;
    if (!options.includes(`request-rolls-id:${request.id}`)) return null;
    const rollId = options
        .find((o) => o.startsWith("request-rolls-roll-id:"))
        ?.split(":")
        .at(1);
    if (!rollId) return null;
    for (const group of request.groups) {
        for (const roll of group.rolls) {
            if (roll.id === rollId) return { context, group, roll };
        }
    }
    return null;
}

function getRerollKind(options: string[]): string {
    const rerollKinds = ["hero-points", "mythic-points"];
    for (const kind of rerollKinds) {
        if (options.includes(`check:reroll:${kind}`)) return kind;
    }
    return "other";
}

function findResultMessage(message: ChatMessagePF2e, request: SocketRollRequest, results?: RollResult[]): void {
    const data = findGroupAndRoll(message, request);
    if (!data) return;
    const result = (results ?? resultState.results).find((r) => r.userId === message.author?.id);
    if (!result) return;
    const reroll = data.context.isReroll ? getRerollKind(data.context.options) : null;
    result.groups[data.group.id] = {
        label: data.group.title,
        messageId: message.id,
        outcome: data.context.outcome,
        reroll,
        roll: data.roll,
    };

    const macroUUID = data.group.macro;
    if (macroUUID && data.context.outcome) {
        // Do not run macros for older chat messages
        if (Date.now() - message.timestamp > 10_000 && !reroll) return;

        const macro = fu.fromUuidSync<MacroPF2e>(macroUUID);
        if (!macro) {
            const text = game.i18n.format("PF2ERequestRolls.GMDialog.Macros.Missing", { uuid: macroUUID });
            ui.notifications.warn(text, { console: false });
            return;
        }
        const roll = $state.snapshot(result.groups[data.group.id]);

        macro.execute({
            rrData: {
                actor: message.actor ?? undefined,
                token: message.actor?.getActiveTokens(true)?.at(0) ?? undefined,
                ...R.omit(roll, ["messageId"]),
                message,
                rollResult: message.rolls.at(0)?.total ?? 0,
            },
            speaker: message.speaker,
        });
    }
}

function tryDeleteResult(message: ChatMessagePF2e, request: SocketRollRequest): void {
    const result = resultState.results.find((r) => r.userId === message.author?.id);
    if (!result) return;
    const data = findGroupAndRoll(message, request);
    if (!data) return;
    if (result.groups[data.group.id]) {
        delete result.groups[data.group.id];
    }
}

function isCheckMessageContext(context?: ChatContextFlag): context is CheckContextChatFlag {
    if (!context) return false;
    return "outcome" in context && "unadjustedOutcome" in context;
}

export { findGroupAndRoll, findResultMessage, prepareResults, resultState, tryDeleteResult };
