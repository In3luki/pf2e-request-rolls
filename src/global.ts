/// <reference types="vite/client" />
/// <reference types="foundry-pf2e" />

import { GMDialog, RollDialog } from "@module/apps/index.ts";
import type { RequestGroup, RequestHistory } from "@module/apps/types.ts";

declare global {
    namespace globalThis {
        // eslint-disable-next-line no-var
        var requestRolls: RequestRollsGlobal;
    }

    interface ClientSettings {
        get(module: "pf2e-request-rolls", setting: "history"): RequestHistory[];
        get(module: "pf2e-request-rolls", setting: "gmDialog.autoClose"): boolean;
        get(module: "pf2e-request-rolls", setting: "showResultsDialog"): boolean;

        set(module: "pf2e-request-rolls", setting: "history", value: RequestGroup[]): Promise<RequestHistory[]>;
    }
}

interface RequestRollsGlobal {
    GMDialog: typeof GMDialog;
    RollDialog: typeof RollDialog;
}
