import type {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client/applications/_module.d.mts";
import type ApplicationV2 from "@pf2e/types/foundry/client/applications/api/application.d.mts";
import type {
    ChatContextFlag,
    ChatMessagePF2e,
    CheckContextChatFlag,
    DegreeOfSuccessString,
} from "@pf2e/types/index.ts";
import * as R from "remeda";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import type { RequestGroup, RequestRoll, SocketRollRequest } from "../types.ts";
import Root from "./results-dialog.svelte";

class ResultsDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<ResultsDialogConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<ResultsDialogConfiguration> = {
        id: "{id}",
        position: {
            width: "auto",
            height: "auto",
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["pf2e--request-rolls", "standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.ResultsDialog.Title",
        },
    };

    declare options: ResultsDialogConfiguration;
    declare $state: ResultsDialogContext["state"];

    protected root = Root;

    #hooks = {
        createChatMessage: 0,
        deleteChatMessage: 0,
    };

    protected override _initializeApplicationOptions(
        options: Partial<ResultsDialogConfiguration>,
    ): ResultsDialogConfiguration {
        const initialized = super._initializeApplicationOptions(options) as ResultsDialogConfiguration;
        initialized.uniqueId = `pf2e-rr-dialog-${initialized.request.id}`;
        return initialized;
    }

    protected override async _preFirstRender(
        context: Record<string, unknown>,
        options: ApplicationRenderOptions,
    ): Promise<void> {
        super._preFirstRender(context, options);

        this.#hooks.createChatMessage = Hooks.on("createChatMessage", (message: ChatMessagePF2e) => {
            this.#findResultMessage(message);
        });
        this.#hooks.deleteChatMessage = Hooks.on("deleteChatMessage", (message: ChatMessagePF2e) => {
            const result = this.$state.results.find((r) => r.userId === message.author?.id);
            if (result) {
                const data = this.#findGroupAndRoll(message);
                if (!data) return;
                if (result.groups[data.group.id]) {
                    delete result.groups[data.group.id];
                }
            }
        });
    }

    protected override async _preClose(options: ApplicationClosingOptions): Promise<void> {
        Hooks.off("createChatMessage", this.#hooks.createChatMessage);
        Hooks.off("deleteChatMessage", this.#hooks.deleteChatMessage);
        return super._preClose(options);
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<ResultsDialogContext> {
        const results = this.options.request.users.map((id) => ({
            groups: {},
            userId: id,
            name: game.users.get(id, { strict: true }).character?.name ?? "Unknown",
        }));
        for (const message of R.takeLast(game.messages.contents, 10)) {
            this.#findResultMessage(message, results);
        }
        return {
            request: this.options.request,
            foundryApp: this,
            state: {
                results,
            },
        };
    }

    #findResultMessage(message: ChatMessagePF2e, results?: RollResult[]): void {
        const data = this.#findGroupAndRoll(message);
        if (!data) return;
        const result = (results ?? this.$state.results).find((r) => r.userId === message.author?.id);
        if (!result) return;
        const group = result.groups[data.group.id];
        const reroll = data.context.isReroll
            ? data.context.options.includes("check:hero-point")
                ? "hero-point"
                : "other"
            : null;
        if (!group) {
            result.groups[data.group.id] = {
                label: data.group.title,
                messageId: message.id,
                outcome: data.context.outcome,
                reroll,
                roll: data.roll,
            };
            return;
        }
        group.label = data.group.title;
        group.messageId = message.id;
        group.outcome = data.context.outcome;
        group.reroll = reroll;
        group.roll = data.roll;
    }

    #findGroupAndRoll(
        message: ChatMessagePF2e,
    ): { context: CheckContextChatFlag; group: RequestGroup; roll: RequestRoll } | null {
        if (!message.author?.id) return null;
        const request = this.options.request;
        if (!request.users.includes(message.author.id)) return null;
        const context = message.flags.pf2e.context;
        if (!this.#isCheckMessageContext(context)) return null;
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

    #isCheckMessageContext(context?: ChatContextFlag): context is CheckContextChatFlag {
        if (!context) return false;
        return "outcome" in context && "unadjustedOutcome" in context;
    }
}

interface ResultsDialogConfiguration extends ApplicationConfiguration {
    request: SocketRollRequest;
}

interface ResultsDialogContext extends SvelteApplicationRenderContext {
    foundryApp: ResultsDialog;
    request: SocketRollRequest;
    state: {
        results: RollResult[];
    };
}

interface RollResult {
    name: string;
    userId: string;
    groups: Record<string, RollResultGroup>;
}

interface RollResultGroup {
    label: string;
    messageId: string | null;
    outcome?: DegreeOfSuccessString | null;
    roll: RequestRoll;
    reroll?: "hero-point" | "other" | null;
}

export { ResultsDialog };
export type { ResultsDialogContext, RollResult };
