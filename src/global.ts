/// <reference types="vite/client" />
/// <reference types="foundry-pf2e" />

import { type RequestGroup, RequestHistory, RequestRolls } from "@module/apps/main/app.ts";

declare global {
    namespace globalThis {
        /* eslint-disable no-var */
        var PF2eRequestRolls: typeof RequestRolls;
        /* eslint-enable no-var */
    }

    interface ClientSettings {
        get(module: "pf2e-request-rolls", setting: "history"): RequestHistory[];
        set(module: "pf2e-request-rolls", setting: "history", value: RequestGroup[]): Promise<RequestHistory[]>;
    }
}
