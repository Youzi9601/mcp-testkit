/**
 * Modern-era (2026-07-28) `subscriptions/listen` types.
 */

/**
 * Filter for the modern-era `subscriptions/listen` stream.
 */
export interface SubscriptionListenParams {
  /** Subscribe to `notifications/tools/list_changed`. */
  toolsListChanged?: boolean
  /** Subscribe to `notifications/prompts/list_changed`. */
  promptsListChanged?: boolean
  /** Subscribe to `notifications/resources/list_changed`. */
  resourcesListChanged?: boolean
  /** Subscribe to per-resource `notifications/resources/updated` for these URIs. */
  resourceSubscriptions?: string[]
}

/** Acknowledged subset of a subscription filter the server agreed to deliver. */
export interface HonoredSubscription {
  toolsListChanged?: boolean
  promptsListChanged?: boolean
  resourcesListChanged?: boolean
  resourceSubscriptions?: string[]
}

/**
 * A handle to an open `subscriptions/listen` stream (modern era, 2026-07-28).
 *
 * `honoredFilter` is the capability-gated subset of the requested filter the server
 * agreed to deliver. `close()` ends the stream; `closed` resolves once with the
 * reason (`'local'` | `'graceful'` | `'remote'`).
 *
 * Use `onNotification(handler)` to receive change notifications dispatched on this
 * stream. Each notification is a JSON-RPC notification object (`{ method, params }`).
 */
export interface McpSubscription {
  /** Capability-gated subset of the requested filter the server honored. */
  readonly honoredFilter: HonoredSubscription
  /**
   * Registers a handler for notifications arriving on this stream.
   * @param handler - Called with each notification (`{ method, params }`).
   */
  onNotification(handler: (notification: McpNotification) => void): void
  /** Closes the subscription stream. Resolves once the stream is ended. */
  close(): Promise<void>
  /** Resolves once with the close reason. Never rejects. */
  readonly closed: Promise<'local' | 'graceful' | 'remote'>
}

/**
 * A JSON-RPC notification delivered on a subscription stream.
 */
export interface McpNotification {
  /** Notification method (e.g. `'notifications/tools/list_changed'`). */
  method: string
  /** Notification parameters. */
  params?: Record<string, unknown>
}
