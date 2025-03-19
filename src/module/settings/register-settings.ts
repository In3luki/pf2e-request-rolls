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
}

export { registerSettings };
