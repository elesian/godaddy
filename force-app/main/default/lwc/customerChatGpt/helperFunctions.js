export function sanitizeResponse(input) {
    // Remove <br> tags
    const withoutBrTags = input.replace(/<br\s*\/?>/gi, '');

    return withoutBrTags;
}