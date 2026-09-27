import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Boxes,
  Users,
  Wallet,
  BarChart3,
  Settings as SettingsIcon,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

export type PageId =
  | 'dashboard'
  | 'sales'
  | 'purchases'
  | 'stock'
  | 'wastage'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  lowStockCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  lowStockCount = 0,
}) => {
  const navItems: { id: PageId; label: string; icon: any; badge?: number; shortcut?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'D' },
    { id: 'sales', label: 'Sales', icon: ShoppingBag, shortcut: 'S' },
    { id: 'purchases', label: 'Purchases', icon: Truck, shortcut: 'P' },
    {
      id: 'stock',
      label: 'Inventory',
      icon: Boxes,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
      shortcut: 'I',
    },
    { id: 'wastage', label: 'Wastage & Spoilage', icon: Trash2 },
    { id: 'suppliers', label: 'Suppliers', icon: Users },
    { id: 'expenses', label: 'Expenses', icon: Wallet },
    { id: 'reports', label: 'Reports & P&L', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex-shrink-0 flex flex-col justify-between hidden md:flex border-r border-slate-800/80 select-none min-h-[calc(100vh-4.5rem)]">
      <div className="p-4 space-y-6">
        {/* Navigation links */}
        <div className="space-y-1.5">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Store Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectPage(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/40'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Workbook Engine Status Card */}
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800/90 shadow-xl space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheets Core</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data store: <strong className="text-slate-200">RajaRajeshwari Traders</strong> workbook. Real-time moving weighted average COGS.
          </p>
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Method: Weighted Avg</span>
            <span className="text-emerald-400">Synced</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
        <span>RajaRajeshwari v2.5</span>
        <span className="text-slate-400 font-mono">APMC Mandi</span>
      </div>
    </aside>
  );
};
