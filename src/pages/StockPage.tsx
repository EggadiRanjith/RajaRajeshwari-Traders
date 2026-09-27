import React, { useState } from 'react';
import type { StockItem, Product } from '../types';
import { formatCurrency, formatQty } from '../services/api';
import { Boxes, Search, AlertTriangle, PackageX, TrendingUp } from 'lucide-react';

interface StockPageProps {
  stockList: StockItem[];
  products: Product[];
}

const statusColors: Record<string, { bg: string; text: string }> = {
  'HEALTHY':      { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  'LOW STOCK':    { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  'OUT OF STOCK': { bg: 'bg-rose-500/15', text: 'text-rose-400' },
};

export const StockPage: React.FC<StockPageProps> = ({ stockList }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');

  let filtered = stockList.filter(s =>
    s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (filter === 'low') filtered = filtered.filter(s => s.status === 'LOW STOCK');
  if (filter === 'out') filtered = filtered.filter(s => s.status === 'OUT OF STOCK');

  const totalValue = stockList.reduce((sum, s) => sum + s.stockValue, 0);
  const lowCount = stockList.filter(s => s.status === 'LOW STOCK').length;
  const outCount = stockList.filter(s => s.status === 'OUT OF STOCK').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Total stock value: {formatCurrency(totalValue)}</p>
        </div>
        <div className="flex gap-1 bg-slate-900 rounded-xl p-1 border border-slate-800">
          {[
            { id: 'all' as const, label: `All (${stockList.length})` },
            { id: 'low' as const, label: `Low (${lowCount})` },
            { id: 'out' as const, label: `Out (${outCount})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {/* Stock Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(item => {
          const sc = statusColors[item.status] || statusColors['HEALTHY'];
          const usedPct = item.purchased > 0 ? ((item.sold + item.wasted) / item.purchased * 100) : 0;
          return (
            <div key={item.productId} className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-slate-200">{item.productName}</p>
                  <p className="text-[10px] text-slate-500">{item.category} · {item.unit}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                  {item.status}
                </span>
              </div>

              <div className="text-2xl font-black tabular-nums text-slate-100 mb-1">
                {item.currentStock.toFixed(1)} <span className="text-sm text-slate-500 font-bold">KG</span>
              </div>

              {/* Stock Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  item.status === 'OUT OF STOCK' ? 'bg-rose-500' :
                  item.status === 'LOW STOCK' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} style={{ width: `${Math.min(100, (item.currentStock / Math.max(item.reorderLevel * 2, 1)) * 100)}%` }} />
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                <div className="text-slate-500">Avg Cost</div>
                <div className="text-right tabular-nums font-bold text-slate-300">{formatCurrency(item.avgCost)}/KG</div>
                <div className="text-slate-500">Stock Value</div>
                <div className="text-right tabular-nums font-bold text-emerald-400">{formatCurrency(item.stockValue)}</div>
                <div className="text-slate-500">Purchased</div>
                <div className="text-right tabular-nums text-slate-400">{item.purchased} KG</div>
                <div className="text-slate-500">Sold</div>
                <div className="text-right tabular-nums text-slate-400">{item.sold} KG</div>
                {item.wasted > 0 && (
                  <><div className="text-slate-500">Wasted</div><div className="text-right tabular-nums text-rose-400">{item.wasted} KG</div></>
                )}
                <div className="text-slate-500">Reorder Level</div>
                <div className="text-right tabular-nums text-slate-400">{item.reorderLevel} KG</div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Boxes className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-400">No stock items match your filter</p>
        </div>
      )}
    </div>
  );
};
