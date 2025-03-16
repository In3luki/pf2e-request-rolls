import type {
    ApplicationConfiguration,
    ApplicationRenderOptions,
} from "@pf2e/types/foundry/client-esm/applications/_types.d.ts";
import type { ApplicationV2 } from "@pf2e/types/foundry/client-esm/applications/api/module.d.ts";
import type { ChatMessagePF2e } from "@pf2e/types/index.ts";
import { signedInteger, sortStringRecord } from "@util/misc.ts";
import { adjustDC, dcAdjustments } from "@util/pf2e.ts";
import * as R from "remeda";
import { SvelteApplicationMixin, SvelteApplicationRenderContext } from "../../svelte-mixin/mixin.svelte.ts";
import Root from "./app.svelte";

class RequestRolls extends SvelteApplicationMixin<
    AbstractConstructorOf<ApplicationV2> & { DEFAULT_OPTIONS: DeepPartial<RequestRollsConfiguration> }
>(foundry.applications.api.ApplicationV2) {
    static override DEFAULT_OPTIONS: DeepPartial<RequestRollsConfiguration> = {
        id: "pf2e-request-rolls",
        position: {
            width: 700,
            height: 400,
        },
        window: {
            icon: "fa-solid fa-dice",
            contentClasses: ["standard-form"],
            positioned: true,
            title: "PF2ERequestRolls.GMDialog.Title",
        },
    };

    declare options: RequestRollsConfiguration;
    declare $state: RequestRollsContext["state"];

    protected root = Root;

    #actions = this.#prepareActionData();

    #skillData = this.#prepareSkillData();

    static fromMessage(message: ChatMessagePF2e): void {
        const groups: RequestGroup[] | undefined = fu.getProperty(message.flags, "pf2e-request-rolls.groups");
        if (!groups) return;
        new this({ initial: groups }).render({ force: true });
    }

    protected override async _prepareContext(_options: ApplicationRenderOptions): Promise<RequestRollsContext> {
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

    getNewRollData(type: "action"): ActionRoll;
    getNewRollData(type: "check"): CheckRoll;
    getNewRollData(type: RequestRoll["type"]): RequestRoll;
    getNewRollData(type: RequestRoll["type"]): RequestRoll {
        switch (type) {
            case "action":
                return {
                    dc: 10,
                    id: fu.randomID(),
                    slug: this.#actions[0].value,
                    type: "action",
                };
            case "check":
                return {
                    dc: 10,
                    id: fu.randomID(),
                    traits: [],
                    slug: this.#skillData.skills[0].value,
                    type: "check",
                };
        }
    }

    async sendToChat(groups: RequestGroup[]): Promise<void> {
        let hasContent = false;
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
                hasContent = true;
            }
            const div = document.createElement("div");
            div.classList.add("pf2e-rr--roll-container");
            container.appendChild(div);
            for (const roll of group.rolls) {
                div.innerHTML += this.rollToInline(roll);
                hasContent = true;
            }
        }

        if (!hasContent) {
            ui.notifications.warn("PF2ERequestRolls.GMDialog.NoContentWarning", { localize: true });
            return;
        }

        await ChatMessage.create({
            content: container.outerHTML,
            flags: {
                ["pf2e-request-rolls"]: {
                    groups,
                },
            },
        });
        const history = game.settings.get("pf2e-request-rolls", "history");
        history.push({
            id: fu.randomID(),
            groups,
            time: Date.now(),
        });
        await game.settings.set("pf2e-request-rolls", "history", R.takeLast(history, 5));
        this.close();
    }

    rollToInline(roll: RequestRoll): string {
        switch (roll.type) {
            case "action":
                return `[[/act ${roll.slug}${roll.variant ? ` variant=${roll.variant}` : ""} dc=${roll.dc}${roll.statistic ? ` statistic=${roll.statistic}` : ""}]]`;
            case "check": {
                const adjustment = roll.adjustment ? `|adjustment:${roll.adjustment}` : "";
                const traits = roll.traits.length ? `|traits:${roll.traits}` : "";
                return `@Check[${roll.slug}|dc:${roll.dc}${adjustment}${traits}]`;
            }
            default:
                return "";
        }
    }

    async renderRoll(roll: RequestRoll): Promise<string> {
        return TextEditor.enrichHTML(this.rollToInline(roll));
    }

    #prepareActionData(): LabeledValue[] {
        return game.pf2e.actions.contents.map((action) => ({
            value: action.slug,
            label: game.i18n.localize(action.name),
        }));
    }

    #prepareSkillData(): RequestRollsContext["skills"] {
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

interface RequestRollsConfiguration extends ApplicationConfiguration {
    initial?: RequestGroup[];
}

interface RequestRollsContext extends SvelteApplicationRenderContext {
    actions: LabeledValue[];
    dcAdjustments: LabeledValue[];
    foundryApp: RequestRolls;
    history: RequestHistory[];
    initial: RequestGroup[];
    skills: {
        skills: LabeledValue[];
        lores: LabeledValue[];
        saves: LabeledValue[];
    };
    traits: LabeledValue[];
}

interface BaseRoll {
    id: string;
    dc: number;
    slug: string;
    type: string;
}

interface ActionRoll extends BaseRoll {
    statistic?: string;
    type: "action";
    variant?: string;
}

interface CheckRoll extends BaseRoll {
    adjustment?: number;
    traits: string[];
    type: "check";
}

interface RequestGroup {
    rolls: (ActionRoll | CheckRoll)[];
    id: string;
    title: string;
}

interface RequestHistory {
    id: string;
    groups: RequestGroup[];
    time: number;
}

type LabeledValue = { label: string; value: string };
type RequestRoll = ActionRoll | CheckRoll;

export { RequestRolls };
export type { ActionRoll, CheckRoll, LabeledValue, RequestGroup, RequestHistory, RequestRoll, RequestRollsContext };
