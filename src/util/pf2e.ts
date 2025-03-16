import { DCAdjustment } from "@pf2e/types/index.ts";

const dcAdjustments = new Map<DCAdjustment, number>([
    ["incredibly-easy", -10],
    ["very-easy", -5],
    ["easy", -2],
    ["normal", 0],
    ["hard", 2],
    ["very-hard", 5],
    ["incredibly-hard", 10],
]);

function adjustDC(dc: number, adjustment: DCAdjustment = "normal"): number {
    return dc + (dcAdjustments.get(adjustment) ?? 0);
}

export { adjustDC, dcAdjustments };
