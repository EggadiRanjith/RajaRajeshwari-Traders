/**
 * Centralized API Client for Google Apps Script REST API.
 *
 * This is the ONLY module that talks to the backend.
 * All other modules import from here.
 *
 * Architecture:
 *   Browser → fetch() over HTTPS → Google Apps Script → Google Sheets
 *
 * Rules:
 * - Never hardcode the API URL (use API_BASE_URL from config)
 * - Never silently swallow errors
 * - Never cache stale data across mutations
 * - Never calculate business logic (COGS, profit, stock) — backend is authoritative
 */

import { API_BASE_URL } from '../config';
import type {
  ApiResponse,
  Product,
  StockItem,
  Supplier,
  Purchase,
  Sale,
  WastageRecord,
  Expense,
  DashboardData,
  PnLByProduct,
  PnLBySeller,
  CustomerTypeStats,
  BuyerSummary,
  ProductVelocity,
  CreatePurchasePayload,
  CreatePurchaseResponse,
  CreateSalePayload,
  CreateSaleResponse,
  CreateWastagePayload,
  CreateWastageResponse,
  CreateExpensePayload,
  CreateExpenseResponse,
  CreateSupplierPayload,
  CreateSupplierResponse,
  UpdateSupplierPayload,
} from '../types';

/* ══════════════════════════════════════════════════
   CORE FETCH HELPERS
   ══════════════════════════════════════════════════ */

class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * GET request to Apps Script.
 * Appends ?action=... and optional query params.
 */
async function apiGet<T>(action: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE_URL);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new ApiError(json.error || 'Unknown backend error');
  }
  return json.data as T;
}

/**
 * POST request to Apps Script.
 * Sends { action, payload } as JSON body.
 */
async function apiPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, payload }),
  });

  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}: ${res.statusText}`, res.status);
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) {
    throw new ApiError(json.error || 'Unknown backend error');
  }
  return json.data as T;
}

/* ══════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════ */

export const api = {
  /* ── Health Check ── */
  ping: () => apiGet<{ status: string; time: string; store: string; version: string }>('ping'),

  /* ── Products ── */
  getProducts: () => apiGet<Product[]>('getProducts'),

  /* ── Stock ── */
  getStock: () => apiGet<StockItem[]>('getStock'),

  /* ── Suppliers ── */
  getSuppliers: () => apiGet<Supplier[]>('getSuppliers'),

  /* ── Purchases (Lots) ── */
  getPurchases: () => apiGet<Purchase[]>('getPurchases'),

  getActiveLots: (productId: string) =>
    apiGet<Purchase[]>('getActiveLots', { productId }),

  /* ── Sales ── */
  getSales: (filter?: string, from?: string, to?: string) =>
    apiGet<Sale[]>('getSales', { filter: filter || '', from: from || '', to: to || '' }),

  /* ── Wastage ── */
  getWastage: (filter?: string, from?: string, to?: string) =>
    apiGet<WastageRecord[]>('getWastage', { filter: filter || '', from: from || '', to: to || '' }),

  /* ── Expenses ── */
  getExpenses: (filter?: string, from?: string, to?: string) =>
    apiGet<Expense[]>('getExpenses', { filter: filter || '', from: from || '', to: to || '' }),

  /* ── Dashboard ── */
  getDashboardData: (filter?: string, from?: string, to?: string) =>
    apiGet<DashboardData>('getDashboardData', { filter: filter || 'today', from: from || '', to: to || '' }),

  /* ── Analytics ── */
  getPnLByProduct: (filter?: string, from?: string, to?: string) =>
    apiGet<PnLByProduct[]>('getPnLByProduct', { filter: filter || '', from: from || '', to: to || '' }),

  getPnLBySeller: (filter?: string, from?: string, to?: string) =>
    apiGet<PnLBySeller[]>('getPnLBySeller', { filter: filter || '', from: from || '', to: to || '' }),

  getCustomerTypeStats: (filter?: string, from?: string, to?: string) =>
    apiGet<CustomerTypeStats>('getCustomerTypeStats', { filter: filter || '', from: from || '', to: to || '' }),

  getBuyerRevenueSummary: (filter?: string, from?: string, to?: string) =>
    apiGet<BuyerSummary[]>('getBuyerRevenueSummary', { filter: filter || '', from: from || '', to: to || '' }),

  getProductVelocity: () =>
    apiGet<ProductVelocity[]>('getProductVelocity'),

  /* ── Mutations (POST) ── */
  createPurchase: (payload: CreatePurchasePayload) =>
    apiPost<CreatePurchaseResponse>('createPurchase', payload as unknown as Record<string, unknown>),

  createSale: (payload: CreateSalePayload) =>
    apiPost<CreateSaleResponse>('createSale', payload as unknown as Record<string, unknown>),

  createWastage: (payload: CreateWastagePayload) =>
    apiPost<CreateWastageResponse>('createWastage', payload as unknown as Record<string, unknown>),

  createExpense: (payload: CreateExpensePayload) =>
    apiPost<CreateExpenseResponse>('createExpense', payload as unknown as Record<string, unknown>),

  createSupplier: (payload: CreateSupplierPayload) =>
    apiPost<CreateSupplierResponse>('createSupplier', payload as unknown as Record<string, unknown>),

  updateSupplier: (payload: UpdateSupplierPayload) =>
    apiPost<{ success: boolean; id: string }>('updateSupplier', payload as unknown as Record<string, unknown>),
};

/* ══════════════════════════════════════════════════
   FORMATTING UTILITIES
   ══════════════════════════════════════════════════ */

/** Format number as Indian Rupees: ₹1,23,456.00 */
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹0.00';
  return '₹' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Format as compact currency: ₹1.2L, ₹45.3K */
export function formatCurrencyCompact(amount: number): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹0';
  const n = Number(amount);
  if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1) + 'K';
  return formatCurrency(n);
}

/** Format KG quantity */
export function formatQty(qty: number): string {
  if (qty === undefined || qty === null || isNaN(Number(qty))) return '0 KG';
  return Number(qty).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + ' KG';
}

/** Format percentage */
export function formatPct(pct: number): string {
  if (pct === undefined || pct === null || isNaN(Number(pct))) return '0.0%';
  return Number(pct).toFixed(1) + '%';
}

/** Format date from YYYY-MM-DD to readable */
export function formatDate(iso: string): string {
  if (!iso) return '—';
  const parts = iso.split('-');
  if (parts.length < 3) return iso;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
}

/** Get today's date as YYYY-MM-DD */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
