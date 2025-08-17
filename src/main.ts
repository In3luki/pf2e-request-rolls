import { getSetting, prepareActionData, prepareSkillData } from "@module/apps/helpers.ts";
import { GMDialog, RollDialog } from "@module/apps/index.ts";
import type { SocketRequest } from "@module/apps/types.ts";
import { htmlClosest } from "@util";
import * as R from "remeda";
import { refreshCSS, registerSettings } from "./settings/register-settings.ts";
import "./styles/global.scss";

globalThis.requestRolls = {
    GMDialog,
    RollDialog,
    settings: {
        alwaysAddName: false,
    },
};

Hooks.once("init", () => {
    registerSettings();
    requestRolls.settings.alwaysAddName = getSetting("pf2e-request-rolls", "gmDialog.alwaysAddName");

    CONFIG.TextEditor.enrichers.push({
        pattern: /@RequestRolls\[(?<data>\S+)\](?:\{(?<label>[^}]+)\})?/g,
        enricher,
    });

    refreshCSS();
});

Hooks.once("setup", () => {
    document.addEventListener("click", (event) => {
        const link = htmlClosest(event.target, "a.inline-check[data-rr-groups]");
        if (!link?.dataset.rrGroups) return;
        event.preventDefault();
        event.stopPropagation();
        GMDialog.fromString(link.dataset.rrGroups);
    });
});

Hooks.once("ready", () => {
    game.socket.on("module.pf2e-request-rolls", (request: SocketRequest, userId: string) => {
        const sender = game.users.get(userId, { strict: true });
        switch (request.type) {
            case "css-update": {
                if (game.user === sender) return;
                refreshCSS({ css: request.data });
                break;
            }
            case "roll-request": {
                if (!sender.isGM) return;
                if (request.users.includes(game.user.id)) {
                    new RollDialog({ request }).render({ force: true });
                }
            }
        }
    });
});

Hooks.once("pf2e.systemReady", () => {
    prepareActionData();
    prepareSkillData();
});

Hooks.on("getChatMessageContextOptions", (_chatlog, options) => {
    options.unshift({
        name: "PF2ERequestRolls.ContextMenuLabel",
        icon: '<i class="fa-solid fa-dice"></i>',
        condition: (element: HTMLElement) => {
            if (!game.user.isGM) return false;
            const message = game.messages.get(element.dataset.messageId, { strict: true });
            return !!fu.getProperty(message.flags, "pf2e-request-rolls.groups");
        },
        callback: (element: HTMLElement) => {
            const message = game.messages.get(element.dataset.messageId, { strict: true });
            GMDialog.fromMessage(message);
        },
    });
});

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        location.reload();
    });

    import.meta.hot.on("lang-update", async ({ path }: { path: string }): Promise<void> => {
        const lang = await fu.fetchJsonWithTimeout(path);
        if (!R.isPlainObject(lang)) {
            ui.notifications.error(`Failed to load ${path}`);
            return;
        }
        const apply = (): void => {
            fu.mergeObject(game.i18n.translations, lang);
            console.log(`hot updated: ${path}`);
            rerenderApps();
        };
        if (game.ready) {
            apply();
        } else {
            Hooks.once("ready", apply);
        }
    });
}

function rerenderApps(): void {
    const apps = [...Object.values(ui.windows), ...foundry.applications.instances.values(), ui.sidebar];
    for (const app of apps) {
        app.render();
    }
}

async function enricher(match: RegExpMatchArray): Promise<HTMLElement | null> {
    if (!match.groups?.data) return null;

    const anchor = document.createElement("a");
    anchor.classList.add("inline-check", "pf2e--request-rolls-inline-link");
    anchor.dataset.rrGroups = match.groups.data;
    anchor.dataset.visibility = "gm";
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-dice");
    anchor.appendChild(icon);
    const label = document.createElement("span");
    label.classList.add("label");
    label.innerHTML = match.groups?.label ? match.groups.label : game.i18n.localize("PF2ERequestRolls.GMDialog.Title");
    anchor.appendChild(label);

    return anchor;
}
