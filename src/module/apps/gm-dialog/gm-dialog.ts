import type { ApplicationConfiguration, ApplicationRenderOptions } from "@client/applications/_module.mjs";
import type { ApplicationV2 } from "@client/applications/api/_module.mjs";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "@module/sheet/mixin.svelte.ts";
import { signedInteger, sortStringRecord } from "@util/misc.ts";
import { adjustDC, type DCAdjustment } from "@module/dc.ts";
import * as R from "remeda";
import { cssSettings } from "../../../settings/data.svelte.ts";
import { actionData, decompressFromBase64, hasNoContent, rollToInline, skillData } from "../helpers.ts";
import { ResultsDialog } from "../results-dialog/results-dialog.ts";
import { type PlayerSelection, SelectPlayersDialog } from "../select-players-dialog/select-players.ts";
import type { LabeledValue, RequestGroup, RequestHistory, SocketRollRequest } from "../types.ts";
import Root from "./gm-dialog.svelte";
import { updateGMDialogState } from "./state.svelte.ts";
import { getSetting } from "../../../utils.ts";

class GMDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<GMDialogConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<GMDialogConfiguration> = {
        id: "pf2e-request-rolls",
        position: {
            width: 700,
            height: "auto",
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["pf2e--request-rolls", "standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.GMDialog.Title",
            controls: [
                {
                    action: "openSettings",
                    icon: "fa-solid fa-cogs",
                    label: "PF2ERequestRolls.Settings.OpenSettingsLabel",
                    visible: true,
                },
            ],
        },
        actions: {
            openSettings: async (): Promise<void> => {
                // @ts-expect-error Missing type
                ui.activeWindow?.toggleControls();
                const sheet = game.settings.sheet;
                sheet.tabGroups.categories = "pf2e-request-rolls";
                // @ts-expect-error options type is not DeepPartial
                sheet.render({ force: true });
            },
        },
    };

    declare options: GMDialogConfiguration;
    declare $state: GMDialogContext["state"];

    protected root = Root;

    static fromMessage(message: ChatMessagePF2e): void {
        const groups = fu.getProperty(message.flags, "pf2e-request-rolls.groups") as RequestGroup[] | undefined;
        if (!groups) return;
        new this({ initial: groups }).render({ force: true });
    }

    static async fromString(text: string): Promise<void> {
        const groups = await decompressFromBase64(text);
        new this({ initial: groups }).render({ force: true });
    }

    static async open(): Promise<GMDialog> {
        return new this().render({ force: true });
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<GMDialogContext> {
        updateGMDialogState(this.options.initial);

        return {
            actions: actionData,
            dcAdjustments: this.#prepareDCAdjustments(),
            foundryApp: this,
            skills: skillData,
            state: {
                history: fu.deepClone(getSetting("pf2e-request-rolls", "history")).sort((a, b) => b.time - a.time),
            },
            traits: R.entries(sortStringRecord(CONFIG.PF2E.actionTraits)).map(([value, label]) => ({
                label,
                value,
            })),
        };
    }

    protected override async _preFirstRender(
        context: Record<string, unknown>,
        options: ApplicationRenderOptions,
    ): Promise<void> {
        if (!game.user.isGM) {
            throw Error("This Application is only usable by GMs!");
        }
        return super._preFirstRender(context, options);
    }

    async sendToChat(groups: RequestGroup[]): Promise<boolean> {
        if (hasNoContent(groups)) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoContentWarning", { localize: true });
            return false;
        }

        const css = cssSettings;
        const container = document.createElement("div");
        container.classList.add("pf2e--request-rolls-container");
        if (css.outerContainer) {
            container.style = css.outerContainer;
        }
        for (const group of groups) {
            const groupEl = document.createElement("div");
            groupEl.classList.add("group-container");
            if (css.groupContainer) {
                groupEl.style = css.groupContainer;
            }
            if (group.title) {
                const header = document.createElement("div");
                if (css.groupHeader) {
                    header.style = css.groupHeader;
                }
                header.classList.add("header");
                container.appendChild(header);
                const strong = document.createElement("strong");
                strong.innerHTML = group.title;
                header.appendChild(strong);
                groupEl.appendChild(header);
            }
            const div = document.createElement("div");
            div.classList.add("roll-container");
            if (css.rollContainer) {
                div.style = css.rollContainer;
            }
            groupEl.appendChild(div);
            container.appendChild(groupEl);
            for (const roll of group.rolls) {
                div.innerHTML += rollToInline({ roll });
            }
        }

        await ChatMessage.create({
            content: container.outerHTML,
            flags: {
                ["pf2e-request-rolls"]: {
                    groups,
                },
            },
        });

        await this.#updateHistory(groups);

        if (game.settings.get("pf2e-request-rolls", "gmDialog.autoClose")) {
            this.close();
        }
        return true;
    }

    async sendToSocket(event: MouseEvent, groups: RequestGroup[], socketId?: string): Promise<boolean> {
        if (hasNoContent(groups)) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoContentWarning", { localize: true });
            return false;
        }

        const players: PlayerSelection[] = game.users.players.flatMap((u) =>
            u.active && u.character ? { id: u.id, name: u.character.name, checked: true } : [],
        );
        if (players.length === 0) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoActivePlayersWarning", { localize: true });
            return false;
        }

        const users = await (async (): Promise<string[] | null> => {
            if (event.shiftKey) {
                return players.map((p) => p.id);
            }
            const { promise: dialog, resolve } = Promise.withResolvers<string[]>();
            new SelectPlayersDialog({ players, resolve }).render({ force: true });
            const users = await dialog;
            if (users.length === 0) {
                ui.notifications.warn("PF2ERequestRolls.GMDialog.NoPlayersSelectedWarning", { localize: true });
                return null;
            }
            return users;
        })();
        if (!users) return false;

        const id = socketId ?? fu.randomID();
        const message: SocketRollRequest = {
            id,
            groups,
            users,
            type: "roll-request",
        };

        game.socket.emit("module.pf2e-request-rolls", message);
        ui.notifications.info("PF2ERequestRolls.GMDialog.RequestSuccessful", { localize: true });

        await this.#updateHistory(groups, id);

        if (game.settings.get("pf2e-request-rolls", "showResultsDialog")) {
            new ResultsDialog({ request: message }).render({ force: true });
        }

        if (game.settings.get("pf2e-request-rolls", "gmDialog.autoClose")) {
            this.close();
        }
        return true;
    }

    async #updateHistory(groups: RequestGroup[], socketId?: string): Promise<void> {
        const history = this.$state.history;

        history.push({
            id: fu.randomID(),
            groups,
            time: Date.now(),
            socketId,
        });
        if (history.length > 10) {
            const oldest = fu.deepClone(history).sort((a, b) => a.time - b.time)[0];
            history.findSplice((h) => h.id === oldest.id);
        }
        history.sort((a, b) => b.time - a.time);

        await game.settings.set("pf2e-request-rolls", "history", this.$state.history);
    }

    #prepareDCAdjustments(): LabeledValue[] {
        const localizeToCapitalized = (key: string): string => {
            const translated = game.i18n.localize(key);
            if (game.i18n.lang !== "en") return translated;
            // Capitalize english adjustment strings
            return translated
                .split(" ")
                .map((w) => `${w[0].toLocaleUpperCase("en")}${w.slice(1)}`)
                .join(" ");
        };

        const dcAdjustments = new Map<DCAdjustment, number>([
            ["incredibly-easy", -10],
            ["very-easy", -5],
            ["easy", -2],
            ["normal", 0],
            ["hard", 2],
            ["very-hard", 5],
            ["incredibly-hard", 10],
        ]);

        return R.entries(CONFIG.PF2E.dcAdjustments)
            .filter(([value, _]) => value !== "normal")
            .map(([value, name]) => {
                return {
                    value: String(dcAdjustments.get(value)),
                    label: `${localizeToCapitalized(name)} (${signedInteger(adjustDC(0, value))})`,
                };
            });
    }
}

interface ActionRenderData {
    label: string;
    slug: string;
    statistic?: string;
    variants: {
        slug: string;
        label: string;
        statistic?: string;
    }[];
}

interface GMDialogConfiguration extends ApplicationConfiguration {
    initial?: RequestGroup[];
}

interface GMDialogContext extends SvelteApplicationRenderContext {
    actions: ActionRenderData[];
    dcAdjustments: LabeledValue[];
    foundryApp: GMDialog;
    skills: {
        skills: LabeledValue[];
        lores: LabeledValue[];
        saves: LabeledValue[];
    };
    state: {
        history: RequestHistory[];
    };
    traits: LabeledValue[];
}

export { GMDialog };
export type { ActionRenderData, GMDialogContext };
