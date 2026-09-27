import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  ShoppingBag,
  Truck,
  Wallet,
  SlidersHorizontal,
  Plus,
  Boxes,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  X,
  ArrowRight,
} from 'lucide-react';
import { PageId } from './Sidebar';
import { Product, Supplier } from '../types/index';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPage: (page: PageId) => void;
  onOpenNewSale: (productId?: string) => void;
  onOpenNewPurchase: (productId?: string) => void;
  onOpenAddExpense: () => void;
  onOpenStockAdjustment: (productId?: string) => void;
  onOpenAddProduct: () => void;
  onOpenAddSupplier: () => void;
  products: Product[];
  suppliers: Supplier[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectPage,
  onOpenNewSale,
  onOpenNewPurchase,
  onOpenAddExpense,
  onOpenStockAdjustment,
  onOpenAddProduct,
  onOpenAddSupplier,
  products,
  suppliers,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown handler for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or trigger
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    { id: 'new-sale', title: 'Record New Sale', category: 'Action', icon: ShoppingBag, shortcut: 'N', run: () => onOpenNewSale() },
    { id: 'new-purchase', title: 'Record New Purchase', category: 'Action', icon: Truck, shortcut: 'P', run: () => onOpenNewPurchase() },
    { id: 'add-expense', title: 'Add Operating Expense', category: 'Action', icon: Wallet, shortcut: 'E', run: () => onOpenAddExpense() },
    { id: 'stock-adj', title: 'Stock Adjustment (Spoilage/Audit)', category: 'Action', icon: SlidersHorizontal, shortcut: 'S', run: () => onOpenStockAdjustment() },
    { id: 'add-prod', title: 'Add New Product to Catalog', category: 'Action', icon: Plus, run: () => onOpenAddProduct() },
    { id: 'add-sup', title: 'Add New Mandi Supplier', category: 'Action', icon: Users, run: () => onOpenAddSupplier() },
    
    // Pages
    { id: 'p-dash', title: 'Go to Dashboard', category: 'Navigation', icon: BarChart3, run: () => onSelectPage('dashboard') },
    { id: 'p-sales', title: 'Go to Sales Ledger', category: 'Navigation', icon: ShoppingBag, run: () => onSelectPage('sales') },
    { id: 'p-pur', title: 'Go to Purchases', category: 'Navigation', icon: Truck, run: () => onSelectPage('purchases') },
    { id: 'p-stock', title: 'Go to Stock & Inventory', category: 'Navigation', icon: Boxes, run: () => onSelectPage('stock') },
    { id: 'p-sup', title: 'Go to Suppliers Directory', category: 'Navigation', icon: Users, run: () => onSelectPage('suppliers') },
    { id: 'p-exp', title: 'Go to Operating Expenses', category: 'Navigation', icon: Wallet, run: () => onSelectPage('expenses') },
    { id: 'p-rep', title: 'Go to P&L & Financial Reports', category: 'Navigation', icon: BarChart3, run: () => onSelectPage('reports') },
    { id: 'p-set', title: 'Go to Settings & Google Sheets Sync', category: 'Navigation', icon: SettingsIcon, run: () => onSelectPage('settings') },
  ];

  // Add Products
  const productActions = products.map((p) => ({
    id: `prod-${p.id}`,
    title: `Sell ${p.name} (${p.id})`,
    category: 'Commodity',
    icon: Boxes,
    run: () => onOpenNewSale(p.id),
  }));

  // Add Suppliers
  const supplierActions = suppliers.map((s) => ({
    id: `sup-${s.id}`,
    title: `Purchase from ${s.name}`,
    category: 'Supplier',
    icon: Truck,
    run: () => onOpenNewPurchase(),
  }));

  const allItems = [...actions, ...productActions, ...supplierActions];

  const filtered = allItems.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        onClose();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-start justify-center pt-20 sm:pt-28 p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all text-slate-200"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, commodity (Onion, Garlic), or page..."
            className="w-full bg-transparent border-0 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-hidden focus:ring-0 font-medium"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching commands or commodities found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 text-white border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
                      {item.category}
                    </span>
                    {(item as any).shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-400 rounded">
                        {(item as any).shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono text-slate-400">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono text-slate-400">↵</kbd> Select</span>
            <span><kbd className="font-mono text-slate-400">Esc</kbd> Close</span>
          </div>
          <span className="text-emerald-500/90 font-medium">RajaRajeshwari Terminal</span>
        </div>
      </div>
    </div>
  );
};
