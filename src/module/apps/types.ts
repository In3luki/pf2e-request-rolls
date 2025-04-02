import type { CssSettings } from "src/settings/data.svelte.ts";

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
    basic?: boolean;
    traits: string[];
    type: "check";
}

interface RequestGroup {
    rolls: (ActionRoll | CheckRoll)[];
    id: string;
    title: string;
}

interface MinifiedBaseRoll {
    /** id */
    i: string;
    /** dc */
    d: number;
    /** label */
    l?: string;
    /** slug */
    sl: string;
    /** type */
    t: string;
}

interface MinifiedActionRoll extends MinifiedBaseRoll {
    /** statistic */
    s?: string;
    /** type */
    t: "a";
    /** variant */
    v?: string;
}

interface MinifiedCheckRoll extends MinifiedBaseRoll {
    /** adjustment */
    a?: number;
    /** basic */
    b?: boolean;
    /** traits */
    tr?: string[];
    /** type */
    t: "c";
}

interface MinifiedRequestGroup {
    /** rolls */
    r: (MinifiedActionRoll | MinifiedCheckRoll)[];
    /** id */
    i: string;
    /** title */
    t?: string;
}

interface RequestHistory {
    groups: RequestGroup[];
    id: string;
    socketId?: string;
    time: number;
}

interface SocketRollRequest {
    groups: RequestGroup[];
    id: string;
    users: string[];
    type: "roll-request";
}

interface SocketCSSUpdate {
    data: CssSettings;
    type: "css-update";
}

type LabeledValue = { label: string; value: string };
type RequestRoll = ActionRoll | CheckRoll;
type SocketRequest = SocketCSSUpdate | SocketRollRequest;

export type {
    ActionRoll,
    CheckRoll,
    LabeledValue,
    MinifiedActionRoll,
    MinifiedCheckRoll,
    MinifiedRequestGroup,
    RequestGroup,
    RequestHistory,
    RequestRoll,
    SocketCSSUpdate,
    SocketRequest,
    SocketRollRequest,
};
