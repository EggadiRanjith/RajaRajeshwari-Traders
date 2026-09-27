import React, { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Sale } from '../types/index';
import { Printer, Copy, Check, MessageSquare, Download } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, sale }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    } catch (e) {
      console.warn('Print not supported in current frame:', e);
    }
  };

  const handleCopyWhatsApp = async () => {
    const text = `*RAJARAJESHWARI TRADERS* 🌾
Retail Produce & Mandi Traders
Bill No: *${sale.id}*
Date: ${sale.date} ${sale.time || ''}
Buyer: ${sale.buyer || 'Walk-in'}
------------------------------
Item: *${sale.productName}*
Qty: *${sale.quantityKg} KG* @ ₹${sale.sellingRate.toFixed(2)}/KG
Total Amount: *₹${sale.revenue.toFixed(2)}*
Payment: ${sale.paymentMethod} (${sale.paymentStatus})
------------------------------
Thank you for your business! 🙏`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2500);
    } catch {
      setCopiedWhatsapp(true);
      setTimeout(() => setCopiedWhatsapp(false), 2500);
    }
  };

  const handleDownloadReceipt = () => {
    const text = `RAJARAJESHWARI TRADERS
Retail Produce & Mandi Traders
APMC Yard
----------------------------------------
Bill No:    ${sale.id}
Date/Time:  ${sale.date} ${sale.time || ''}
Buyer:      ${sale.buyer || 'Walk-in'}
Payment:    ${sale.paymentMethod} (${sale.paymentStatus})
----------------------------------------
ITEM            QTY (KG)   RATE     AMOUNT
${sale.productName.padEnd(15)} ${String(sale.quantityKg).padEnd(10)} ₹${sale.sellingRate.toFixed(2).padEnd(8)} ₹${sale.revenue.toFixed(2)}
----------------------------------------
NET TOTAL:  ₹${sale.revenue.toFixed(2)}
----------------------------------------
Thank you for your business!`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${sale.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sale Bill Receipt" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Printable thermal receipt layout */}
        <div
          ref={receiptRef}
          className="p-5 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-800 text-xs font-mono select-none shadow-sm"
        >
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight font-sans">
              RAJARAJESHWARI TRADERS
            </h2>
            <p className="text-[11px] text-slate-600 font-sans">Retail Produce & Mandi Traders</p>
            <p className="text-[10px] text-slate-500 font-sans">APMC Yard Market • Cash / UPI / Khata</p>
          </div>

          {/* Meta */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Bill No:</span>
              <span className="font-bold text-slate-900 font-mono">{sale.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date/Time:</span>
              <span>{sale.date} {sale.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Buyer:</span>
              <span className="font-semibold text-slate-900">{sale.buyer || 'Walk-in'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment:</span>
              <span className="font-semibold">{sale.paymentMethod} ({sale.paymentStatus})</span>
            </div>
          </div>

          {/* Items */}
          <div className="py-2.5 border-b border-dashed border-slate-300">
            <div className="flex justify-between font-bold text-slate-900 pb-1">
              <span>Item Description</span>
              <span>Amount</span>
            </div>
            <div className="flex justify-between py-1 text-slate-700">
              <div>
                <p className="font-semibold text-slate-900">{sale.productName}</p>
                <p className="text-[10px] text-slate-500">
                  {sale.quantityKg} KG × ₹{sale.sellingRate.toFixed(2)}
                </p>
              </div>
              <p className="font-bold text-slate-900 font-mono">₹{sale.revenue.toFixed(2)}</p>
            </div>
          </div>

          {/* Total */}
          <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1">
            <div className="flex justify-between text-sm font-extrabold text-slate-900">
              <span>NET TOTAL:</span>
              <span className="font-mono text-emerald-800">₹{sale.revenue.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-3 text-[10px] text-slate-500 space-y-0.5 font-sans">
            <p className="font-medium">Thank you for your business!</p>
            <p className="text-[9px] text-slate-400">RajaRajeshwari Traders Google Sheets Engine</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 cursor-pointer transition-all"
          >
            {copiedWhatsapp ? <Check className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            <span>{copiedWhatsapp ? 'Copied WhatsApp Text!' : 'Share WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Download Slip</span>
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handlePrint}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Browser Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
