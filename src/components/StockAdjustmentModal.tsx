import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './Modal';
import { Product, StockItem, AdjustmentType } from '../types/index';
import { api } from '../services/api';
import { AlertCircle, SlidersHorizontal } from 'lucide-react';

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stockList: StockItem[];
  preselectedProductId?: string;
  onSuccess: (newAdj: any) => void;
}

const ADJUSTMENT_TYPES: { type: AdjustmentType; direction: 'add' | 'reduce'; label: string }[] = [
  { type: 'Spoilage', direction: 'reduce', label: 'Spoilage (Decayed / Rotten) [-]' },
  { type: 'Damage', direction: 'reduce', label: 'Damage (Crushed in transport) [-]' },
  { type: 'Wastage', direction: 'reduce', label: 'Wastage (Moisture Loss / Dehydration) [-]' },
  { type: 'Stock Correction', direction: 'reduce', label: 'Physical Audit Reduction [-]' },
  { type: 'Stock Increase', direction: 'add', label: 'Stock Increase (Found in physical count) [+]' },
  { type: 'Opening Stock', direction: 'add', label: 'Opening Stock Baseline [+]' },
];

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  isOpen,
  onClose,
  products,
  stockList,
  preselectedProductId,
  onSuccess,
}) => {
  const [selectedProductId, setSelectedProductId] = useState(preselectedProductId || '');
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('Spoilage');
  const [quantity, setQuantity] = useState<string>('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (preselectedProductId) {
        setSelectedProductId(preselectedProductId);
      } else if (products.length > 0 && !selectedProductId) {
        setSelectedProductId(products[0].id);
      }
    }
    if (!isOpen) {
      setError(null);
    }
  }, [isOpen, preselectedProductId, products, selectedProductId]);

  const selectedStock = useMemo(() => {
    return stockList.find((s) => s.productId === selectedProductId);
  }, [stockList, selectedProductId]);

  const currentStock = selectedStock ? selectedStock.currentStock : 0;
  const currentConfig = ADJUSTMENT_TYPES.find((t) => t.type === adjustmentType);
  const rawQty = parseFloat(quantity) || 0;
  const isReduction = currentConfig?.direction === 'reduce';

  const resultingStock = useMemo(() => {
    if (rawQty <= 0) return currentStock;
    return isReduction
      ? Math.max(0, currentStock - rawQty)
      : currentStock + rawQty;
  }, [currentStock, rawQty, isReduction]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }

    if (rawQty <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if (!reason.trim()) {
      setError('Reason is strictly mandatory for stock adjustment audits');
      return;
    }

    if (isReduction && rawQty > currentStock) {
      setError(`Cannot reduce more than current stock (${currentStock} KG)`);
      return;
    }

    setIsSubmitting(true);
    try {
      const adj = await api.createStockAdjustment({
        productId: selectedProductId,
        adjustmentType,
        quantityKg: rawQty,
        reason: reason.trim(),
        notes: notes.trim(),
      });

      setQuantity('');
      setReason('');
      setNotes('');
      setError(null);

      onSuccess(adj);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Stock Audit & Adjustment"
      subtitle="Account for spoilage, transit damage, wastage, or physical audit corrections"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Commodity select */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Commodity Item <span className="text-purple-400">*</span>
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-purple-500 outline-none"
            required
          >
            {products.map((p) => {
              const st = stockList.find((s) => s.productId === p.id);
              const stk = st ? st.currentStock : 0;
              return (
                <option key={p.id} value={p.id}>
                  {p.id} · {p.name} ({stk} KG Available)
                </option>
              );
            })}
          </select>
        </div>

        {/* Adjustment Type Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Adjustment Type <span className="text-purple-400">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ADJUSTMENT_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setAdjustmentType(t.type)}
                className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all cursor-pointer ${
                  adjustmentType === t.type
                    ? t.direction === 'reduce'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Adjustment Quantity (KG) <span className="text-purple-400">*</span>
          </label>
          <input
            type="number"
            step="any"
            min="0.1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 5, 10, 25"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-base text-white font-mono font-bold focus:border-purple-500 outline-none"
            required
          />
        </div>

        {/* Stock Impact Visual Pill */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 text-[11px] block">Current Physical Stock:</span>
            <span className="font-mono font-bold text-white text-base">{currentStock} KG</span>
          </div>

          <span className="text-slate-600 font-bold text-lg">→</span>

          <div className="text-right">
            <span className="text-slate-400 text-[11px] block">Resulting Warehouse Stock:</span>
            <span
              className={`font-mono font-black text-base ${
                isReduction ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {resultingStock} KG
            </span>
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Audit Reason <span className="text-purple-400">* (Mandatory)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. 10 KG decayed white onion found in bottom sack"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-purple-500 outline-none"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Internal Audit Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Inspector or batch notes"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 outline-none"
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
            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-950/40 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <SlidersHorizontal className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Recording...' : 'RECORD ADJUSTMENT'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
