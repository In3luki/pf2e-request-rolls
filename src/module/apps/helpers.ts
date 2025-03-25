import type { Action, ActionVariant } from "@pf2e/types/index.ts";
import { sortStringRecord } from "@util/misc.ts";
import * as R from "remeda";
import { ActionRenderData, GMDialogContext } from "./gm-dialog/gm-dialog.ts";
import type {
    ActionRoll,
    CheckRoll,
    MinifiedActionRoll,
    MinifiedCheckRoll,
    MinifiedRequestGroup,
    RequestGroup,
    RequestRoll,
} from "./types.ts";

const actions = new Map<string, string>();
const allSkills = new Map<string, string>();
const actionData: ActionRenderData[] = [];
const skillData: GMDialogContext["skills"] = {
    skills: [],
    lores: [],
    saves: [],
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

function rollToInline(roll: RequestRoll, requestId?: string): string {
    const label = getLabel(roll);
    switch (roll.type) {
        case "action": {
            const parts: string[] = ["[[/act", roll.slug, `dc=${roll.dc}`];
            if (roll.variant) parts.push(`variant=${roll.variant}`);
            if (roll.statistic) parts.push(`statistic=${roll.statistic}`);
            const options: string[] = [`request-rolls-roll-id:${roll.id}`];
            if (requestId) options.push(`request-rolls-id:${requestId}`);

            return `${parts.join(" ")} options=${options}]]${label ? `{${label}}` : ""}`;
        }
        case "check": {
            const parts: string[] = ["@Check[", roll.slug, `|dc:${roll.dc}`];
            if (roll.adjustment) parts.push(`|adjustment:${roll.adjustment}`);
            if (roll.traits.length) parts.push(`|traits:${roll.traits}`);
            const options: string[] = [`request-rolls-roll-id:${roll.id}`];
            if (requestId) options.push(`request-rolls-id:${requestId}`);
            parts.push(`|options:${options}]`);
            if (label) parts.push(`{${label}}`);

            return parts.join("");
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

async function compressToBase64(groups: RequestGroup[]): Promise<string> {
    const minified: MinifiedRequestGroup[] = [];
    for (const group of groups) {
        const mGroup: MinifiedRequestGroup = {
            i: group.id,
            r: [],
            ...(group.title ? { t: group.title } : {}),
        };
        for (const roll of group.rolls) {
            if (roll.type === "action") {
                const mRoll: MinifiedActionRoll = {
                    i: roll.id,
                    d: roll.dc,
                    sl: roll.slug,
                    t: "a",
                    ...(roll.label ? { l: roll.label } : {}),
                    ...(roll.statistic ? { s: roll.statistic } : {}),
                    ...(roll.variant ? { v: roll.variant } : {}),
                };
                mGroup.r.push(mRoll);
            } else if (roll.type === "check") {
                const mRoll: MinifiedCheckRoll = {
                    i: roll.id,
                    d: roll.dc,
                    sl: roll.slug,
                    t: "c",
                    ...(roll.label ? { l: roll.label } : {}),
                    ...(roll.adjustment ? { a: roll.adjustment } : {}),
                    ...(roll.traits ? { tr: roll.traits } : {}),
                };
                mGroup.r.push(mRoll);
            }
        }
        minified.push(mGroup);
    }

    const byteArray = new TextEncoder().encode(JSON.stringify(minified));
    const cs = new CompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    const result = await new Response(cs.readable).arrayBuffer();

    return bufferToBase64(result);
}

async function decompressFromBase64(string: string): Promise<RequestGroup[]> {
    const byteArray = await base64ToUnit8Array(string);
    const cs = new DecompressionStream("gzip");
    const writer = cs.writable.getWriter();
    writer.write(byteArray);
    writer.close();
    const result = await new Response(cs.readable).arrayBuffer();
    const mGroups: MinifiedRequestGroup[] = JSON.parse(new TextDecoder().decode(result));

    const groups: RequestGroup[] = [];
    for (const group of mGroups) {
        const g: RequestGroup = {
            id: group.i,
            rolls: [],
            title: group.t ?? "",
        };
        for (const roll of group.r) {
            if (roll.t === "a") {
                const r: ActionRoll = {
                    id: roll.i,
                    dc: roll.d,
                    label: roll.l ?? "",
                    type: "action",
                    slug: roll.sl,
                    statistic: roll.s,
                    variant: roll.v,
                };
                g.rolls.push(r);
            } else if (roll.t === "c") {
                const r: CheckRoll = {
                    id: roll.i,
                    dc: roll.d,
                    label: roll.l ?? "",
                    traits: roll.tr ?? [],
                    type: "check",
                    slug: roll.sl,
                    adjustment: roll.a,
                };
                g.rolls.push(r);
            }
        }
        groups.push(g);
    }

    return groups;
}

async function base64ToUnit8Array(base64: string): Promise<Uint8Array> {
    const dataUrl = "data:application/octet-binary;base64," + base64;
    const res = await fetch(dataUrl);
    const buffer = await res.arrayBuffer();
    return new Uint8Array(buffer);
}

async function bufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const blob = new Blob([buffer], { type: "application/octet-binary" });
    const fileReader = new FileReader();
    const { promise, resolve, reject } = Promise.withResolvers<string>();
    fileReader.onload = () => {
        const dataUrl = fileReader.result;
        if (typeof dataUrl === "string") {
            resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
        }
        reject("Failed to convert ArraBuffer to base64 string!");
    };
    fileReader.onerror = () => {
        reject("Error while converting the buffer to a base64 string!");
    };
    fileReader.readAsDataURL(blob);
    return promise;
}

export {
    actionData,
    compressToBase64,
    decompressFromBase64,
    hasNoContent,
    prepareActionData,
    prepareSkillData,
    rollToInline,
    skillData,
};
