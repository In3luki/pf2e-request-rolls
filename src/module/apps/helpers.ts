import type { Action, ActionVariant } from "@pf2e/types/index.ts";
import { sortStringRecord } from "@util/misc.ts";
import * as R from "remeda";
import { ActionRenderData, GMDialogContext } from "./gm-dialog/gm-dialog.ts";
import type { RequestGroup, RequestRoll } from "./types.ts";

const actions = new Map<string, string>();
const allSkills = new Map<string, string>();
const actionData: ActionRenderData[] = [];
const skillData: GMDialogContext["skills"] = {
    lores: [],
    saves: [],
    skills: [],
};

function prepareActionData(): void {
    const getStatistic = (a: Action | ActionVariant): string | undefined => {
        if ("statistic" in a && typeof a.statistic === "string") {
            return a.statistic;
        }
        return;
    };

    for (const a of game.pf2e.actions.contents) {
        const data: ActionRenderData = {
            label: game.i18n.localize(a.name),
            slug: a.slug,
            variants: [],
        };
        actions.set(data.slug, data.label);
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
        actionData.push(data);
    }
}

function prepareSkillData(): void {
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

    skillData.skills = R.entries(CONFIG.PF2E.skills)
        .map(([value, s]) => {
            const label = game.i18n.localize(s.label);
            allSkills.set(value, label);
            return { label, value };
        })
        .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang));
    skillData.lores = [...lores.entries()].map(([value, label]) => {
        allSkills.set(value, label);
        return { label, value };
    });
    skillData.saves = R.entries(sortStringRecord(CONFIG.PF2E.saves)).map(([value, label]) => {
        allSkills.set(value, label);
        return { label, value };
    });
    allSkills.set("perception", game.i18n.localize("PF2E.PerceptionLabel"));
}

function hasNoContent(groups: RequestGroup[]): boolean {
    return !groups.some((g) => g.rolls.length > 0);
}

function rollToInline(roll: RequestRoll): string {
    const label = getLabel(roll);
    switch (roll.type) {
        case "action": {
            return `[[/act ${roll.slug}${roll.variant ? ` variant=${roll.variant}` : ""} dc=${roll.dc}${roll.statistic ? ` statistic=${roll.statistic}` : ""}]]${label ? `{${label}}` : ""}`;
        }
        case "check": {
            const adjustment = roll.adjustment ? `|adjustment:${roll.adjustment}` : "";
            const traits = roll.traits.length ? `|traits:${roll.traits}` : "";
            return `@Check[${roll.slug}|dc:${roll.dc}${adjustment}${traits}]${label ? `{${label}}` : ""}`;
        }
        default:
            return "";
    }
}

function getLabel(roll: RequestRoll): string | undefined {
    if (!roll.label?.includes("$")) return roll.label;

    switch (roll.type) {
        case "action":
            return roll.label
                .replaceAll("$a", actions.get(roll.slug) ?? "$a")
                .replaceAll("$s", allSkills.get(roll.statistic ?? "") ?? "$s");
        case "check":
            return roll.label.replaceAll("$s", allSkills.get(roll.slug ?? "") ?? "$s");
        default:
            return "";
    }
}

export { actionData, hasNoContent, prepareActionData, prepareSkillData, rollToInline, skillData };
