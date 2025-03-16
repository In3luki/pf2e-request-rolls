/**
 * Check if a key is present in a given object in a type safe way
 *
 * @param obj The object to check
 * @param key The key to check
 */
function objectHasKey<O extends object>(obj: O, key: unknown): key is keyof O {
    return (typeof key === "string" || typeof key === "number") && key in obj;
}

/** Check if a value is present in the provided array. Especially useful for checking against literal tuples */
function tupleHasValue<const A extends readonly unknown[]>(array: A, value: unknown): value is A[number] {
    return array.includes(value);
}

/** Check if an element is present in the provided set. Especially useful for checking against literal sets */
function setHasElement<T extends Set<unknown>>(set: T, value: unknown): value is SetElement<T> {
    return set.has(value);
}

const localize = (key: string): string => {
    return game.i18n.localize(`PF2ERequestRolls.${key}`);
};

/** Localize the values of a `Record<string, string>` and sort by those values */
function sortStringRecord<T extends Record<string, string>>(record: T): T;
function sortStringRecord(record: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(record)
            .map((entry) => {
                entry[1] = game.i18n.localize(entry[1]);
                return entry;
            })
            .sort((a, b) => a[1].localeCompare(b[1], game.i18n.lang)),
    );
}

let intlNumberFormat: Intl.NumberFormat;
/**
 * Return an integer string of a number, always with sign (+/-)
 * @param value The number to convert to a string
 * @param options.emptyStringZero If the value is zero, return an empty string
 * @param options.zeroIsNegative Treat zero as a negative value
 */
function signedInteger(value: number, { emptyStringZero = false, zeroIsNegative = false } = {}): string {
    if (value === 0 && emptyStringZero) return "";
    const nf = (intlNumberFormat ??= new Intl.NumberFormat(game.i18n.lang, {
        maximumFractionDigits: 0,
        signDisplay: "always",
    }));
    const maybeNegativeZero = zeroIsNegative && value === 0 ? -0 : value;

    return nf.format(maybeNegativeZero);
}

export { localize, objectHasKey, setHasElement, signedInteger, sortStringRecord, tupleHasValue };
