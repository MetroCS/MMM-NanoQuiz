export function cloneRawValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => cloneRawValue(item));
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, entryValue]) => [key, cloneRawValue(entryValue)])
        );
    }

    return value;
}
