/**
 * Pure inventory-ledger invariants.
 *
 * This module deliberately does not read or write Supabase. Persistence is
 * handled by database functions and the append-only migration in this branch.
 */

export const INVENTORY_MOVEMENT_KINDS = Object.freeze([
  "opening",
  "purchase_receipt",
  "sale_delivery",
  "sales_return",
  "purchase_return",
  "adjustment_in",
  "adjustment_out",
  "transfer_in",
  "transfer_out"
]);

const EXPECTED_SIGN = Object.freeze({
  opening: 1,
  purchase_receipt: 1,
  sale_delivery: -1,
  sales_return: 1,
  purchase_return: -1,
  adjustment_in: 1,
  adjustment_out: -1,
  transfer_in: 1,
  transfer_out: -1
});

function requiredText(value, field, maxLength = 160) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new RangeError(`${field} must contain 1-${maxLength} characters`);
  }
  return normalized;
}

/**
 * Validate and normalize a stock movement before it reaches persistence.
 * The idempotency key must be stable across retries of the same source event.
 */
export function normalizeInventoryMovement(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("movement must be an object");
  }

  const kind = requiredText(input.kind, "kind", 40);
  if (!INVENTORY_MOVEMENT_KINDS.includes(kind)) {
    throw new RangeError("Unsupported inventory movement kind");
  }

  const quantityDelta = input.quantityDelta;
  if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0) {
    throw new RangeError("quantityDelta must be a non-zero safe integer");
  }
  if (Math.sign(quantityDelta) !== EXPECTED_SIGN[kind]) {
    throw new RangeError(`quantityDelta has the wrong direction for ${kind}`);
  }

  const movement = {
    productId: requiredText(input.productId, "productId", 80),
    kind,
    quantityDelta,
    sourceType: requiredText(input.sourceType, "sourceType", 40),
    sourceId: requiredText(input.sourceId, "sourceId", 120),
    idempotencyKey: requiredText(input.idempotencyKey, "idempotencyKey", 160),
    reason: requiredText(input.reason, "reason", 240)
  };

  if (input.reference != null) {
    movement.reference = requiredText(input.reference, "reference", 160);
  }

  return Object.freeze(movement);
}

/** Reject duplicate event keys in a batch before attempting persistence. */
export function assertUniqueMovementKeys(movements) {
  if (!Array.isArray(movements)) {
    throw new TypeError("movements must be an array");
  }

  const seen = new Set();
  for (const raw of movements) {
    const movement = normalizeInventoryMovement(raw);
    if (seen.has(movement.idempotencyKey)) {
      throw new RangeError("Duplicate inventory movement idempotency key");
    }
    seen.add(movement.idempotencyKey);
  }
  return true;
}

/**
 * Replay signed movements in order. This is useful for reconciliation tests;
 * it is not a substitute for locking and atomic balance updates in PostgreSQL.
 */
export function calculateStockBalance(openingQuantity, movements = []) {
  if (!Number.isSafeInteger(openingQuantity) || openingQuantity < 0) {
    throw new RangeError("openingQuantity must be a non-negative safe integer");
  }
  if (!Array.isArray(movements)) {
    throw new TypeError("movements must be an array");
  }

  let balance = openingQuantity;
  for (const raw of movements) {
    const movement = normalizeInventoryMovement(raw);
    const nextBalance = balance + movement.quantityDelta;
    if (!Number.isSafeInteger(nextBalance) || nextBalance < 0) {
      throw new RangeError("Inventory movement would create an invalid or negative balance");
    }
    balance = nextBalance;
  }
  return balance;
}
