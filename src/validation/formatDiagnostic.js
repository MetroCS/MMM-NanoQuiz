export function formatDiagnostic(diagnostic) {
    const location = [
        diagnostic.source,
        diagnostic.itemIndex === null ? null : `item ${diagnostic.itemIndex + 1}`,
        diagnostic.field
    ].filter(Boolean).join(", ");
    const prefix = location ? `[${diagnostic.severity}] ${location}:` : `[${diagnostic.severity}]`;

    return `${prefix} ${diagnostic.message}`;
}
