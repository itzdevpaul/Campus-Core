/**
 * Sanitizes user-submitted text for safe display in the DOM.
 *
 * This converts potentially dangerous characters (<, >, &, ", ') into their
 * HTML entity equivalents, preventing XSS attacks. Use this on ANY text
 * that comes from user input before rendering it with dangerouslySetInnerHTML
 * or inserting it into attribute values.
 *
 * For React, the default behavior already escapes text content — but this
 * function is still used when we need to store pre-sanitized text, or when
 * we're building HTML strings for rich rendering.
 */
export function sanitizeText(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Strips any HTML tags from user input, leaving only plain text.
 * Use this when you want to store or display user content as text only.
 */
export function stripHtml(input: string): string {
  if (typeof input !== "string") return "";
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Validates and sanitizes a username.
 * Allows alphanumeric characters, spaces, hyphens, and underscores.
 * Max length 50 characters.
 */
export function sanitizeUsername(input: string): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[^\w\s-]/g, "")
    .trim()
    .substring(0, 50);
}

/**
 * Validates an invite code format (8 uppercase alphanumeric characters).
 */
export function isValidInviteCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code);
}
