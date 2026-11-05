import test from "node:test";
import assert from "node:assert/strict";
import {
  applyStockMovement,
  calculateDocumentTotals,
  assertBalancedJournal
} from "../src/lib/erp/domain.js";

test("stock movements update quantity and reject negative stock", () => {
  assert.equal(applyStockMovement(8, -3), 5);
  assert.equal(applyStockMovement(8, 4), 12);
  assert.throws(() => applyStockMovement(2, -3), /negative balance/);
  assert.throws(() => applyStockMovement(2, 0), /non-zero/);
});

test("document totals use integer minor units", () => {
  const totals = calculateDocumentTotals(
    [
      { quantity: 2, unitPriceMinor: 125050 },
      { quantity: 1, unitPriceMinor: 49900 }
    ],
    { discountMinor: 5000, taxRateBps: 1400, shippingMinor: 2500 }
  );

  assert.deepEqual(totals, {
    subtotalMinor: 300000,
    discountMinor: 5000,
    taxableMinor: 295000,
    taxMinor: 41300,
    shippingMinor: 2500,
    totalMinor: 338800
  });
});

test("document totals reject invalid quantities and excessive discounts", () => {
  assert.throws(() => calculateDocumentTotals([{ quantity: 0, unitPriceMinor: 100 }]));
  assert.throws(() => calculateDocumentTotals([{ quantity: 1, unitPriceMinor: 100 }], { discountMinor: 101 }));
});

test("journal validation requires equal debit and credit totals", () => {
  assert.deepEqual(
    assertBalancedJournal([
      { debitMinor: 15000, creditMinor: 0 },
      { debitMinor: 0, creditMinor: 15000 }
    ]),
    { debitMinor: 15000, creditMinor: 15000, balanced: true }
  );
  assert.throws(
    () => assertBalancedJournal([
      { debitMinor: 15000, creditMinor: 0 },
      { debitMinor: 0, creditMinor: 14000 }
    ]),
    /not balanced/
  );
  assert.throws(
    () => assertBalancedJournal([{ debitMinor: 100, creditMinor: 100 }]),
    /either a debit or a credit/
  );
});
