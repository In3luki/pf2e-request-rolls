import { prepareActionData, prepareSkillData } from "@module/apps/helpers.ts";
import { GMDialog, RollDialog } from "@module/apps/index.ts";
import type { SocketRollRequest } from "@module/apps/types.ts";
import * as R from "remeda";

globalThis.requestRolls = {
    GMDialog,
    RollDialog,
};

Hooks.once("init", () => {
    game.settings.register("pf2e-request-rolls", "history", {
        name: "history",
        config: false,
        type: Array,
        default: [],
    });
});

Hooks.once("ready", () => {
    game.socket.on("module.pf2e-request-rolls", (request: SocketRollRequest, userId: string) => {
        const sender = game.users.get(userId, { strict: true });
        if (!sender.isGM) return;
        new RollDialog({ request }).render({ force: true });
    });
});

Hooks.once("pf2e.systemReady", () => {
    prepareActionData();
    prepareSkillData();
});

Hooks.on("getChatLogEntryContext", (_chatlog, options) => {
    options.unshift({
        name: "PF2ERequestRolls.ContextMenuLabel",
        icon: '<i class="fa-solid fa-dice"></i>',
        condition: ($li: JQuery) => {
            if (!game.user.isGM) return false;
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
            return !!fu.getProperty(message.flags, "pf2e-request-rolls.groups");
        },
        callback: ($li) => {
            const message = game.messages.get($li[0].dataset.messageId, { strict: true });
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
