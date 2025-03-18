import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client-esm/applications/_types.d.ts";
import type { ApplicationV2 } from "@pf2e/types/foundry/client-esm/applications/api/module.d.ts";
import type { Action, ActionVariant, ChatMessagePF2e } from "@pf2e/types/index.ts";
import { signedInteger, sortStringRecord } from "@util/misc.ts";
import { adjustDC, dcAdjustments } from "@util/pf2e.ts";
import * as R from "remeda";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import { hasNoContent, rollToInline } from "../helpers.ts";
import type { LabeledValue, RequestGroup, RequestHistory, RequestRoll, SocketRollRequest } from "../types.ts";
import Root from "./gm-dialog.svelte";

class GMDialog extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<GMDialogConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<GMDialogConfiguration> = {
        id: "pf2e-request-rolls",
        position: {
            width: 700,
            height: 410,
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.GMDialog.Title",
        },
    };

    declare options: GMDialogConfiguration;
    declare $state: GMDialogContext["state"];

    protected root = Root;

    #actions = this.#prepareActionData();

    #skillData = this.#prepareSkillData();

    static fromMessage(message: ChatMessagePF2e): void {
        const groups: RequestGroup[] | undefined = fu.getProperty(message.flags, "pf2e-request-rolls.groups");
        if (!groups) return;
        new this({ initial: groups }).render({ force: true });
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<GMDialogContext> {
        return {
            actions: this.#actions,
            dcAdjustments: this.#prepareDCAdjustments(),
            foundryApp: this,
            history: fu.deepClone(game.settings.get("pf2e-request-rolls", "history")).reverse(),
            initial: this.options.initial ?? [this.getNewGroupData()],
            skills: this.#skillData,
            state: {},
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

    getNewGroupData(): RequestGroup {
        return {
            id: fu.randomID(),
            rolls: [],
            title: "",
        };
    }

    getNewRollData(type: RequestRoll["type"]): RequestRoll {
        switch (type) {
            case "action":
                return {
                    dc: 10,
                    id: fu.randomID(),
                    slug: this.#actions[0].slug,
                    statistic: this.#actions[0].statistic,
                    variant: this.#actions[0].variants.at(0)?.slug,
                    type: "action",
                };
            case "check":
                return {
                    dc: 10,
                    id: fu.randomID(),
                    traits: [],
                    slug: "perception",
                    type: "check",
                };
            default:
                throw Error(`Unknown type ${type}`);
        }
    }

    async sendToChat(groups: RequestGroup[]): Promise<void> {
        if (hasNoContent(groups)) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoContentWarning", { localize: true });
            return;
        }

        const container = document.createElement("div");
        container.classList.add("pf2e-rr--container");
        for (const group of groups) {
            if (group.title) {
                const header = document.createElement("div");
                header.classList.add("pf2e-rr--header");
                container.appendChild(header);
                const strong = document.createElement("strong");
                strong.innerHTML = group.title;
                header.appendChild(strong);
            }
            const div = document.createElement("div");
            div.classList.add("pf2e-rr--roll-container");
            container.appendChild(div);
            for (const roll of group.rolls) {
                div.innerHTML += rollToInline(roll);
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
        this.close();
    }

    async sendToSocket(groups: RequestGroup[]): Promise<void> {
        if (hasNoContent(groups)) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoContentWarning", { localize: true });
            return;
        }

        const message: SocketRollRequest = {
            id: fu.randomID(),
            groups,
            users: game.users.players.flatMap((u) => (u.active ? u.id : [])),
        };
        game.socket.emit("module.pf2e-request-rolls", message);

        await this.#updateHistory(groups);
        this.close();
    }

    async #updateHistory(groups: RequestGroup[]): Promise<void> {
        const history = game.settings.get("pf2e-request-rolls", "history");
        history.push({
            id: fu.randomID(),
            groups,
            time: Date.now(),
        });
        await game.settings.set("pf2e-request-rolls", "history", R.takeLast(history, 10));
    }

    #prepareActionData(): ActionRenderData[] {
        const getStatistic = (a: Action | ActionVariant): string | undefined => {
            if ("statistic" in a && typeof a.statistic === "string") {
                return a.statistic;
            }
            return;
        };

        return game.pf2e.actions.contents.map((a) => {
            const data: ActionRenderData = {
                label: game.i18n.localize(a.name),
                slug: a.slug,
                variants: [],
            };
            const stat = getStatistic(a);
            if (stat) {
                data.statistic = stat;
            }
            for (const v of a.variants.contents) {
                const variant = {
                    label: game.i18n.localize(v.name ?? ""),
                    slug: v.slug,
                };
                const stat = getStatistic(v);
                if (stat) {
                    data.statistic = stat;
                }
                data.variants.push(variant);
            }
            return data;
        });
    }

    #prepareSkillData(): GMDialogContext["skills"] {
        const lores = new Map<string, string>();
        const loreToCharacters = new Map<string, string[]>();

        for (const character of game.actors.filter((a) => a.hasPlayerOwner && a.type !== "familiar")) {
            for (const [slug, statistic] of Object.entries(character.skills ?? {})) {
                if (!statistic.lore) continue;
                lores.set(slug, statistic.label);
                if (loreToCharacters.has(slug)) {
                    loreToCharacters.get(slug)?.push(character.name);
                } else {
                    loreToCharacters.set(slug, [character.name]);
                }
            }
        }
        for (const [slug, label] of lores) {
            const characters = loreToCharacters.get(slug);
            if (!characters) {
                console.warn(`Found lore skill without a character!? ${slug} (${label})`);
                continue;
            }
            lores.set(slug, `${label} (${characters.join(", ")})`);
        }

        return {
            skills: R.entries(CONFIG.PF2E.skills)
                .map(([value, s]) => ({ label: game.i18n.localize(s.label), value }))
                .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang)),
            lores: [...lores.entries()].map(([value, label]) => ({ value, label })),
            saves: R.entries(sortStringRecord(CONFIG.PF2E.saves)).map(([value, label]) => ({ value, label })),
        };
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
    history: RequestHistory[];
    initial: RequestGroup[];
    skills: {
        skills: LabeledValue[];
        lores: LabeledValue[];
        saves: LabeledValue[];
    };
    traits: LabeledValue[];
}

export { GMDialog };
export type { GMDialogContext };
