import React, { useState } from 'react';
import { api } from '../services/api';
import { API_BASE_URL, APP_CONFIG } from '../config';
import { Settings, CheckCircle2, AlertCircle, Loader2, ExternalLink, Wifi } from 'lucide-react';

interface SettingsPageProps {
  onRefreshData: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onRefreshData, showToast }) => {
  const [pingResult, setPingResult] = useState<any>(null);
  const [pinging, setPinging] = useState(false);

  const testConnection = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const result = await api.ping();
      setPingResult({ success: true, data: result });
      showToast('Connection to Google Sheets is live!');
    } catch (err: any) {
      setPingResult({ success: false, error: err.message });
      showToast('Connection failed: ' + err.message, 'error');
    } finally {
      setPinging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black text-slate-100">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Application configuration and connection status</p>
      </div>

      {/* Business Info */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Business Information</h3>
        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <span className="text-slate-500">Business Name</span>
          <span className="text-slate-200 font-bold">{APP_CONFIG.businessName}</span>
          <span className="text-slate-500">Owner</span>
          <span className="text-slate-200">{APP_CONFIG.owner}</span>
          <span className="text-slate-500">Location</span>
          <span className="text-slate-200">{APP_CONFIG.location}</span>
          <span className="text-slate-500">Currency</span>
          <span className="text-slate-200">{APP_CONFIG.currency}</span>
          <span className="text-slate-500">Unit</span>
          <span className="text-slate-200">{APP_CONFIG.unit}</span>
          <span className="text-slate-500">Credit Policy</span>
          <span className="text-emerald-400 font-bold">Zero Credit — Paid at Receipt</span>
        </div>
      </div>

      {/* API Connection */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200">Google Sheets API Connection</h3>
        <div className="bg-slate-800/60 rounded-lg p-3 text-xs font-mono text-slate-400 break-all select-all">
          {API_BASE_URL}
        </div>

        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={pinging}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold transition-colors"
          >
            {pinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
            Test Connection
          </button>
          <button
            onClick={onRefreshData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors"
          >
            Refresh All Data
          </button>
        </div>

        {pingResult && (
          <div className={`rounded-lg p-3 border text-xs ${
            pingResult.success
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : 'bg-rose-500/10 border-rose-500/20'
          }`}>
            {pingResult.success ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div>
                  <p className="font-bold text-emerald-400">Connected Successfully</p>
                  <p className="text-slate-400 mt-0.5">
                    Store: {pingResult.data.store} · Version: {pingResult.data.version} · Time: {new Date(pingResult.data.time).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="font-bold text-rose-400">Connection Failed</p>
                  <p className="text-slate-400 mt-0.5">{pingResult.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Database Sheets */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Database Sheets</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['PRODUCTS', 'STOCK', 'SUPPLIERS', 'PURCHASES', 'SALES', 'WASTAGE', 'EXPENSES', 'SETTINGS'].map(sheet => (
            <div key={sheet} className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/50 text-center">
              <p className="text-xs font-bold text-slate-300">{sheet}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Architecture</h3>
        <div className="text-xs text-slate-400 font-mono space-y-1 leading-relaxed">
          <p>Frontend → HTTPS fetch() → Google Apps Script → Google Sheets</p>
          <p>Backend: Google Apps Script (serverless, free)</p>
          <p>Database: Google Sheets (cloud, free, auto-backup)</p>
          <p>Hosting cost: ₹0</p>
        </div>
      </div>
    </div>
  );
};
