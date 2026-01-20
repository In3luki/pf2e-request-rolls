import { actionData } from "../helpers.ts";
import type { RequestGroup, RequestRoll } from "../types.ts";

/** The GM Dialog svelte state */
const rollRequestState: { groups: RequestGroup[] } = $state({ groups: [] });

function getNewGroupData(): RequestGroup {
    return {
        id: fu.randomID(),
        rolls: [],
        title: "",
    };
}

function getNewRollData(type: RequestRoll["type"]): RequestRoll {
    switch (type) {
        case "action":
            return {
                dc: 10,
                id: fu.randomID(),
                slug: actionData[0].slug,
                statistic: actionData[0].statistic,
                variant: actionData[0].variants.at(0)?.slug,
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
        case "counteract":
            return {
                dc: 10,
                id: fu.randomID(),
                label: game.i18n.localize("PF2ERequestRolls.GMDialog.Counteract.Label"),
                slug: "arcana",
                sourceRank: 0,
                targetRank: 0,
                type: "counteract",
            };
        default:
            throw Error(`Unknown type ${type}`);
    }
}

function getRequestGroupsSnapshot(): RequestGroup[] {
    return $state.snapshot(rollRequestState.groups);
}

function updateGMDialogState(data?: RequestGroup[]): void {
    rollRequestState.groups = data ?? [getNewGroupData()];
}

export { getNewGroupData, getNewRollData, getRequestGroupsSnapshot, rollRequestState, updateGMDialogState };
