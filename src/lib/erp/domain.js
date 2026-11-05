/**
 * Small, framework-independent business rules for Bein Store.
 * Currency values are integer minor units (piastres for EGP), never floats.
 */

/** Apply a signed stock movement while preventing negative on-hand stock. */
export function applyStockMovement(currentQuantity, quantityDelta) {
  assertNonNegativeInteger(currentQuantity, "currentQuantity");
  if (!Number.isSafeInteger(quantityDelta) || quantityDelta === 0) {
    throw new RangeError("quantityDelta must be a non-zero safe integer");
  }

  const nextQuantity = currentQuantity + quantityDelta;
  if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 0) {
    throw new RangeError("Stock movement would create an invalid or negative balance");
  }
  return nextQuantity;
}

/**
 * Calculate document totals using integer minor currency units.
 * taxRateBps uses basis points: 1500 = 15%.
 */
export function calculateDocumentTotals(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new RangeError("A document must contain at least one item");
  }

  const discountMinor = options.discountMinor ?? 0;
  const shippingMinor = options.shippingMinor ?? 0;
  const taxRateBps = options.taxRateBps ?? 0;

  assertNonNegativeInteger(discountMinor, "discountMinor");
  assertNonNegativeInteger(shippingMinor, "shippingMinor");
  assertNonNegativeInteger(taxRateBps, "taxRateBps");

  const subtotalMinor = items.reduce((sum, item) => {
    assertPositiveInteger(item.quantity, "item.quantity");
    assertNonNegativeInteger(item.unitPriceMinor, "item.unitPriceMinor");
    const lineTotal = item.quantity * item.unitPriceMinor;
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(sum + lineTotal)) {
      throw new RangeError("Document amount exceeds safe integer precision");
    }
    return sum + lineTotal;
  }, 0);

  if (discountMinor > subtotalMinor) {
    throw new RangeError("Discount cannot exceed the items subtotal");
  }

  const taxableMinor = subtotalMinor - discountMinor;
  const taxNumerator = taxableMinor * taxRateBps;
  if (!Number.isSafeInteger(taxNumerator)) {
    throw new RangeError("Tax calculation exceeds safe integer precision");
  }
  // Round half up without adding 5,000 to a potentially near-limit integer.
  const taxMinor = Math.floor(taxNumerator / 10000) + (taxNumerator % 10000 >= 5000 ? 1 : 0);

  const totalMinor = taxableMinor + taxMinor + shippingMinor;
  if (!Number.isSafeInteger(totalMinor)) {
    throw new RangeError("Document total exceeds safe integer precision");
  }

  return {
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    shippingMinor,
    totalMinor
  };
}

/** Validate a double-entry journal using integer minor currency units. */
export function assertBalancedJournal(entries) {
  if (!Array.isArray(entries) || entries.length < 2) {
    throw new RangeError("A journal requires at least two entries");
  }

  let debitMinor = 0;
  let creditMinor = 0;

  for (const entry of entries) {
    assertNonNegativeInteger(entry.debitMinor, "entry.debitMinor");
    assertNonNegativeInteger(entry.creditMinor, "entry.creditMinor");
    if ((entry.debitMinor > 0) === (entry.creditMinor > 0)) {
      throw new RangeError("Each journal entry must contain either a debit or a credit");
    }
    debitMinor += entry.debitMinor;
    creditMinor += entry.creditMinor;
  }

  if (!Number.isSafeInteger(debitMinor) || !Number.isSafeInteger(creditMinor)) {
    throw new RangeError("Journal amount exceeds safe integer precision");
  }
  if (debitMinor !== creditMinor) {
    throw new RangeError("Journal is not balanced: total debits must equal total credits");
  }

  return { debitMinor, creditMinor, balanced: true };
}

function assertNonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function assertPositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${field} must be a positive safe integer`);
  }
}
