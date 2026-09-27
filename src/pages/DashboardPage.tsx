import React from 'react';
import type { DashboardData, StockItem, Product, Supplier, Sale, Purchase, Expense, WastageRecord } from '../types';
import { formatCurrency, formatCurrencyCompact, formatQty, formatPct, formatDate } from '../services/api';
import {
  TrendingUp, TrendingDown, Package, ShoppingCart, Truck,
  AlertTriangle, DollarSign, BarChart3, ArrowUpRight, ArrowDownRight,
  Boxes, Trash2, Wallet
} from 'lucide-react';

interface DashboardPageProps {
  data: DashboardData | null;
  stockList: StockItem[];
  products: Product[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  wastage: WastageRecord[];
  currentFilter: string;
  onFilterChange: (filter: string, from?: string, to?: string) => void;
  onNavigateToStock: () => void;
  onNavigateToSales: () => void;
}

const filters = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: 'all', label: 'All Time' },
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  data, stockList, sales, currentFilter, onFilterChange,
  onNavigateToStock, onNavigateToSales,
}) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400 text-sm">No dashboard data available.</p>
      </div>
    );
  }

  const profitColor = data.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const profitBg = data.netProfit >= 0 ? 'from-emerald-500/10 to-emerald-500/5' : 'from-rose-500/10 to-rose-500/5';
  const profitBorder = data.netProfit >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Business overview and key metrics</p>
        </div>

        {/* Period Filter */}
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentFilter === f.id
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Revenue"
          value={formatCurrency(data.revenue)}
          icon={<DollarSign className="w-4 h-4" />}
          trend={data.revenue > 0 ? 'up' : 'neutral'}
          color="emerald"
          sub={`${data.salesCount} sales`}
        />
        <KPICard
          label="Gross Profit"
          value={formatCurrency(data.grossProfit)}
          icon={<TrendingUp className="w-4 h-4" />}
          trend={data.grossProfit >= 0 ? 'up' : 'down'}
          color="teal"
          sub={`Margin: ${formatPct(data.realizedMargin)}`}
        />
        <KPICard
          label="Expenses"
          value={formatCurrency(data.totalExpenses)}
          icon={<Wallet className="w-4 h-4" />}
          trend="neutral"
          color="amber"
          sub="Operating costs"
        />
        <KPICard
          label="Net Profit"
          value={formatCurrency(data.netProfit)}
          icon={data.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          trend={data.netProfit >= 0 ? 'up' : 'down'}
          color={data.netProfit >= 0 ? 'emerald' : 'rose'}
          sub={`After expenses & wastage`}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Stock Value"
          value={formatCurrencyCompact(data.stockValue)}
          icon={<Boxes className="w-4 h-4" />}
          trend="neutral"
          color="blue"
          sub={`${stockList.length} products tracked`}
        />
        <KPICard
          label="COGS"
          value={formatCurrency(data.cogs)}
          icon={<Truck className="w-4 h-4" />}
          trend="neutral"
          color="slate"
          sub="Cost of goods sold"
        />
        <KPICard
          label="Wastage Loss"
          value={formatCurrency(data.totalWastageLoss)}
          icon={<Trash2 className="w-4 h-4" />}
          trend={data.totalWastageLoss > 0 ? 'down' : 'neutral'}
          color={data.totalWastageLoss > 0 ? 'rose' : 'slate'}
          sub={data.totalWastedQty > 0 ? formatQty(data.totalWastedQty) + ' wasted' : 'No wastage'}
        />
        <KPICard
          label="Stock Alerts"
          value={`${data.lowStockCount + data.outOfStockCount}`}
          icon={<AlertTriangle className="w-4 h-4" />}
          trend={data.outOfStockCount > 0 ? 'down' : 'neutral'}
          color={data.outOfStockCount > 0 ? 'rose' : data.lowStockCount > 0 ? 'amber' : 'emerald'}
          sub={`${data.outOfStockCount} out, ${data.lowStockCount} low`}
          onClick={onNavigateToStock}
        />
      </div>

      {/* Stock Alerts & Recent Sales Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Low Stock Products */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200">Stock Alerts</h3>
            <button onClick={onNavigateToStock} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
              View All →
            </button>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">All products are stocked well.</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockProducts.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{item.productName}</p>
                    <p className="text-[10px] text-slate-500">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold tabular-nums">{formatQty(item.currentStock)}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      item.status === 'OUT OF STOCK'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200">Recent Sales</h3>
            <button onClick={onNavigateToSales} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
              View All →
            </button>
          </div>
          {data.recentSales.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center">No sales recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {data.recentSales.slice(0, 6).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50">
                  <div>
                    <p className="text-xs font-bold text-slate-200">{sale.productName}</p>
                    <p className="text-[10px] text-slate-500">{sale.buyer} · {sale.customerType} · {formatDate(sale.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400 tabular-nums">{formatCurrency(sale.revenue)}</p>
                    <p className="text-[10px] text-slate-500 tabular-nums">{formatQty(sale.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── KPI Card Component ── */

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  sub?: string;
  onClick?: () => void;
}

const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-500' },
  teal:    { bg: 'from-teal-500/10 to-teal-500/5', border: 'border-teal-500/20', text: 'text-teal-400', icon: 'text-teal-500' },
  amber:   { bg: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', text: 'text-amber-400', icon: 'text-amber-500' },
  rose:    { bg: 'from-rose-500/10 to-rose-500/5', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-500' },
  blue:    { bg: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-500' },
  slate:   { bg: 'from-slate-500/10 to-slate-500/5', border: 'border-slate-700/40', text: 'text-slate-300', icon: 'text-slate-500' },
};

const KPICard: React.FC<KPICardProps> = ({ label, value, icon, trend, color, sub, onClick }) => {
  const c = colorMap[color] || colorMap.slate;
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br ${c.bg} rounded-2xl border ${c.border} p-4 ${onClick ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={c.icon}>{icon}</div>
      </div>
      <p className={`text-lg sm:text-xl font-black tabular-nums ${c.text}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
};
