/**
 * Global server constants, grouped by domain namespace.
 * Add new domains as the codebase grows — keep each group focused.
 */

export const Http = {
  /** Maximum allowed request body size. Applies to all JSON endpoints. */
  MAX_REQUEST_BODY_SIZE: "100kb",
} as const;

export const Pipeline = {
  /** Default number of events to return in list queries. */
  DEFAULT_EVENT_LIMIT: 30,
  /** Default number of notifications to return in list queries. */
  DEFAULT_NOTIFICATION_LIMIT: 50,
} as const;
