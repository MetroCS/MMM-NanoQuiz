export class PresentationStrategy {
    // Implementations build the type-specific DOM content for the current phase and item.
    buildContent(_document, _context) {
        throw new Error("PresentationStrategy implementations must build presentation content.");
    }
}
