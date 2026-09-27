import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Product, Supplier, StockItem, PaymentMethod } from '../types/index';
import { api } from '../services/api';
import { AlertCircle, Truck, Plus, Calculator } from 'lucide-react';

interface NewPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  suppliers: Supplier[];
  stockList: StockItem[];
  preselectedProductId?: string;
  onSuccess: (newPurchase: any) => void;
  onOpenAddSupplier?: () => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  isOpen,
  onClose,
  products,
  suppliers,
  stockList,
  preselectedProductId,
  onSuccess,
  onOpenAddSupplier,
}) => {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [purchaseRate, setPurchaseRate] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProducts = useMemo(() => products.filter((p) => p.active !== false), [products]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.active !== false), [suppliers]);

  useEffect(() => {
    if (isOpen) {
      if (preselectedProductId && activeProducts.some((p) => p.id === preselectedProductId)) {
        setSelectedProductId(preselectedProductId);
      } else if (activeProducts.length > 0 && !selectedProductId) {
        setSelectedProductId(activeProducts[0].id);
      }
      if (activeSuppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(activeSuppliers[0].id);
      }
      setError(null);
    }
  }, [isOpen, preselectedProductId, activeProducts, activeSuppliers]);

  // Current stock and cost info
  const selectedStock = useMemo(() => {
    return stockList.find((s) => s.productId === selectedProductId);
  }, [stockList, selectedProductId]);

  const currentStock = selectedStock ? selectedStock.currentStock : 0;
  const currentAvgCost = selectedStock ? selectedStock.averageCost : 0;

  const parsedQty = parseFloat(quantity) || 0;
  const parsedRate = parseFloat(purchaseRate) || 0;
  const totalAmount = Math.round(parsedQty * parsedRate * 100) / 100;
  const parsedPaid = amountPaid === '' ? totalAmount : (parseFloat(amountPaid) || 0);
  const amountDue = Math.max(0, Math.round((totalAmount - parsedPaid) * 100) / 100);

  // New simulated moving weighted average cost calculation
  const simulatedAvgCost = useMemo(() => {
    if (parsedQty <= 0 || parsedRate <= 0) return currentAvgCost;
    const totalQty = currentStock + parsedQty;
    if (totalQty <= 0) return 0;
    const totalVal = currentStock * currentAvgCost + parsedQty * parsedRate;
    return Math.round((totalVal / totalQty) * 100) / 100;
  }, [currentStock, currentAvgCost, parsedQty, parsedRate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSupplierId) {
      setError('Please select or add a supplier');
      return;
    }

    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    if (parsedQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (parsedRate <= 0) {
      setError('Purchase rate must be greater than zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedProd = products.find((p) => p.id === selectedProductId);
      const selectedSup = suppliers.find((s) => s.id === selectedSupplierId);

      const pur = await api.createPurchase({
        supplierId: selectedSupplierId,
        supplierName: selectedSup?.name,
        productId: selectedProductId,
        productName: selectedProd?.name,
        quantityKg: parsedQty,
        purchaseRate: parsedRate,
        amountPaid: parsedPaid,
        paymentMethod,
        notes: notes.trim(),
      });

      // Reset
      setQuantity('');
      setPurchaseRate('');
      setAmountPaid('');
      setNotes('');
      setError(null);

      onSuccess(pur);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Mandi Inflow Purchase"
      subtitle="Restock inventory and auto-recalculate moving weighted average cost"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Supplier selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Mandi Supplier <span className="text-indigo-400">*</span>
            </label>
            {onOpenAddSupplier && (
              <button
                type="button"
                onClick={onOpenAddSupplier}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Quick Add New Supplier</span>
              </button>
            )}
          </div>
          <select
            value={selectedSupplierId}
            onChange={(e) => setSelectedSupplierId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-indigo-500 outline-none"
            required
          >
            {activeSuppliers.length === 0 ? (
              <option value="">No suppliers yet - please add one</option>
            ) : (
              activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} · {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Product selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Commodity Item <span className="text-indigo-400">*</span>
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-indigo-500 outline-none"
            required
          >
            {activeProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Current Stock vs New Simulated Cost */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400">Current Warehouse Stock:</span>{' '}
            <span className="font-mono font-bold text-white ml-1">
              {currentStock} KG
            </span>
          </div>

          <div className="text-right">
            <span className="text-slate-400">Current Avg Cost:</span>{' '}
            <span className="font-mono font-bold text-indigo-300 ml-1">
              ₹{currentAvgCost.toFixed(2)}/KG
            </span>
          </div>
        </div>

        {/* Quantity and Purchase Rate in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Purchased Quantity (KG) <span className="text-indigo-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base text-white font-mono font-bold focus:border-indigo-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Purchase Cost (₹ / KG) <span className="text-indigo-400">*</span>
            </label>
            <input
              type="number"
              step="any"
              min="0.1"
              value={purchaseRate}
              onChange={(e) => setPurchaseRate(e.target.value)}
              placeholder="e.g. 28"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base text-white font-mono font-bold focus:border-indigo-500 outline-none"
              required
            />
          </div>
        </div>

        {/* Simulated Weighted Cost preview */}
        {parsedQty > 0 && parsedRate > 0 && (
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
              <span>Total Purchase Spend:</span>
              <span className="text-xl font-black text-indigo-300 font-mono">
                ₹{totalAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">New Moving Weighted Cost:</span>
              <span className="font-black font-mono text-emerald-400 text-sm">
                ₹{simulatedAvgCost.toFixed(2)} / KG
              </span>
            </div>
          </div>
        )}

        {/* Settlement payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Amount Paid to Supplier (₹)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={`Full: ₹${totalAmount}`}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:border-indigo-500 outline-none"
            />
            {totalAmount > 0 && amountDue > 0 && (
              <p className="text-[10px] text-amber-400 mt-1 font-mono font-bold">
                Due: ₹{amountDue.toLocaleString('en-IN')} (Added to Mandi Outstandings)
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-indigo-500 outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI (GPay / PhonePe / NEFT)</option>
              <option value="Credit">Credit / Mandi Khata</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Purchase Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Vehicle number, bag count, mandi lot remarks"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Truck className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Recording...' : 'RECORD PURCHASE'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
