import type {
    ApplicationClosingOptions,
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client/applications/_module.d.mts";
import type ApplicationV2 from "@pf2e/types/foundry/client/applications/api/application.d.mts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import Root from "./select-players.svelte";

class SelectPlayersDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<SelectPlayersDialogConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    #confirmed = false;

    static override DEFAULT_OPTIONS: DeepPartial<SelectPlayersDialogConfiguration> = {
        id: "rr-select-players",
        position: {
            width: "auto",
            height: "auto",
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.SelectPlayersDialog.Title",
        },
    };

    declare options: SelectPlayersDialogConfiguration;
    declare $state: SelectPlayersDialogContext["state"];

    protected root = Root;

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<SelectPlayersDialogContext> {
        return {
            foundryApp: this,
            state: {
                players: this.options.players,
            },
        };
    }

    confirm(): void {
        this.#confirmed = true;
        this.close();
    }

    protected override _onClose(options: ApplicationClosingOptions): void {
        super._onClose(options);
        const result = this.#confirmed ? this.$state.players.filter((s) => s.checked).map((s) => s.id) : [];
        this.options.resolve(result);
    }
}

interface PlayerSelection {
    id: string;
    checked: boolean;
    name: string;
}

interface SelectPlayersDialogConfiguration extends ApplicationConfiguration {
    players: PlayerSelection[];
    resolve: (users: string[]) => void;
}

interface SelectPlayersDialogContext extends SvelteApplicationRenderContext {
    foundryApp: SelectPlayersDialog;
    state: {
        players: PlayerSelection[];
    };
}

export { SelectPlayersDialog };
export type { PlayerSelection, SelectPlayersDialogContext };
