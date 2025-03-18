import type { RequestGroup, RequestRoll } from "./types.ts";

function hasNoContent(groups: RequestGroup[]): boolean {
    return !groups.some((g) => g.rolls.length > 0);
}

function rollToInline(roll: RequestRoll): string {
    switch (roll.type) {
        case "action": {
            const label = roll.label ? `{${roll.label}}` : "";
            return `[[/act ${roll.slug}${roll.variant ? ` variant=${roll.variant}` : ""} dc=${roll.dc}${roll.statistic ? ` statistic=${roll.statistic}` : ""}]]${label}`;
        }
        case "check": {
            const adjustment = roll.adjustment ? `|adjustment:${roll.adjustment}` : "";
            const label = roll.label ? `{${roll.label}}` : "";
            const traits = roll.traits.length ? `|traits:${roll.traits}` : "";
            return `@Check[${roll.slug}|dc:${roll.dc}${adjustment}${traits}]${label}`;
        }
        default:
            return "";
    }
}

export { hasNoContent, rollToInline };
