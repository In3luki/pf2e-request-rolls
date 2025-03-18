interface BaseRoll {
    id: string;
    dc: number;
    label?: string;
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
    groups: RequestGroup[];
    id: string;
    time: number;
}

interface SocketRollRequest {
    groups: RequestGroup[];
    id: string;
    users: string[];
}

type LabeledValue = { label: string; value: string };
type RequestRoll = ActionRoll | CheckRoll;

export type { ActionRoll, CheckRoll, LabeledValue, RequestGroup, RequestHistory, RequestRoll, SocketRollRequest };
