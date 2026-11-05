export type InventoryMovementKind =
  | "opening"
  | "purchase_receipt"
  | "sale_delivery"
  | "sales_return"
  | "purchase_return"
  | "adjustment_in"
  | "adjustment_out"
  | "transfer_in"
  | "transfer_out";

export type InventoryMovementInput = {
  productId: string;
  kind: InventoryMovementKind;
  quantityDelta: number;
  sourceType: string;
  sourceId: string;
  /** Stable across retries; must be unique in the persisted ledger. */
  idempotencyKey: string;
  reason: string;
  reference?: string | null;
};

export type NormalizedInventoryMovement = Readonly<
  Omit<InventoryMovementInput, "reference"> & { reference?: string }
>;

export const INVENTORY_MOVEMENT_KINDS: readonly InventoryMovementKind[];
export function normalizeInventoryMovement(
  input: InventoryMovementInput
): NormalizedInventoryMovement;
export function assertUniqueMovementKeys(
  movements: InventoryMovementInput[]
): true;
export function calculateStockBalance(
  openingQuantity: number,
  movements?: InventoryMovementInput[]
): number;
