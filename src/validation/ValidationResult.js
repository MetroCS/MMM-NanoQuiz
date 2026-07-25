import { DiagnosticSeverity } from "./Diagnostic.js";

export class ValidationResult {
    constructor({ items = [], diagnostics = [] }) {
        this.items = Object.freeze([...items]);
        this.diagnostics = Object.freeze([...diagnostics]);
        this.errors = Object.freeze(
            this.diagnostics.filter((diagnostic) =>
                diagnostic.severity === DiagnosticSeverity.ERROR
            )
        );
        this.warnings = Object.freeze(
            this.diagnostics.filter((diagnostic) =>
                diagnostic.severity === DiagnosticSeverity.WARNING
            )
        );
        this.isValid = this.errors.length === 0;

        Object.freeze(this);
    }
}
