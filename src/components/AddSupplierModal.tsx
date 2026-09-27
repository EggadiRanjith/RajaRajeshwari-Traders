import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Supplier } from '../types/index';
import { api } from '../services/api';
import { AlertCircle, UserCheck, Users } from 'lucide-react';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit?: Supplier | null;
  onSuccess: (supplier: Supplier) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (supplierToEdit) {
      setName(supplierToEdit.name);
      setPhone(supplierToEdit.phone || '');
      setAddress(supplierToEdit.address || '');
      setNotes(supplierToEdit.notes || '');
      setActive(supplierToEdit.active !== false);
    } else {
      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setActive(true);
    }
    setError(null);
  }, [supplierToEdit, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      let result: Supplier;
      if (supplierToEdit) {
        result = await api.updateSupplier({
          id: supplierToEdit.id,
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          active,
        });
      } else {
        result = await api.createSupplier({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
      }

      setName('');
      setPhone('');
      setAddress('');
      setNotes('');
      setError(null);
      onSuccess(result);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplierToEdit ? `Edit Supplier (${supplierToEdit.id})` : 'Add Mandi Supplier'}
      subtitle="Adds to SUPPLIERS tab with automatic ID generation (SUP-001)"
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
            Supplier Name <span className="text-indigo-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Mandi Traders, Nashik Onions"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-medium focus:border-indigo-500 outline-none"
            required
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9845012345"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Mandi / Yard Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Stall #14, Onion Yard, APMC Market"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
            Supplier Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quality grade, credit terms, commission rate"
            className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 outline-none"
          />
        </div>

        {/* Status Toggle if Editing */}
        {supplierToEdit && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="activeToggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800"
            />
            <label htmlFor="activeToggle" className="text-xs font-bold text-slate-300">
              Active Supplier (Visible in purchase dropdowns)
            </label>
          </div>
        )}

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
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <UserCheck className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Saving...' : supplierToEdit ? 'UPDATE SUPPLIER' : 'SAVE SUPPLIER'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
