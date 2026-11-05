import test from "node:test";
import assert from "node:assert/strict";
import {
  assertUniqueMovementKeys,
  calculateStockBalance,
  normalizeInventoryMovement
} from "../src/lib/erp/inventory-ledger.js";

const movement = (overrides = {}) => ({
  productId: "product-1",
  kind: "purchase_receipt",
  quantityDelta: 10,
  sourceType: "purchase_receipt",
  sourceId: "receipt-100",
  idempotencyKey: "receipt-100:line-1:product-1",
  reason: "استلام مشتريات",
  ...overrides
});

test("normalizes valid movements and trims descriptive fields", () => {
  const result = normalizeInventoryMovement(movement({ reason: "  استلام مشتريات  " }));
  assert.equal(result.reason, "استلام مشتريات");
  assert.equal(result.quantityDelta, 10);
  assert.equal(Object.isFrozen(result), true);
});

test("rejects zero, fractional, unsafe, and directionally invalid quantities", () => {
  for (const quantityDelta of [0, 1.5, Number.MAX_SAFE_INTEGER + 1, -2]) {
    assert.throws(() => normalizeInventoryMovement(movement({ quantityDelta })));
  }
  assert.throws(() => normalizeInventoryMovement(movement({
    kind: "sale_delivery",
    quantityDelta: 2
  })), /wrong direction/);
});

test("requires stable source identity and idempotency key", () => {
  assert.throws(() => normalizeInventoryMovement(movement({ sourceId: " " })));
  assert.throws(() => normalizeInventoryMovement(movement({ idempotencyKey: "" })));
});

test("rejects duplicate idempotency keys in one batch", () => {
  assert.throws(() => assertUniqueMovementKeys([
    movement(),
    movement({ sourceId: "receipt-101" })
  ]), /Duplicate/);
});

test("replays receipts, sales, returns, and adjustments to the expected balance", () => {
  const movements = [
    movement(),
    movement({
      kind: "sale_delivery",
      quantityDelta: -3,
      sourceType: "delivery",
      sourceId: "delivery-20",
      idempotencyKey: "delivery-20:line-1",
      reason: "تسليم بيع"
    }),
    movement({
      kind: "sales_return",
      quantityDelta: 1,
      sourceType: "sales_return",
      sourceId: "return-8",
      idempotencyKey: "return-8:line-1",
      reason: "مرتجع مبيعات"
    }),
    movement({
      kind: "adjustment_out",
      quantityDelta: -2,
      sourceType: "stock_adjustment",
      sourceId: "count-5",
      idempotencyKey: "count-5:line-1",
      reason: "تسوية جرد"
    })
  ];
  assert.equal(calculateStockBalance(0, movements), 6);
});

test("rejects any replay that would make stock negative", () => {
  assert.throws(() => calculateStockBalance(2, [
    movement({
      kind: "sale_delivery",
      quantityDelta: -3,
      sourceType: "delivery",
      sourceId: "delivery-21",
      idempotencyKey: "delivery-21:line-1",
      reason: "تسليم بيع"
    })
  ]), /negative balance/);
});

test("does not silently accept malformed movement batches", () => {
  assert.throws(() => assertUniqueMovementKeys([null]));
  assert.throws(() => calculateStockBalance(-1, []));
});
