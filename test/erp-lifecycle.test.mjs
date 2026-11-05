import test from "node:test";
import assert from "node:assert/strict";
import { SALES_ORDER_TRANSITIONS, PURCHASE_ORDER_TRANSITIONS, canTransitionDocument, assertDocumentTransition } from "../src/lib/erp/lifecycle.js";

test("sales orders follow the store lifecycle without skipping stages", () => {
  assert.equal(canTransitionDocument(SALES_ORDER_TRANSITIONS, "new", "confirmed"), true);
  assert.equal(canTransitionDocument(SALES_ORDER_TRANSITIONS, "confirmed", "preparing"), true);
  assert.equal(canTransitionDocument(SALES_ORDER_TRANSITIONS, "preparing", "shipped"), true);
  assert.equal(canTransitionDocument(SALES_ORDER_TRANSITIONS, "new", "shipped"), false);
  assert.equal(canTransitionDocument(SALES_ORDER_TRANSITIONS, "completed", "cancelled"), false);
});

test("purchase orders distinguish submission from physical receipt", () => {
  assert.equal(canTransitionDocument(PURCHASE_ORDER_TRANSITIONS, "draft", "submitted"), true);
  assert.equal(canTransitionDocument(PURCHASE_ORDER_TRANSITIONS, "submitted", "partially_received"), true);
  assert.equal(canTransitionDocument(PURCHASE_ORDER_TRANSITIONS, "partially_received", "received"), true);
  assert.equal(canTransitionDocument(PURCHASE_ORDER_TRANSITIONS, "draft", "received"), false);
  assert.equal(canTransitionDocument(PURCHASE_ORDER_TRANSITIONS, "received", "cancelled"), false);
});

test("invalid document transitions fail with a useful domain error", () => {
  assert.equal(assertDocumentTransition(SALES_ORDER_TRANSITIONS, "new", "confirmed"), "confirmed");
  assert.throws(() => assertDocumentTransition(SALES_ORDER_TRANSITIONS, "new", "completed"), /Invalid document transition/);
});