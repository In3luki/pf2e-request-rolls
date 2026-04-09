import type { ContextMenuEntry } from "@client/applications/ux/context-menu.mjs";
import type { ChatLogPF2e } from "@module/apps/sidebar/chat-log.ts";
import type { HookCallback } from "@client/helpers/hooks.mjs";
import type { ChatMessagePF2e } from "@module/chat-message/document.ts";
import type { TokenPF2e } from "@module/canvas/index.ts";
import type { RequestHistory, RequestGroup } from "./module/apps/types.ts";

type HookMap = {
    controlToken: [token: TokenPF2e];
    createChatMessage: [message: ChatMessagePF2e];
    deleteChatMessage: [message: ChatMessagePF2e];
    getChatMessageContextOptions: [chatlog: ChatLogPF2e, options: ContextMenuEntry[]];
};

function HooksOn(
    hook: "controlToken",
    callback: (token: TokenPF2e) => boolean | void | Promise<boolean | void>,
): number;
function HooksOn(
    hook: "createChatMessage",
    callback: (message: ChatMessagePF2e) => boolean | void | Promise<boolean | void>,
): number;
function HooksOn(
    hook: "deleteChatMessage",
    callback: (message: ChatMessagePF2e) => boolean | void | Promise<boolean | void>,
): number;
function HooksOn(
    hook: "getChatMessageContextOptions",
    callback: (chatlog: ChatLogPF2e, options: ContextMenuEntry[]) => boolean | void | Promise<boolean | void>,
): number;
function HooksOn<K extends keyof HookMap>(
    hook: K,
    callback: (...args: HookMap[K]) => boolean | void | Promise<boolean | void>,
): number {
    return Hooks.on(hook, callback as HookCallback<unknown[]>);
}

const localize = (key: string): string => {
    return game.i18n.localize(`PF2ERequestRolls.${key}`);
};

function getSetting(name: "pf2e-request-rolls", setting: "history"): RequestHistory[];
function getSetting(name: "pf2e-request-rolls", setting: "playSoundInBackground"): boolean;
function getSetting(name: "pf2e-request-rolls", setting: "gmDialog.alwaysAddName"): boolean;
function getSetting(name: "pf2e-request-rolls", setting: "gmDialog.autoClose"): boolean;
function getSetting(name: "pf2e-request-rolls", setting: "showResultsDialog"): boolean;
function getSetting(name: "pf2e-request-rolls", setting: "css.GroupContainer"): string;
function getSetting(name: "pf2e-request-rolls", setting: "css.GroupHeader"): string;
function getSetting(name: "pf2e-request-rolls", setting: "css.OuterContainer"): string;
function getSetting(name: "pf2e-request-rolls", setting: "css.RollContainer"): string;
function getSetting(name: string, setting: string): unknown {
    return game.settings.get(name, setting);
}

async function setSetting(
    name: "pf2e-request-rolls",
    setting: "history",
    value: RequestGroup[],
): Promise<RequestHistory[]>;
async function setSetting(name: string, setting: string, value: unknown): Promise<unknown> {
    return game.settings.set(name, setting, value);
}

export { HooksOn, localize, getSetting, setSetting };
