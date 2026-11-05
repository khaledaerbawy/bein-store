export type StockMovementKind =
  | "opening"
  | "purchase_receipt"
  | "sale_delivery"
  | "sales_return"
  | "purchase_return"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out";

export type JournalEntry = {
  accountCode: string;
  debitMinor: number;
  creditMinor: number;
  memo?: string;
};

export type DocumentLineInput = {
  quantity: number;
  unitPriceMinor: number;
};

export type DocumentTotalsOptions = {
  discountMinor?: number;
  shippingMinor?: number;
  /** Basis points: 1500 means 15%. */
  taxRateBps?: number;
};

export type DocumentTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxableMinor: number;
  taxMinor: number;
  shippingMinor: number;
  totalMinor: number;
};

export function applyStockMovement(currentQuantity: number, quantityDelta: number): number;
export function calculateDocumentTotals(
  items: DocumentLineInput[],
  options?: DocumentTotalsOptions
): DocumentTotals;
export function assertBalancedJournal(
  entries: Pick<JournalEntry, "debitMinor" | "creditMinor">[]
): { debitMinor: number; creditMinor: number; balanced: true };
