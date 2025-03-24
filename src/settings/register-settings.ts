function registerSettings(): void {
    const currentUserId = (game.data as unknown as { userId: string }).userId;

    game.settings.register("pf2e-request-rolls", "history", {
        name: "history",
        config: false,
        type: Array,
        default: [],
    });

    game.settings.register("pf2e-request-rolls", "gmDialog.autoClose", {
        name: "PF2ERequestRolls.Settings.GMDialog.AutoCloseName",
        hint: "PF2ERequestRolls.Settings.GMDialog.AutoCloseHint",
        config: game.data.users.some((u) => u._id === currentUserId && u.role === 4),
        scope: "client",
        type: Boolean,
        default: false,
    });

    game.settings.register("pf2e-request-rolls", "showResultsDialog", {
        name: "PF2ERequestRolls.Settings.ResultsDialog.ShowName",
        hint: "PF2ERequestRolls.Settings.ResultsDialog.ShowHint",
        config: game.data.users.some((u) => u._id === currentUserId && u.role === 4),
        scope: "client",
        type: Boolean,
        default: true,
    });

    game.settings.register("pf2e-request-rolls", "css.OuterContainer", {
        name: "PF2ERequestRolls.Settings.CSS.OuterContainerName",
        hint: "PF2ERequestRolls.Settings.CSS.OuterContainerHint",
        config: true,
        scope: "world",
        type: String,
        default: "",
        onChange: () => requestRolls.refreshCSS({ emit: true }),
    });

    game.settings.register("pf2e-request-rolls", "css.GroupContainer", {
        name: "PF2ERequestRolls.Settings.CSS.GroupContainerName",
        hint: "PF2ERequestRolls.Settings.CSS.GroupContainerHint",
        config: true,
        scope: "world",
        type: String,
        default: "",
        onChange: () => requestRolls.refreshCSS({ emit: true }),
    });

    game.settings.register("pf2e-request-rolls", "css.GroupHeader", {
        name: "PF2ERequestRolls.Settings.CSS.GroupHeaderName",
        hint: "PF2ERequestRolls.Settings.CSS.GroupHeaderHint",
        config: true,
        scope: "world",
        type: String,
        default: "",
        onChange: () => requestRolls.refreshCSS({ emit: true }),
    });

    game.settings.register("pf2e-request-rolls", "css.RollContainer", {
        name: "PF2ERequestRolls.Settings.CSS.RollContainerName",
        hint: "PF2ERequestRolls.Settings.CSS.RollContainerHint",
        config: true,
        scope: "world",
        type: String,
        default: "",
        onChange: () => requestRolls.refreshCSS({ emit: true }),
    });
}

export { registerSettings };
