import React, { useState } from 'react';
import type { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types';
import { api, formatCurrency } from '../services/api';
import { Users, Plus, Search, X, Loader2, Phone, MapPin, Edit2 } from 'lucide-react';

interface SuppliersPageProps {
  suppliers: Supplier[];
  onSupplierSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ suppliers, onSupplierSuccess, showToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Suppliers</h1>
          <p className="text-xs text-slate-500 mt-0.5">{suppliers.filter(s => s.status === 'active').length} active suppliers</p>
        </div>
        <button onClick={() => { setEditingSupplier(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-950/50">
          <Plus className="w-4 h-4" /> Add Supplier
        </button>
      </div>

      {showForm && (
        <SupplierForm
          supplier={editingSupplier}
          onClose={() => { setShowForm(false); setEditingSupplier(null); }}
          onSuccess={async () => { setShowForm(false); setEditingSupplier(null); await onSupplierSuccess(); }}
          showToast={showToast}
        />
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search suppliers..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(sup => (
          <div key={sup.id} className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-slate-200">{sup.name}</p>
                <p className="text-[10px] font-mono text-slate-500">{sup.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  sup.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/50 text-slate-500'
                }`}>{sup.status}</span>
                <button onClick={() => openEdit(sup)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {sup.phone && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1"><Phone className="w-3 h-3" /> {sup.phone}</div>
            )}
            {sup.location && (
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1"><MapPin className="w-3 h-3" /> {sup.location}</div>
            )}
            {sup.category && (
              <p className="text-[10px] text-slate-500 mt-2">Category: {sup.category}</p>
            )}
            <div className="mt-3 pt-3 border-t border-slate-800/50 flex justify-between text-xs">
              <span className="text-slate-500">Total Purchases</span>
              <span className="font-bold text-amber-400 tabular-nums">{formatCurrency(sup.totalPurchases)}</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-400">No suppliers found</p>
        </div>
      )}
    </div>
  );
};

/* ── Supplier Form (Add/Edit) ── */

interface SupplierFormProps {
  supplier: Supplier | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onClose, onSuccess, showToast }) => {
  const isEdit = !!supplier;
  const [name, setName] = useState(supplier?.name || '');
  const [phone, setPhone] = useState(supplier?.phone || '');
  const [location, setLocation] = useState(supplier?.location || '');
  const [category, setCategory] = useState(supplier?.category || '');
  const [status, setStatus] = useState(supplier?.status || 'active');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showToast('Supplier name is required', 'error'); return; }

    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateSupplier({ id: supplier!.id, name, phone, location, category, status: status as any });
        showToast(`Supplier ${supplier!.id} updated`);
      } else {
        const result = await api.createSupplier({ name, phone, location, category });
        showToast(`Supplier ${result.id} added — ${result.name}`);
      }
      await onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to save supplier', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-black text-slate-100">{isEdit ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Supplier name"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Phone</label>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="City"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Supply Category</label>
            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Onion, Spice, All"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
          </div>
          {isEdit && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Status</label>
              <div className="flex gap-2">
                {['active', 'inactive'].map(s => (
                  <button key={s} type="button" onClick={() => setStatus(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all capitalize ${
                      status === s ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : isEdit ? 'Update Supplier' : 'Add Supplier'}
          </button>
        </form>
      </div>
    </div>
  );
};
