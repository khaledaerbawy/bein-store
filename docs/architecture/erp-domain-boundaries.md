# Bein Store ERP domain boundaries

This document defines the first application boundary for inventory, purchasing, sales, and accounting. It adopts concepts studied from ERPNext and modular TypeScript practices documented by Ever Gauzy; it does not copy either project's source code.

## Application modules

- **Catalog** — product identity, CCTV specifications, categories, brands, and public prices. It does not own stock balances or accounting values.
- **Inventory** — stock ledger, on-hand balance, reservations, receipts, issues, returns, transfers, and adjustments.
- **Purchasing** — suppliers, purchase orders, goods receipts, supplier invoices, and supplier payments.
- **Sales** — customer orders, fulfillment/delivery, sales invoices, returns, and customer receipts.
- **Accounting** — chart of accounts, journal entries, receivables, payables, cash/bank, inventory valuation, and cost of goods sold.
- **Shared domain** — money, document identity, audit metadata, validation, and typed result contracts.

## Non-negotiable invariants

1. A draft document has no stock or ledger effect.
2. A purchase order does not increase on-hand stock. A confirmed goods receipt does.
3. A customer order and a physical delivery are separate business events. The current public checkout reserves/deducts stock at order creation; do not change that behavior until a reservation model and migration are ready.
4. Every posted stock movement references its source document and is append-only. Corrections use reversing movements, never editing or deleting posted history.
5. A document posting is atomic: either its document status, stock ledger, balance, and journal entries all commit, or none do.
6. Concurrent checkout/receipt operations lock the relevant product balances so the same units cannot be sold or received twice.
7. Monetary calculations use integer piastres at the domain boundary. Persisted numeric(12,2) values are converted explicitly; do not use binary floating-point as the accounting source of truth.
8. Every posted journal is balanced (total debit equals total credit). Routine purchases, sales, and payments create journals through their source documents, not by manual balance edits.
9. Public catalog responses never expose purchase cost, margin, supplier terms, or internal journal data.
10. Existing orders and stock balances are not retroactively converted into accounting documents without a reviewed opening-balance and migration plan.

## TypeScript and code organization

Keep Next.js, TypeScript, and Supabase. Do not introduce Nx, NestJS, or a second ORM solely to imitate Gauzy. Keep domain functions framework-independent under src/lib/erp/; put database access and transactions in server-only repositories/actions; keep React pages as presentation and input orchestration. Share explicit input/output types, validate untrusted request data at boundaries, and test domain rules without a running Supabase instance.

## Posting sequence to implement later

- Purchase: purchase order -> goods receipt -> supplier invoice -> supplier payment.
- Sales: customer order -> fulfillment/delivery -> sales invoice -> customer receipt.
- Stock: receipt/issue/return/transfer/adjustment -> append-only movement -> derived balance.
- Accounting: source document approval -> balanced journal -> general ledger and subledger balances.

The existing checkout's stock behavior must remain unchanged until reservations, fulfillment, and idempotent database posting are implemented and regression-tested together.