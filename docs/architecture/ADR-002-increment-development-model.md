# ADR-002: Increment Development Model

- **Status:** Accepted
- **Date:** 2026-07-25

## Context

The project needs a development process that preserves architectural intent while producing steady, working contributions. A feature-first process can allow documentation and tests to trail implementation, making design intent difficult to recover and increasing the cost of later correction.

The project also does not define progress primarily as reaching a minimal viable product. Progress is demonstrated through coherent contributions that are executable, tested, understandable, and verified.

## Decision

Each substantive project increment will follow this flow:

> Intent -> Documentation -> Tests -> Implementation -> Verification

The stages mean:

1. **Intent:** state the objective, responsibility, and boundaries of the contribution.
2. **Documentation:** record the intended behavior or architectural contract at the level needed to guide development.
3. **Tests:** express externally observable behavior as executable specifications.
4. **Implementation:** add the smallest coherent implementation that satisfies the documented behavior.
5. **Verification:** run the complete quality and test suite and confirm that the documentation still matches the resulting system.

Documentation may precede implementation when it clarifies requirements or architectural boundaries. It may also be refined during implementation when discovery changes understanding. An increment is not complete until its documents, tests, and implementation agree.

Documentation must remain purposeful. A new document is warranted only when it preserves information that is valuable, distinct, and otherwise difficult to recover. Existing documents should be extended instead of creating overlapping documents.

## Alternatives Considered

### Implement first, document afterward

This can produce code quickly, but it risks allowing implementation choices to become accidental requirements. It was rejected as the default process.

### Treat tests as the complete specification

Tests are essential executable specifications, but they do not adequately preserve rationale, responsibility boundaries, or rejected alternatives. This was rejected as insufficient by itself.

### Complete all architecture documentation before implementation

This could produce extensive documentation based on assumptions that have not yet been tested through working code. It was rejected in favor of incremental documentation developed with each executable contribution.

## Consequences

### Benefits

- Intended behavior is explicit before it becomes embedded in code.
- Tests describe behavior rather than internal implementation.
- Each version provides a working and understandable contribution.
- Documentation and implementation are less likely to diverge.
- Architectural decisions remain reviewable over time.

### Costs

- Small contributions require deliberate documentation and test design.
- Some documents will need revision when implementation reveals new information.
- Contributors must distinguish valuable documentation from duplication or ceremony.

## Related

- [`VISION.md`](../../VISION.md)
- [ADR-001: Project Identity](ADR-001-project-identity.md)
- [Development Notebook](../notebook/README.md)
