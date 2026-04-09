import type { ApplicationConfiguration, ApplicationRenderOptions } from "@client/applications/_module.mjs";
import type { ApplicationV2 } from "@client/applications/api/_module.mjs";
import { SvelteApplicationMixin, type SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { getSetting } from "../../../utils.ts";
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
            contentClasses: ["pf2e--request-rolls", "standard-form"],
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

    protected override async _onRender(context: object, options: ApplicationRenderOptions): Promise<void> {
        super._onRender(context, options);

        if (!document.hasFocus() && getSetting("pf2e-request-rolls", "playSoundInBackground")) {
            new Audio("./sounds/notify.wav").play();
        }
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
