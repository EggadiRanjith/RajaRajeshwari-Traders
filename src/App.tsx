/**
 * RajaRajeshwari Traders — Main Application Shell
 *
 * Architecture:
 *   This React SPA talks directly to Google Apps Script REST API.
 *   No local database, no Express server, no mock data.
 *   Google Sheets is the single source of truth.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, type PageId } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { SalesPage } from './pages/SalesPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { StockPage } from './pages/StockPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

// Types and API
import type {
  Product,
  Supplier,
  Sale,
  Purchase,
  Expense,
  StockItem,
  WastageRecord,
  DashboardData,
} from './types/index';
import { api } from './services/api';
import { APP_CONFIG } from './config';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [currentFilter, setCurrentFilter] = useState('today');

  // Core Data State
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [wastage, setWastage] = useState<WastageRecord[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Toast helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // ── Data Loading ──
  const loadData = useCallback(async (filter = currentFilter, from?: string, to?: string) => {
    try {
      setIsRefreshing(true);
      setLoadError(null);

      const [dashRes, prodRes, stockRes, supRes, salesRes, purRes, expRes, wastRes] =
        await Promise.all([
          api.getDashboardData(filter, from, to),
          api.getProducts(),
          api.getStock(),
          api.getSuppliers(),
          api.getSales(filter, from, to),
          api.getPurchases(),
          api.getExpenses(filter, from, to),
          api.getWastage(filter, from, to),
        ]);

      setDashboardData(dashRes);
      setProducts(prodRes);
      setStockList(stockRes);
      setSuppliers(supRes);
      setSales(salesRes);
      setPurchases(purRes);
      setExpenses(expRes);
      setWastage(wastRes);
    } catch (err: any) {
      console.error('API Error:', err);
      const msg = err?.message || 'Failed to connect to Google Sheets';
      setLoadError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Post-Mutation Refresh Helpers ──
  const refreshAfterPurchase = async () => {
    const [stockRes, purRes, dashRes] = await Promise.all([
      api.getStock(),
      api.getPurchases(),
      api.getDashboardData(currentFilter),
    ]);
    setStockList(stockRes);
    setPurchases(purRes);
    setDashboardData(dashRes);
  };

  const refreshAfterSale = async () => {
    const [stockRes, salesRes, purRes, dashRes] = await Promise.all([
      api.getStock(),
      api.getSales(currentFilter),
      api.getPurchases(),
      api.getDashboardData(currentFilter),
    ]);
    setStockList(stockRes);
    setSales(salesRes);
    setPurchases(purRes);
    setDashboardData(dashRes);
  };

  const refreshAfterWastage = async () => {
    const [stockRes, wastRes, purRes, dashRes] = await Promise.all([
      api.getStock(),
      api.getWastage(currentFilter),
      api.getPurchases(),
      api.getDashboardData(currentFilter),
    ]);
    setStockList(stockRes);
    setWastage(wastRes);
    setPurchases(purRes);
    setDashboardData(dashRes);
  };

  const refreshAfterExpense = async () => {
    const [expRes, dashRes] = await Promise.all([
      api.getExpenses(currentFilter),
      api.getDashboardData(currentFilter),
    ]);
    setExpenses(expRes);
    setDashboardData(dashRes);
  };

  const refreshAfterSupplier = async () => {
    setSuppliers(await api.getSuppliers());
  };

  // ── Render ──
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 h-[4.5rem] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-emerald-950/50">
            R
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-100">{APP_CONFIG.businessName}</h1>
            <p className="text-[10px] text-slate-500 font-medium">{APP_CONFIG.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          )}
          <button
            onClick={() => loadData()}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
          >
            Refresh
          </button>
        </div>
      </nav>

      {/* Main Body */}
      <div className="flex-1 flex max-w-[1400px] w-full mx-auto">
        {/* Sidebar (Desktop) */}
        <Sidebar
          currentPage={currentPage}
          onSelectPage={(p) => setCurrentPage(p)}
          lowStockCount={dashboardData?.lowStockCount || 0}
        />

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-[calc(100vh-4.5rem)]">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono tracking-wider uppercase text-slate-400">
                Connecting to Google Sheets...
              </p>
            </div>
          ) : loadError && !dashboardData ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="w-12 h-12 text-rose-400" />
              <div>
                <p className="text-sm font-bold text-rose-300 mb-1">Connection Failed</p>
                <p className="text-xs text-slate-400 max-w-md">{loadError}</p>
              </div>
              <button
                onClick={() => { setIsLoading(true); loadData(); }}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <>
              {currentPage === 'dashboard' && (
                <DashboardPage
                  data={dashboardData}
                  stockList={stockList}
                  products={products}
                  suppliers={suppliers}
                  sales={sales}
                  purchases={purchases}
                  expenses={expenses}
                  wastage={wastage}
                  currentFilter={currentFilter}
                  onFilterChange={(f, s, e) => {
                    setCurrentFilter(f);
                    loadData(f, s, e);
                  }}
                  onNavigateToStock={() => setCurrentPage('stock')}
                  onNavigateToSales={() => setCurrentPage('sales')}
                />
              )}

              {currentPage === 'sales' && (
                <SalesPage
                  sales={sales}
                  products={products}
                  purchases={purchases}
                  stockList={stockList}
                  onSaleSuccess={async () => {
                    showToast('Sale recorded successfully');
                    await refreshAfterSale();
                  }}
                  showToast={showToast}
                />
              )}

              {currentPage === 'purchases' && (
                <PurchasesPage
                  purchases={purchases}
                  products={products}
                  suppliers={suppliers}
                  onPurchaseSuccess={async () => {
                    showToast('Purchase recorded successfully');
                    await refreshAfterPurchase();
                  }}
                  onOpenAddSupplier={() => setCurrentPage('suppliers')}
                  showToast={showToast}
                />
              )}

              {currentPage === 'stock' && (
                <StockPage
                  stockList={stockList}
                  products={products}
                />
              )}

              {currentPage === 'wastage' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-100">Wastage & Spoilage</h2>
                  </div>
                  <p className="text-sm text-slate-400">Wastage management page — coming in next phase.</p>
                </div>
              )}

              {currentPage === 'suppliers' && (
                <SuppliersPage
                  suppliers={suppliers}
                  onSupplierSuccess={async () => {
                    showToast('Supplier saved');
                    await refreshAfterSupplier();
                  }}
                  showToast={showToast}
                />
              )}

              {currentPage === 'expenses' && (
                <ExpensesPage
                  expenses={expenses}
                  onExpenseSuccess={async () => {
                    showToast('Expense recorded');
                    await refreshAfterExpense();
                  }}
                  showToast={showToast}
                />
              )}

              {currentPage === 'reports' && (
                <ReportsPage
                  currentFilter={currentFilter}
                />
              )}

              {currentPage === 'settings' && (
                <SettingsPage
                  onRefreshData={() => loadData()}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        currentPage={currentPage}
        onSelectPage={(p) => setCurrentPage(p)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-6 z-50 animate-[slideUp_0.3s_ease-out]">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-bold backdrop-blur-md max-w-sm ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
                : 'bg-rose-950/90 text-rose-200 border-rose-500/30'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
