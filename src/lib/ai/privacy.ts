/**
 * PII Sanitization for AI calls
 * Ensures no student names, register numbers, emails, phone numbers, or individual marks
 * are transmitted to external AI providers.
 */

export function sanitizePromptForAi(text: string): string {
  if (!text) return '';

  // 1. Redact email addresses
  let sanitized = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

  // 2. Redact 10-digit phone numbers (starting with 6-9)
  sanitized = sanitized.replace(/\b[6-9]\d{9}\b/g, '[REDACTED_PHONE]');

  // 3. Redact register numbers (e.g. 714024243219, 8-14 digits)
  sanitized = sanitized.replace(/\b\d{8,14}\b/g, '[REDACTED_REGNO]');

  return sanitized;
}

export function assertNoPii(text: string): void {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /\b[6-9]\d{9}\b/;
  const regNoRegex = /\b\d{10,14}\b/;

  if (emailRegex.test(text) || phoneRegex.test(text) || regNoRegex.test(text)) {
    throw new Error('PII Violation: Prompt contains personal identifiers (email, phone, or register number).');
  }
}
