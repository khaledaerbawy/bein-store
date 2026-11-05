export type SalesOrderStatus = "new" | "confirmed" | "preparing" | "shipped" | "completed" | "cancelled";
export type PurchaseOrderStatus = "draft" | "submitted" | "partially_received" | "received" | "cancelled";
export type DocumentTransitions = Readonly<Record<string, readonly string[]>>;

export const SALES_ORDER_TRANSITIONS: Readonly<Record<SalesOrderStatus, readonly SalesOrderStatus[]>>;
export const PURCHASE_ORDER_TRANSITIONS: Readonly<Record<PurchaseOrderStatus, readonly PurchaseOrderStatus[]>>;
export function canTransitionDocument(transitions: DocumentTransitions, currentStatus: string, nextStatus: string): boolean;
export function assertDocumentTransition(transitions: DocumentTransitions, currentStatus: string, nextStatus: string): string;