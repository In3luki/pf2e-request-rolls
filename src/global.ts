/// <reference types="vite/client" />
/// <reference types="foundry-pf2e" />

import { GMDialog, RollDialog } from "@module/apps/index.ts";

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
