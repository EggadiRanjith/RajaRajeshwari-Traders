import React from 'react';
import {
  ShoppingBag,
  Truck,
  Plus,
  SlidersHorizontal,
  Wallet,
  Sheet,
  RotateCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { SheetStoreSettings } from '../types/index';

interface NavbarProps {
  settings: SheetStoreSettings | null;
  onOpenNewSale: () => void;
  onOpenNewPurchase: () => void;
  onOpenAddExpense: () => void;
  onOpenStockAdjustment: () => void;
  onRefreshData: () => void;
  onOpenCommandPalette: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenAddExpense,
  onOpenStockAdjustment,
  onRefreshData,
  onOpenCommandPalette,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 shadow-2xl shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand info */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25 font-black text-xl tracking-tighter">
              RT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-none">
                  RAJARAJESHWARI TRADERS
                </h1>
                <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Google Sheets Single Source</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden md:block mt-0.5">
                Retail Inventory, Sales & Moving Weighted Average Profit Management System
              </p>
            </div>
          </div>

          {/* Search bar & Quick Actions Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-all cursor-pointer shadow-inner"
              title="Open Command Palette (Cmd+K / Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Search / Cmd</span>
              <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-slate-950 border border-slate-700/80 rounded text-slate-400">
                ⌘K
              </kbd>
            </button>

            {/* Refresh button */}
            <button
              onClick={onRefreshData}
              disabled={isRefreshing}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 transition-all cursor-pointer disabled:opacity-50"
              title="Sync & Refresh from Google Sheets"
            >
              <RotateCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}
              />
            </button>

            {/* + Adjust Stock (Desktop) */}
            <button
              onClick={onOpenStockAdjustment}
              className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Stock Adjustment</span>
            </button>

            {/* + Add Expense */}
            <button
              onClick={onOpenAddExpense}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 transition-all cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>+ Expense</span>
            </button>

            {/* + New Purchase */}
            <button
              onClick={onOpenNewPurchase}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/20 transition-all cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-indigo-400" />
              <span>+ New Purchase</span>
            </button>

            {/* + New Sale (Primary Action) */}
            <button
              onClick={onOpenNewSale}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 fill-slate-950" />
              <span>+ NEW SALE</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
