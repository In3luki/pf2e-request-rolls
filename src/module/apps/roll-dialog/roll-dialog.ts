import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client-esm/applications/_types.d.ts";
import type { ApplicationV2 } from "@pf2e/types/foundry/client-esm/applications/api/module.d.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import type { SocketRollRequest } from "../types.ts";
import { testRequest } from "./data.ts";
import Root from "./roll-dialog.svelte";

class RollDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<RollDialogConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<RollDialogConfiguration> = {
        id: "{id}",
        position: {
            width: "auto",
            height: "auto",
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.RollDialog.Title",
        },
    };

    declare options: RollDialogConfiguration;
    declare $state: RollDialogContext["state"];

    protected root = Root;

    static async openTestDialog(): Promise<RollDialog> {
        const request = fu.deepClone(testRequest);
        return new this({ request }).render(true);
    }

    protected override _initializeApplicationOptions(
        options: Partial<RollDialogConfiguration>,
    ): RollDialogConfiguration {
        const initialized = super._initializeApplicationOptions(options) as RollDialogConfiguration;
        initialized.uniqueId = `pf2e-rr-dialog-${initialized.request.id}`;
        return initialized;
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<RollDialogContext> {
        return {
            request: this.options.request,
            foundryApp: this,
            state: {},
        };
    }
}

interface RollDialogConfiguration extends ApplicationConfiguration {
    request: SocketRollRequest;
}

interface RollDialogContext extends SvelteApplicationRenderContext {
    foundryApp: RollDialog;
    request: SocketRollRequest;
}

export { RollDialog };
export type { RollDialogContext };
