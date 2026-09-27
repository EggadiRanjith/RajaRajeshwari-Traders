import React, { useState } from 'react';
import type { Purchase, Product, Supplier, CreatePurchasePayload, PaymentMode } from '../types';
import { api, formatCurrency, formatQty, formatDate, todayISO } from '../services/api';
import { PAYMENT_MODES } from '../config';
import { Truck, Plus, Search, X, Loader2 } from 'lucide-react';

interface PurchasesPageProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  onPurchaseSuccess: () => Promise<void>;
  onOpenAddSupplier: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const PurchasesPage: React.FC<PurchasesPageProps> = ({
  purchases, products, suppliers, onPurchaseSuccess, onOpenAddSupplier, showToast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = purchases.filter(p =>
    p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Purchases</h1>
          <p className="text-xs text-slate-500 mt-0.5">{purchases.length} lots recorded</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-950/50"
        >
          <Plus className="w-4 h-4" /> New Purchase
        </button>
      </div>

      {showForm && (
        <NewPurchaseForm
          products={products}
          suppliers={suppliers.filter(s => s.status === 'active')}
          onClose={() => setShowForm(false)}
          onSuccess={async () => { setShowForm(false); await onPurchaseSuccess(); }}
          onOpenAddSupplier={onOpenAddSupplier}
          showToast={showToast}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search by product, supplier, or lot ID..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Truck className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-400">No purchases found</p>
          <p className="text-xs text-slate-500 mt-1">Record your first purchase to start building inventory.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="text-left px-4 py-3 font-bold">Lot ID</th>
                  <th className="text-left px-4 py-3 font-bold">Date</th>
                  <th className="text-left px-4 py-3 font-bold">Supplier</th>
                  <th className="text-left px-4 py-3 font-bold">Product</th>
                  <th className="text-right px-4 py-3 font-bold">Qty</th>
                  <th className="text-right px-4 py-3 font-bold">Cost</th>
                  <th className="text-right px-4 py-3 font-bold">Rate/KG</th>
                  <th className="text-right px-4 py-3 font-bold">Target</th>
                  <th className="text-right px-4 py-3 font-bold">Remaining</th>
                  <th className="text-left px-4 py-3 font-bold">Payment</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-300">{p.id}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(p.date)}</td>
                    <td className="px-4 py-3 text-slate-300">{p.supplierName}</td>
                    <td className="px-4 py-3 font-bold text-slate-200">{p.productName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{p.quantity} KG</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-amber-400">{formatCurrency(p.totalCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatCurrency(p.rate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-emerald-400">{formatCurrency(p.targetRate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-bold ${p.remainingQty > 0 ? 'text-blue-400' : 'text-slate-600'}`}>
                        {p.remainingQty} KG
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400">{p.payment}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filtered.map(p => (
              <div key={p.id} className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] font-bold text-slate-400">{p.id}</span>
                  <span className="text-[10px] text-slate-500">{formatDate(p.date)}</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{p.productName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.supplierName}</p>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/50 text-xs">
                  <div><p className="text-[10px] text-slate-500">Qty</p><p className="font-bold tabular-nums">{p.quantity} KG</p></div>
                  <div><p className="text-[10px] text-slate-500">Cost/KG</p><p className="font-bold tabular-nums">{formatCurrency(p.rate)}</p></div>
                  <div><p className="text-[10px] text-slate-500">Remaining</p><p className="font-bold tabular-nums text-blue-400">{p.remainingQty} KG</p></div>
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-slate-400">Total</span>
                  <span className="font-bold text-amber-400">{formatCurrency(p.totalCost)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── New Purchase Form ── */

interface NewPurchaseFormProps {
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onOpenAddSupplier: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const NewPurchaseForm: React.FC<NewPurchaseFormProps> = ({ products, suppliers, onClose, onSuccess, onOpenAddSupplier, showToast }) => {
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [totalQty, setTotalQty] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [targetRate, setTargetRate] = useState('');
  const [payment, setPayment] = useState<PaymentMode>('Cash');
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);

  const qty = parseFloat(totalQty) || 0;
  const cost = parseFloat(totalCost) || 0;
  const unitCost = qty > 0 ? cost / qty : 0;
  const target = parseFloat(targetRate) || 0;
  const estimatedMargin = target > 0 && unitCost > 0 ? ((target - unitCost) / unitCost * 100) : 0;

  const canSubmit = supplierId && productId && qty > 0 && cost > 0 && target > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload: CreatePurchasePayload = { supplierId, productId, totalQty: qty, totalCost: cost, targetRate: target, payment, date };
      const result = await api.createPurchase(payload);
      showToast(`Lot ${result.lotId} created — ${result.totalQty} KG of ${result.productName} at ${formatCurrency(result.unitCost)}/KG`);
      await onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to create purchase', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-black text-slate-100">New Purchase</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier *</label>
              <button type="button" onClick={onOpenAddSupplier} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold">+ Add New</button>
            </div>
            <select value={supplierId} onChange={e => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} — {s.location}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="">Select product...</option>
              {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Qty (KG) *</label>
              <input type="number" step="0.1" min="0.1" value={totalQty} onChange={e => setTotalQty(e.target.value)} placeholder="0.0"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Total Cost (₹) *</label>
              <input type="number" step="1" min="1" value={totalCost} onChange={e => setTotalCost(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums" />
            </div>
          </div>

          {qty > 0 && cost > 0 && (
            <div className="bg-slate-800/60 rounded-lg p-3 text-xs flex justify-between text-slate-400">
              <span>Unit Cost</span><span className="font-bold text-amber-400 tabular-nums">{formatCurrency(unitCost)} / KG</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Target Selling Rate (₹/KG) *</label>
            <input type="number" step="0.5" min="0.5" value={targetRate} onChange={e => setTargetRate(e.target.value)} placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums" />
          </div>

          {target > 0 && unitCost > 0 && (
            <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Expected Margin</span>
                <span className={`font-bold tabular-nums ${estimatedMargin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {estimatedMargin.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Expected Profit/KG</span>
                <span className="tabular-nums">{formatCurrency(target - unitCost)}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Mode</label>
            <div className="flex gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => setPayment(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    payment === m ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>{m}</button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording Purchase...</> : <><Truck className="w-4 h-4" /> Record Purchase</>}
          </button>
        </form>
      </div>
    </div>
  );
};
