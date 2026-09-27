import React, { useState, useEffect } from 'react';
import type { Sale, Product, Purchase, StockItem, CreateSalePayload, CustomerType, PaymentMode } from '../types';
import { api, formatCurrency, formatQty, formatDate, todayISO } from '../services/api';
import { CUSTOMER_TYPES, PAYMENT_MODES } from '../config';
import { ShoppingCart, Plus, Search, X, ChevronDown, Package, AlertCircle, Loader2 } from 'lucide-react';

interface SalesPageProps {
  sales: Sale[];
  products: Product[];
  purchases: Purchase[];
  stockList: StockItem[];
  onSaleSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  sales, products, purchases, stockList, onSaleSuccess, showToast,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = sales.filter(s =>
    s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Sales</h1>
          <p className="text-xs text-slate-500 mt-0.5">{sales.length} transactions recorded</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-950/50"
        >
          <Plus className="w-4 h-4" /> New Sale
        </button>
      </div>

      {/* New Sale Form Modal */}
      {showForm && (
        <NewSaleForm
          products={products}
          stockList={stockList}
          onClose={() => setShowForm(false)}
          onSuccess={async () => {
            setShowForm(false);
            await onSaleSuccess();
          }}
          showToast={showToast}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by product, buyer, or invoice..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
        />
      </div>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-400">No sales found</p>
          <p className="text-xs text-slate-500 mt-1">Record your first sale to get started.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                  <th className="text-left px-4 py-3 font-bold">Invoice</th>
                  <th className="text-left px-4 py-3 font-bold">Date</th>
                  <th className="text-left px-4 py-3 font-bold">Product</th>
                  <th className="text-left px-4 py-3 font-bold">Lot</th>
                  <th className="text-right px-4 py-3 font-bold">Qty</th>
                  <th className="text-right px-4 py-3 font-bold">Rate</th>
                  <th className="text-right px-4 py-3 font-bold">Revenue</th>
                  <th className="text-right px-4 py-3 font-bold">Profit</th>
                  <th className="text-left px-4 py-3 font-bold">Buyer</th>
                  <th className="text-left px-4 py-3 font-bold">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-300">{sale.id}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(sale.date)}</td>
                    <td className="px-4 py-3 font-bold text-slate-200">{sale.productName}</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{sale.lotId}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{sale.quantity} KG</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-300">{formatCurrency(sale.rate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-400">{formatCurrency(sale.revenue)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-bold ${sale.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatCurrency(sale.grossProfit)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{sale.buyer}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        sale.customerType === 'Hotel' ? 'bg-purple-500/20 text-purple-400' :
                        sale.customerType === 'Shopkeeper' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-slate-700/50 text-slate-400'
                      }`}>
                        {sale.customerType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {filteredSales.map(sale => (
              <div key={sale.id} className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] text-slate-500">{sale.id}</span>
                  <span className="text-[10px] text-slate-500">{formatDate(sale.date)}</span>
                </div>
                <p className="text-sm font-bold text-slate-200">{sale.productName}</p>
                <p className="text-xs text-slate-400 mt-0.5">{sale.buyer} · {sale.customerType}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/50">
                  <span className="text-xs text-slate-400">{sale.quantity} KG × {formatCurrency(sale.rate)}</span>
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(sale.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   NEW SALE FORM — with Lot Picker
   ══════════════════════════════════════════════════ */

interface NewSaleFormProps {
  products: Product[];
  stockList: StockItem[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const NewSaleForm: React.FC<NewSaleFormProps> = ({ products, stockList, onClose, onSuccess, showToast }) => {
  const [productId, setProductId] = useState('');
  const [lotId, setLotId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rate, setRate] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('Walk-in');
  const [buyer, setBuyer] = useState('');
  const [payment, setPayment] = useState<PaymentMode>('Cash');
  const [date, setDate] = useState(todayISO());

  const [activeLots, setActiveLots] = useState<Purchase[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch active lots when product changes
  useEffect(() => {
    if (!productId) {
      setActiveLots([]);
      setLotId('');
      return;
    }
    setLotId('');
    setLoadingLots(true);
    api.getActiveLots(productId)
      .then(lots => setActiveLots(lots))
      .catch(() => setActiveLots([]))
      .finally(() => setLoadingLots(false));
  }, [productId]);

  const selectedLot = activeLots.find(l => l.id === lotId);
  const stockItem = stockList.find(s => s.productId === productId);
  const maxQty = selectedLot ? selectedLot.remainingQty : 0;
  const qtyNum = parseFloat(quantity) || 0;
  const rateNum = parseFloat(rate) || 0;
  const revenue = qtyNum * rateNum;

  const canSubmit = productId && lotId && qtyNum > 0 && qtyNum <= maxQty && rateNum > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload: CreateSalePayload = {
        productId,
        lotId,
        quantity: qtyNum,
        rate: rateNum,
        customerType,
        buyer: buyer.trim() || customerType,
        payment,
        date,
      };
      const result = await api.createSale(payload);
      showToast(`Sale ${result.invoiceId} recorded — ${formatCurrency(result.revenue)} revenue`);
      await onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to create sale', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-black text-slate-100">New Sale</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Date */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Product */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Product *</label>
            <select value={productId} onChange={e => setProductId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select product...</option>
              {products.filter(p => p.active).map(p => {
                const stock = stockList.find(s => s.productId === p.id);
                return (
                  <option key={p.id} value={p.id}>
                    {p.name} — {stock ? stock.currentStock.toFixed(1) + ' KG available' : 'No stock data'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Lot Selection */}
          {productId && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select Lot * {loadingLots && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
              </label>
              {loadingLots ? (
                <div className="py-3 text-center text-xs text-slate-500">Loading available lots...</div>
              ) : activeLots.length === 0 ? (
                <div className="py-3 px-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> No active lots with remaining stock for this product.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activeLots.map(lot => (
                    <button
                      key={lot.id}
                      type="button"
                      onClick={() => { setLotId(lot.id); setRate(lot.targetRate.toString()); }}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-xs ${
                        lotId === lot.id
                          ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20'
                          : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-slate-200">{lot.id}</span>
                          <span className="text-slate-500 ml-2">{lot.supplierName} · {formatDate(lot.date)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400">{lot.remainingQty} KG</span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-1 text-[10px] text-slate-500">
                        <span>Cost: {formatCurrency(lot.rate)}/KG</span>
                        <span>Target: {formatCurrency(lot.targetRate)}/KG</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quantity & Rate */}
          {lotId && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Quantity (KG) * <span className="text-emerald-400">Max: {maxQty}</span>
                </label>
                <input type="number" step="0.1" min="0.1" max={maxQty} value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Selling Rate (₹/KG) *
                </label>
                <input type="number" step="0.5" min="0.5" value={rate}
                  onChange={e => setRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums"
                />
              </div>
            </div>
          )}

          {/* Revenue Preview */}
          {qtyNum > 0 && rateNum > 0 && (
            <div className="bg-slate-800/60 rounded-lg p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Revenue</span><span className="font-bold text-emerald-400 tabular-nums">{formatCurrency(revenue)}</span>
              </div>
              {selectedLot && (
                <div className="flex justify-between text-slate-400">
                  <span>Est. COGS</span><span className="tabular-nums">{formatCurrency(qtyNum * selectedLot.rate)}</span>
                </div>
              )}
              {selectedLot && (
                <div className="flex justify-between text-slate-400 border-t border-slate-700 pt-1">
                  <span>Est. Gross Profit</span>
                  <span className={`font-bold tabular-nums ${revenue - qtyNum * selectedLot.rate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(revenue - qtyNum * selectedLot.rate)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Customer Type & Buyer */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Type</label>
              <select value={customerType} onChange={e => setCustomerType(e.target.value as CustomerType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {CUSTOMER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Buyer Name</label>
              <input type="text" value={buyer} onChange={e => setBuyer(e.target.value)}
                placeholder="Walk-in"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Mode</label>
            <div className="flex gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => setPayment(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    payment === m
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >{m}</button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Recording Sale...</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Record Sale</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
