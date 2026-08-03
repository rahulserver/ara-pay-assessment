/**
 * Global server constants, grouped by domain namespace.
 * Add new domains as the codebase grows — keep each group focused.
 */

export const Http = {
  /** Maximum allowed request body size for webhook event ingestion. */
  MAX_WEBHOOK_BODY_SIZE: "100kb"
} as const;
