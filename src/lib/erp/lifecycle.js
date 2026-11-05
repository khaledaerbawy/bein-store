/**
 * Framework-independent document lifecycle rules for Bein Store.
 * Database procedures must enforce these transitions atomically before UI integration.
 */

export const SALES_ORDER_TRANSITIONS = Object.freeze({
  new: Object.freeze(["confirmed", "cancelled"]),
  confirmed: Object.freeze(["preparing", "cancelled"]),
  preparing: Object.freeze(["shipped", "cancelled"]),
  shipped: Object.freeze(["completed"]),
  completed: Object.freeze([]),
  cancelled: Object.freeze([])
});

export const PURCHASE_ORDER_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["submitted", "cancelled"]),
  submitted: Object.freeze(["partially_received", "received", "cancelled"]),
  partially_received: Object.freeze(["partially_received", "received", "cancelled"]),
  received: Object.freeze([]),
  cancelled: Object.freeze([])
});

export function canTransitionDocument(transitions, currentStatus, nextStatus) {
  const allowed = transitions?.[currentStatus];
  return Array.isArray(allowed) && allowed.includes(nextStatus);
}

export function assertDocumentTransition(transitions, currentStatus, nextStatus) {
  if (!canTransitionDocument(transitions, currentStatus, nextStatus)) {
    throw new RangeError(`Invalid document transition: ${String(currentStatus)} -> ${String(nextStatus)}`);
  }
  return nextStatus;
}