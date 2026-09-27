import React, { useState } from 'react';
import { Modal } from './Modal';
import { api } from '../services/api';
import { AlertCircle, PackagePlus } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProduct: any) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Vegetables');
  const [lowStockThreshold, setLowStockThreshold] = useState('50');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Product name is required');
      return;
    }

    const threshold = parseFloat(lowStockThreshold) || 50;

    setIsSubmitting(true);
    try {
      const prod = await api.createProduct({
        name: name.trim(),
        category: category.trim(),
        lowStockThreshold: threshold,
      });

      setName('');
      setError(null);
      onSuccess(prod);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Produce Commodity"
      subtitle="Adds to PRODUCTS tab and dynamically initializes warehouse STOCK"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Product / Commodity Name <span className="text-emerald-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sambar Onion, Green Chilli"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-emerald-500 outline-none"
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-medium focus:border-emerald-500 outline-none"
          >
            <option value="Vegetables">Vegetables</option>
            <option value="Spices">Spices</option>
            <option value="Tubers">Tubers</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Unit and Minimum Threshold */}
        <div className="grid grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Base Unit
            </label>
            <input
              type="text"
              value="KG"
              disabled
              className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Min Threshold (KG)
            </label>
            <input
              type="number"
              step="any"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono font-bold focus:border-emerald-500 outline-none"
              required
            />
          </div>
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
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <PackagePlus className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Adding...' : 'ADD COMMODITY'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
