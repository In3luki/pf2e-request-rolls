/// <reference types="vite/client" />

import { GMDialog, RollDialog } from "./module/apps/index.ts";

declare global {
    namespace globalThis {
        // eslint-disable-next-line no-var
        var requestRolls: RequestRollsGlobal;
    }
}

interface RequestRollsGlobal {
    GMDialog: typeof GMDialog;
    RollDialog: typeof RollDialog;
    settings: {
        alwaysAddName: boolean;
    };
}
