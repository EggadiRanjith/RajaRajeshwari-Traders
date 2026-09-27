import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Product, StockItem, PaymentMethod } from '../types/index';
import { api } from '../services/api';
import { AlertCircle, CheckCircle2, ShoppingBag, Receipt, Zap } from 'lucide-react';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stockList: StockItem[];
  preselectedProductId?: string;
  prefilledQuantity?: number;
  onSuccess: (newSale: any, shouldPrintReceipt?: boolean) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  stockList,
  preselectedProductId,
  prefilledQuantity,
  onSuccess,
}) => {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [sellingRate, setSellingRate] = useState<string>('');
  const [buyer, setBuyer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active products only
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.active !== false);
  }, [products]);

  // Set default product and prefill on open
  useEffect(() => {
    if (isOpen) {
      if (preselectedProductId && activeProducts.some((p) => p.id === preselectedProductId)) {
        setSelectedProductId(preselectedProductId);
      } else if (activeProducts.length > 0 && !selectedProductId) {
        setSelectedProductId(activeProducts[0].id);
      }
      if (prefilledQuantity) {
        setQuantity(String(prefilledQuantity));
      }
      setError(null);
    }
  }, [isOpen, preselectedProductId, prefilledQuantity, activeProducts]);

  // Find corresponding stock item
  const selectedStock = useMemo(() => {
    return stockList.find((s) => s.productId === selectedProductId);
  }, [stockList, selectedProductId]);

  const availableStock = selectedStock ? selectedStock.currentStock : 0;
  const currentAvgCost = selectedStock ? selectedStock.averageCost : 0;

  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(sellingRate) || 0;
  const totalAmount = Math.round(parsedQty * parsedRate * 100) / 100;
  const estimatedCogs = Math.round(parsedQty * currentAvgCost * 100) / 100;
  const estimatedGrossProfit = Math.round((totalAmount - estimatedCogs) * 100) / 100;
  const marginPct = totalAmount > 0 ? Math.round((estimatedGrossProfit / totalAmount) * 1000) / 10 : 0;

  // Stock check
  const isStockInsufficient = parsedQty > availableStock;

  const handleSave = async (printReceipt: boolean = false) => {
    setError(null);

    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    if (parsedQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (parsedRate <= 0) {
      setError('Selling rate must be greater than zero');
      return;
    }

    if (isStockInsufficient) {
      setError(`Insufficient stock. Available: ${availableStock} KG.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProd = products.find((p) => p.id === selectedProductId);
      const sale = await api.createSale({
        productId: selectedProductId,
        productName: selectedProd?.name,
        quantityKg: parsedQty,
        sellingRate: parsedRate,
        buyer: buyer.trim() || 'Walk-in',
        paymentMethod,
        notes: notes.trim(),
      });

      // Reset form
      setQuantity('');
      setSellingRate('');
      setBuyer('');
      setNotes('');
      setPaymentMethod('Cash');
      setError(null);

      onSuccess(sale, printReceipt);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record sale transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record New Counter Sale"
      subtitle="High-speed transaction billing with dynamic weighted profit tracking"
      maxWidth="max-w-lg"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave(false);
        }}
        className="space-y-4"
      >
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <div>
              <p className="font-bold">{error}</p>
              {isStockInsufficient && (
                <p className="text-[11px] mt-0.5 text-rose-400">
                  Please reduce sale weight or record a mandi restock purchase first.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Product selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Commodity Item <span className="text-emerald-400">*</span>
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-emerald-500 outline-none"
            required
          >
            {activeProducts.map((p) => {
              const st = stockList.find((s) => s.productId === p.id);
              const stk = st ? st.currentStock : 0;
              return (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.name} ({stk} KG In Stock)
                </option>
              );
            })}
          </select>
        </div>

        {/* Live Stock & Avg Cost Pill */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Available Stock:</span>{' '}
            <span
              className={`font-mono font-black ml-1 text-sm ${
                availableStock <= 0
                  ? 'text-rose-400'
                  : availableStock <= (selectedStock?.lowStockThreshold || 50)
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {availableStock} KG
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-400">Weighted Cost:</span>{' '}
            <span className="font-mono font-bold text-indigo-300 ml-1">
              ₹{currentAvgCost.toFixed(2)} / KG
            </span>
          </div>
        </div>

        {/* Quantity and Selling Rate in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Quantity (KG) <span className="text-emerald-400">*</span>
              </label>
            </div>
            <input
              type="number"
              step="any"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 5, 25, 50"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base text-white font-mono font-bold focus:border-emerald-500 outline-none"
              required
            />
            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 mt-1.5">
              {[5, 10, 25, 50, 100].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(String(qty))}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-mono font-bold cursor-pointer"
                >
                  {qty}k
                </button>
              ))}
            </div>
          </div>

          {/* Selling Rate */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Rate (₹ / KG) <span className="text-emerald-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              value={sellingRate}
              onChange={(e) => setSellingRate(e.target.value)}
              placeholder="e.g. 38"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base text-white font-mono font-bold focus:border-emerald-500 outline-none"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              Dynamic mandi price for this transaction
            </p>
          </div>
        </div>

        {/* Live Bill & Profit Preview Card */}
        {parsedQty > 0 && parsedRate > 0 && (
          <div className="bg-gradient-to-br from-emerald-500/10 via-slate-950 to-slate-950 border border-emerald-500/25 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
              <span>Bill Net Total:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">COGS (Weighted):</span>
                <p className="font-bold text-slate-300 font-mono">₹{estimatedCogs.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px]">Gross Margin:</span>
                <p
                  className={`font-black font-mono ${
                    estimatedGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ₹{estimatedGrossProfit.toLocaleString('en-IN')} ({marginPct}%)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Buyer & Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Buyer */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Buyer / Customer
            </label>
            <input
              type="text"
              value={buyer}
              onChange={(e) => setBuyer(e.target.value)}
              placeholder="Walk-in / Hotel / Name"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-emerald-500 outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe)</option>
              <option value="Credit">Credit (Khata)</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Transaction Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle number, bag details, remarks"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 outline-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSubmitting || isStockInsufficient}
            className="w-full sm:flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 border border-slate-700/80 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Receipt className="w-4 h-4 text-emerald-400" />
            <span>Save & Thermal Bill</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isStockInsufficient}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <ShoppingBag className="w-4 h-4 fill-slate-950" />
            )}
            <span>{isSubmitting ? 'Recording...' : 'SAVE SALE BILL'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
