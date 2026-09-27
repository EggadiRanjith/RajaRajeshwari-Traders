import React, { useState, useEffect } from 'react';
import type { PnLByProduct, PnLBySeller, CustomerTypeStats, BuyerSummary, ProductVelocity } from '../types';
import { api, formatCurrency, formatPct, formatQty } from '../services/api';
import { BarChart3, Loader2, TrendingUp, Users, Boxes, Zap } from 'lucide-react';

interface ReportsPageProps {
  currentFilter: string;
}

type ReportTab = 'pnl-product' | 'pnl-supplier' | 'customer-type' | 'buyer' | 'velocity';

export const ReportsPage: React.FC<ReportsPageProps> = ({ currentFilter }) => {
  const [tab, setTab] = useState<ReportTab>('pnl-product');
  const [loading, setLoading] = useState(false);

  const [pnlByProduct, setPnlByProduct] = useState<PnLByProduct[]>([]);
  const [pnlBySeller, setPnlBySeller] = useState<PnLBySeller[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerTypeStats | null>(null);
  const [buyerSummary, setBuyerSummary] = useState<BuyerSummary[]>([]);
  const [velocity, setVelocity] = useState<ProductVelocity[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        switch (tab) {
          case 'pnl-product':
            setPnlByProduct(await api.getPnLByProduct(currentFilter));
            break;
          case 'pnl-supplier':
            setPnlBySeller(await api.getPnLBySeller(currentFilter));
            break;
          case 'customer-type':
            setCustomerStats(await api.getCustomerTypeStats(currentFilter));
            break;
          case 'buyer':
            setBuyerSummary(await api.getBuyerRevenueSummary(currentFilter));
            break;
          case 'velocity':
            setVelocity(await api.getProductVelocity());
            break;
        }
      } catch (err) {
        console.error('Report load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab, currentFilter]);

  const tabs: { id: ReportTab; label: string; icon: any }[] = [
    { id: 'pnl-product', label: 'P&L by Product', icon: TrendingUp },
    { id: 'pnl-supplier', label: 'P&L by Supplier', icon: Users },
    { id: 'customer-type', label: 'Customer Segments', icon: BarChart3 },
    { id: 'buyer', label: 'Buyer Revenue', icon: Users },
    { id: 'velocity', label: 'Stock Velocity', icon: Zap },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-100">Reports & Analytics</h1>
        <p className="text-xs text-slate-500 mt-0.5">Business intelligence from Google Sheets</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
              }`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-emerald-400 animate-spin" /></div>
      ) : (
        <>
          {tab === 'pnl-product' && <PnLProductTable data={pnlByProduct} />}
          {tab === 'pnl-supplier' && <PnLSupplierTable data={pnlBySeller} />}
          {tab === 'customer-type' && <CustomerTypePanel data={customerStats} />}
          {tab === 'buyer' && <BuyerTable data={buyerSummary} />}
          {tab === 'velocity' && <VelocityTable data={velocity} />}
        </>
      )}
    </div>
  );
};

/* ── P&L by Product ── */
const PnLProductTable: React.FC<{ data: PnLByProduct[] }> = ({ data }) => {
  if (data.length === 0) return <EmptyState text="No product P&L data available." />;
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead><tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
          <th className="text-left px-4 py-3 font-bold">Product</th>
          <th className="text-right px-4 py-3 font-bold">Qty Sold</th>
          <th className="text-right px-4 py-3 font-bold">Revenue</th>
          <th className="text-right px-4 py-3 font-bold">COGS</th>
          <th className="text-right px-4 py-3 font-bold">Gross Profit</th>
          <th className="text-right px-4 py-3 font-bold">Wastage</th>
          <th className="text-right px-4 py-3 font-bold">Net Profit</th>
          <th className="text-right px-4 py-3 font-bold">Margin</th>
        </tr></thead>
        <tbody>
          {data.map(p => (
            <tr key={p.productId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="px-4 py-3 font-bold text-slate-200">{p.productName}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{p.qty} KG</td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-400 font-bold">{formatCurrency(p.revenue)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{formatCurrency(p.cogs)}</td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-teal-400">{formatCurrency(p.grossProfit)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-rose-400">{formatCurrency(p.wastageLoss)}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-bold ${p.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(p.netProfit)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatPct(p.marginPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── P&L by Supplier ── */
const PnLSupplierTable: React.FC<{ data: PnLBySeller[] }> = ({ data }) => {
  if (data.length === 0) return <EmptyState text="No supplier P&L data available." />;
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-x-auto">
      <table className="w-full text-xs min-w-[700px]">
        <thead><tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
          <th className="text-left px-4 py-3 font-bold">Supplier</th>
          <th className="text-right px-4 py-3 font-bold">Lots</th>
          <th className="text-right px-4 py-3 font-bold">Qty Sold</th>
          <th className="text-right px-4 py-3 font-bold">Revenue</th>
          <th className="text-right px-4 py-3 font-bold">COGS</th>
          <th className="text-right px-4 py-3 font-bold">Profit</th>
          <th className="text-right px-4 py-3 font-bold">Wastage</th>
          <th className="text-right px-4 py-3 font-bold">ROI %</th>
        </tr></thead>
        <tbody>
          {data.map(s => (
            <tr key={s.supplierId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="px-4 py-3 font-bold text-slate-200">{s.supplierName}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{s.lotsCount}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{s.qtySold} KG</td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-400 font-bold">{formatCurrency(s.revenue)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{formatCurrency(s.cogs)}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-bold ${s.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(s.netProfit)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-rose-400">{formatCurrency(s.wastageLoss)}</td>
              <td className="px-4 py-3 text-right tabular-nums text-blue-400">{formatPct(s.roiPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Customer Type Panel ── */
const CustomerTypePanel: React.FC<{ data: CustomerTypeStats | null }> = ({ data }) => {
  if (!data) return <EmptyState text="No customer segment data." />;
  const segments = Object.values(data);
  const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {segments.map(seg => {
        const pct = totalRevenue > 0 ? (seg.revenue / totalRevenue * 100) : 0;
        return (
          <div key={seg.type} className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5">
            <p className="text-xs font-bold text-slate-400 mb-1">{seg.label}</p>
            <p className="text-2xl font-black text-slate-100 tabular-nums">{formatCurrency(seg.revenue)}</p>
            <div className="w-full h-1 bg-slate-800 rounded-full mt-2 mb-3">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px]">
              <span className="text-slate-500">Sales Count</span><span className="text-right font-bold text-slate-300">{seg.count}</span>
              <span className="text-slate-500">Volume</span><span className="text-right font-bold text-slate-300">{seg.qty} KG</span>
              <span className="text-slate-500">Share</span><span className="text-right font-bold text-emerald-400">{pct.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ── Buyer Revenue Table ── */
const BuyerTable: React.FC<{ data: BuyerSummary[] }> = ({ data }) => {
  if (data.length === 0) return <EmptyState text="No buyer data available." />;
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-x-auto">
      <table className="w-full text-xs min-w-[500px]">
        <thead><tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
          <th className="text-left px-4 py-3 font-bold">Buyer</th>
          <th className="text-left px-4 py-3 font-bold">Type</th>
          <th className="text-right px-4 py-3 font-bold">Orders</th>
          <th className="text-right px-4 py-3 font-bold">Volume</th>
          <th className="text-right px-4 py-3 font-bold">Revenue</th>
          <th className="text-right px-4 py-3 font-bold">Profit</th>
        </tr></thead>
        <tbody>
          {data.map(b => (
            <tr key={b.name} className="border-b border-slate-800/50 hover:bg-slate-800/30">
              <td className="px-4 py-3 font-bold text-slate-200">{b.name}</td>
              <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-700/50 text-slate-400">{b.customerType}</span></td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-400">{b.orderCount}</td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-300">{b.totalQty} KG</td>
              <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-400">{formatCurrency(b.totalRevenue)}</td>
              <td className={`px-4 py-3 text-right tabular-nums font-bold ${b.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(b.totalProfit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ── Stock Velocity Table ── */
const VelocityTable: React.FC<{ data: ProductVelocity[] }> = ({ data }) => {
  if (data.length === 0) return <EmptyState text="No velocity data available." />;
  const statusColors: Record<string, { bg: string; text: string }> = {
    'healthy': { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    'low': { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    'out': { bg: 'bg-rose-500/15', text: 'text-rose-400' },
    'fast-moving': { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  };
  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-x-auto">
      <table className="w-full text-xs min-w-[600px]">
        <thead><tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
          <th className="text-left px-4 py-3 font-bold">Product</th>
          <th className="text-right px-4 py-3 font-bold">Current Stock</th>
          <th className="text-right px-4 py-3 font-bold">Sold Today</th>
          <th className="text-right px-4 py-3 font-bold">Sold 7D</th>
          <th className="text-right px-4 py-3 font-bold">Daily Run Rate</th>
          <th className="text-right px-4 py-3 font-bold">Days of Stock</th>
          <th className="text-left px-4 py-3 font-bold">Status</th>
        </tr></thead>
        <tbody>
          {data.map(v => {
            const sc = statusColors[v.velocityStatus] || statusColors.healthy;
            return (
              <tr key={v.productId} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                <td className="px-4 py-3 font-bold text-slate-200">{v.productName}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-300">{v.currentStock} KG</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-400">{v.soldToday} KG</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-400">{v.sold7Days} KG</td>
                <td className="px-4 py-3 text-right tabular-nums text-blue-400">{v.runRate} KG/d</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-200">{v.daysOfStock >= 999 ? '99+' : v.daysOfStock + 'd'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${sc.bg} ${sc.text}`}>{v.velocityStatus}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ── Empty State ── */
const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <BarChart3 className="w-12 h-12 text-slate-700 mb-3" />
    <p className="text-sm font-bold text-slate-400">{text}</p>
  </div>
);
