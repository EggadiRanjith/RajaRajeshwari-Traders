import React, { useState } from 'react';
import type { Expense, CreateExpensePayload, PaymentMode, ExpenseCategory } from '../types';
import { api, formatCurrency, formatDate, todayISO } from '../services/api';
import { PAYMENT_MODES, EXPENSE_CATEGORIES } from '../config';
import { Wallet, Plus, Search, X, Loader2 } from 'lucide-react';

interface ExpensesPageProps {
  expenses: Expense[];
  onExpenseSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ExpensesPage: React.FC<ExpensesPageProps> = ({ expenses, onExpenseSuccess, showToast }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = expenses.filter(e =>
    e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCategory: Record<string, number> = {};
  filtered.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Expenses</h1>
          <p className="text-xs text-slate-500 mt-0.5">{expenses.length} entries · Total: {formatCurrency(totalAmount)}</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-lg shadow-emerald-950/50">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {showForm && (
        <ExpenseForm
          onClose={() => setShowForm(false)}
          onSuccess={async () => { setShowForm(false); await onExpenseSuccess(); }}
          showToast={showToast}
        />
      )}

      {/* Category Summary */}
      {Object.keys(byCategory).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <span className="text-slate-400">{cat}</span>
              <span className="ml-2 font-bold text-amber-400 tabular-nums">{formatCurrency(amt)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input type="text" placeholder="Search expenses..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Wallet className="w-12 h-12 text-slate-700 mb-3" />
          <p className="text-sm font-bold text-slate-400">No expenses recorded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <div key={exp.id} className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/15 text-violet-400">{exp.category}</span>
                  <span className="text-[10px] text-slate-500">{formatDate(exp.date)}</span>
                  <span className="font-mono text-[10px] text-slate-600">{exp.id}</span>
                </div>
                <p className="text-sm text-slate-300 truncate">{exp.description || '—'}</p>
                {exp.paidTo && <p className="text-[10px] text-slate-500 mt-0.5">Paid to: {exp.paidTo}</p>}
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-bold text-amber-400 tabular-nums">{formatCurrency(exp.amount)}</p>
                <p className="text-[10px] text-slate-500">{exp.paidBy}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Expense Form ── */

interface ExpenseFormProps {
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onClose, onSuccess, showToast }) => {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<PaymentMode>('Cash');
  const [paidTo, setPaidTo] = useState('');
  const [date, setDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);

  const amtNum = parseFloat(amount) || 0;
  const canSubmit = category && amtNum > 0 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        category: category as ExpenseCategory,
        description, amount: amtNum, paidBy, paidTo, date,
      };
      const result = await api.createExpense(payload);
      showToast(`Expense ${result.expenseId} recorded — ${formatCurrency(result.amount)}`);
      await onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-lg font-black text-slate-100">Add Expense</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Category *</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
              <option value="">Select category...</option>
              {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this expense for?"
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Amount (₹) *</label>
              <input type="number" step="1" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 tabular-nums" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Paid To</label>
              <input type="text" value={paidTo} onChange={e => setPaidTo(e.target.value)} placeholder="Payee name"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Payment Mode</label>
            <div className="flex gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} type="button" onClick={() => setPaidBy(m)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    paidBy === m ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>{m}</button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={!canSubmit}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : 'Record Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};
