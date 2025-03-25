import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client-esm/applications/_types.d.ts";
import type { ApplicationV2 } from "@pf2e/types/foundry/client-esm/applications/api/module.d.ts";
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
            const result = this.$state.results.find((r) => r.messageId === message.id);
            if (result) {
                result.messageId = null;
                result.roll = null;
                result.outcome = null;
            }
        });
    }

    protected override async _preClose(options: ApplicationRenderOptions): Promise<void> {
        Hooks.off("createChatMessage", this.#hooks.createChatMessage);
        Hooks.off("deleteChatMessage", this.#hooks.deleteChatMessage);
        return super._preClose(options);
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<ResultsDialogContext> {
        const results = this.options.request.users.map((id) => ({
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
        if (!message.author?.id) return;
        const request = this.options.request;
        if (!request.users.includes(message.author.id)) return;
        const context = message.flags.pf2e.context;
        if (!this.#isCheckMessageContext(context)) return;
        const options = context.options;
        if (!options.includes(`request-rolls-id:${request.id}`)) return;
        const rollId = options
            .find((o) => o.startsWith("request-rolls-roll-id:"))
            ?.split(":")
            .at(1);
        if (!rollId) return;
        const data = ((): { group: RequestGroup; roll: RequestRoll } | null => {
            for (const group of request.groups) {
                for (const roll of group.rolls) {
                    if (roll.id === rollId) return { group, roll };
                }
            }
            return null;
        })();
        if (!data) return;
        const result = (results ?? this.$state.results).find((r) => r.userId === message.author!.id);
        if (!result) return;
        if (context.isReroll) {
            result.reroll = options.includes("check:hero-point") ? "hero-point" : "other";
        }
        result.messageId = message.id;
        result.roll = data.roll;
        result.groupLabel = data.group.title;
        result.outcome = context.outcome;
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
    messageId?: string | null;
    name: string;
    userId: string;
    groupLabel?: string;
    outcome?: DegreeOfSuccessString | null;
    roll?: RequestRoll | null;
    reroll?: "hero-point" | "other";
}

export { ResultsDialog };
export type { ResultsDialogContext, RollResult };
