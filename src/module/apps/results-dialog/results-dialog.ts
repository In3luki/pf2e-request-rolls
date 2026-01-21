import type {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client/applications/_module.d.mts";
import type ApplicationV2 from "@pf2e/types/foundry/client/applications/api/application.d.mts";
import type { ChatMessagePF2e, DegreeOfSuccessString } from "@pf2e/types/index.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import type { RequestRoll, SocketRollRequest } from "../types.ts";
import Root from "./results-dialog.svelte";
import { findResultMessage, prepareResults, tryDeleteResult } from "./state.svelte.ts";

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
            findResultMessage(message, this.options.request);
        });
        this.#hooks.deleteChatMessage = Hooks.on("deleteChatMessage", (message: ChatMessagePF2e) => {
            tryDeleteResult(message, this.options.request);
        });
    }

    protected override async _preClose(options: ApplicationClosingOptions): Promise<void> {
        Hooks.off("createChatMessage", this.#hooks.createChatMessage);
        Hooks.off("deleteChatMessage", this.#hooks.deleteChatMessage);
        return super._preClose(options);
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<ResultsDialogContext> {
        prepareResults(this.options);

        return {
            request: this.options.request,
            foundryApp: this,
            state: {},
        };
    }
}

interface ResultsDialogConfiguration extends ApplicationConfiguration {
    request: SocketRollRequest;
}

interface ResultsDialogContext extends SvelteApplicationRenderContext {
    foundryApp: ResultsDialog;
    request: SocketRollRequest;
    state: object;
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
    reroll?: string | null;
}

export { ResultsDialog };
export type { ResultsDialogConfiguration, ResultsDialogContext, RollResult };
