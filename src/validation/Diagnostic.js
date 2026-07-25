export const DiagnosticSeverity = Object.freeze({
    ERROR: "error",
    WARNING: "warning"
});

export class Diagnostic {
    constructor({
        severity,
        code,
        message,
        source = null,
        itemIndex = null,
        field = null
    }) {
        this.severity = severity;
        this.code = code;
        this.message = message;
        this.source = source;
        this.itemIndex = itemIndex;
        this.field = field;

        Object.freeze(this);
    }
}
