/**
 * Type definitions matching the Google Apps Script API response schema exactly.
 * These types are the contract between frontend and backend.
 * DO NOT add fields that the backend does not return.
 */

/* ── Enum Types ── */

export type CustomerType = 'Walk-in' | 'Shopkeeper' | 'Hotel';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank';
export type StockStatus = 'HEALTHY' | 'LOW STOCK' | 'OUT OF STOCK';
export type WastageReason = 'Rot / Spoilage' | 'Transit Damage' | 'Moisture Weight Loss' | 'Grade Rejection' | 'Other';
export type SupplierStatus = 'active' | 'inactive';

export type ExpenseCategory =
  | 'Labour'
  | 'Transport'
  | 'Electricity'
  | 'Rent'
  | 'Cold Storage'
  | 'Packing Material'
  | 'Equipment Maintenance'
  | 'Miscellaneous';

/* ── Entity Types (GET responses) ── */

export interface Product {
  id: string;          // PRD-001
  name: string;        // White Onion
  category: string;    // Onion, Spice, Vegetable
  unit: string;        // KG
  reorderLevel: number;
  active: boolean;
}

export interface StockItem {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  openingStock: number;
  purchased: number;
  sold: number;
  wasted: number;
  adjusted: number;
  currentStock: number;
  avgCost: number;
  stockValue: number;
  reorderLevel: number;
  status: StockStatus;
}

export interface Supplier {
  id: string;          // SUP-001
  name: string;
  phone: string;
  location: string;
  category: string;    // Supply category
  status: SupplierStatus;
  totalPurchases: number;
  outstanding: number; // Always 0 — Zero-Credit Policy
}

export interface Purchase {
  id: string;          // P001 (Lot ID)
  date: string;        // YYYY-MM-DD
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;     // Total inward qty
  totalCost: number;
  rate: number;         // Unit cost = totalCost / quantity
  targetRate: number;
  remainingQty: number;
  payment: string;
  amountPaid: number;
  status: 'paid';
}

export interface Sale {
  id: string;          // S001 (Invoice ID)
  date: string;
  productId: string;
  productName: string;
  lotId: string;       // FK to Purchase lot
  supplierId: string;
  supplierName: string;
  quantity: number;     // Sold qty in KG
  rate: number;         // Actual selling rate
  targetRate: number;   // Target rate from lot
  revenue: number;
  cogs: number;
  grossProfit: number;
  customerType: CustomerType;
  buyer: string;
  payment: string;
  status: 'paid';
}

export interface WastageRecord {
  id: string;          // WST-001
  wastageId?: string;
  date: string;
  productId: string;
  productName: string;
  lotId: string;
  supplierId: string;
  quantity: number;
  wastedQty?: number;
  unitCost: number;
  lossAmount: number;
  reason: string;
  notes: string;
}

export interface Expense {
  id: string;          // EXP-001
  date: string;
  category: string;
  description: string;
  amount: number;
  paidBy: string;
  paidTo: string;
}

/* ── Analytics Types (GET responses) ── */

export interface PnLByProduct {
  productId: string;
  productName: string;
  qty: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  wastageLoss: number;
  netProfit: number;
  txnCount: number;
  marginPct: number;
}

export interface PnLBySeller {
  supplierId: string;
  supplierName: string;
  lotsCount: number;
  qtySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  wastageLoss: number;
  netProfit: number;
  txnCount: number;
  roiPct: number;
}

export interface CustomerTypeStats {
  [key: string]: {
    type: string;
    label: string;
    revenue: number;
    qty: number;
    count: number;
    products: Record<string, number>;
  };
}

export interface BuyerSummary {
  name: string;
  customerType: string;
  totalQty: number;
  totalRevenue: number;
  totalProfit: number;
  orderCount: number;
}

export interface ProductVelocity {
  productId: string;
  productName: string;
  currentStock: number;
  unit: string;
  soldToday: number;
  sold7Days: number;
  runRate: number;
  daysOfStock: number;
  velocityStatus: 'healthy' | 'low' | 'out' | 'fast-moving';
}

export interface DashboardData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  totalExpenses: number;
  totalWastageLoss: number;
  totalWastedQty: number;
  netProfit: number;
  realizedMargin: number;
  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: StockItem[];
  recentSales: Sale[];
  salesCount: number;
  period: string;
}

/* ── POST Payload Types ── */

export interface CreatePurchasePayload {
  supplierId: string;
  productId: string;
  totalQty: number;
  totalCost: number;
  targetRate: number;
  payment: PaymentMode;
  date?: string;
}

export interface CreateSalePayload {
  productId: string;
  lotId: string;
  quantity: number;
  rate: number;
  customerType: CustomerType;
  buyer: string;
  payment: PaymentMode;
  date?: string;
}

export interface CreateWastagePayload {
  productId: string;
  lotId: string;
  quantity: number;
  reason: string;
  notes?: string;
  date?: string;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  description: string;
  amount: number;
  paidBy?: PaymentMode;
  paidTo?: string;
  date?: string;
}

export interface CreateSupplierPayload {
  name: string;
  phone?: string;
  location?: string;
  category?: string;
}

export interface UpdateSupplierPayload {
  id: string;
  name?: string;
  phone?: string;
  location?: string;
  category?: string;
  status?: SupplierStatus;
}

/* ── API Response Wrapper ── */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/* ── POST Response Types ── */

export interface CreatePurchaseResponse {
  lotId: string;
  productName: string;
  supplierName: string;
  totalQty: number;
  totalCost: number;
  unitCost: number;
  targetRate: number;
  remainingQty: number;
  newCurrentStock: number;
  newAvgCost: number;
}

export interface CreateSaleResponse {
  invoiceId: string;
  productName: string;
  lotId: string;
  supplierName: string;
  quantity: number;
  sellingRate: number;
  targetRate: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  customerType: string;
  buyer: string;
  remainingLotStock: number;
  remainingProductStock: number;
}

export interface CreateWastageResponse {
  wastageId: string;
  productName: string;
  lotId: string;
  quantity: number;
  unitCost: number;
  lossAmount: number;
  reason: string;
  remainingLotStock: number;
  remainingProductStock: number;
}

export interface CreateExpenseResponse {
  expenseId: string;
  amount: number;
  category: string;
}

export interface CreateSupplierResponse {
  id: string;
  name: string;
}
