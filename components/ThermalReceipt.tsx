"use client";

import React, { useRef } from "react";
import { Printer, Download, CheckCircle2, ShieldCheck, QrCode } from "lucide-react";

interface ThermalReceiptProps {
  quote: any;
  businessSlots?: any;
  businessName?: string;
}

export default function ThermalReceipt({
  quote,
  businessSlots,
  businessName = "Neelgiri Physio Clinic"
}: ThermalReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!quote || !quote.pricing) return null;

  const handlePrint = () => {
    window.print();
  };

  const invoiceNo = `INV-AIR-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const nowStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  return (
    <div className="bg-neutral-100 p-4 sm:p-6 rounded-3xl border border-neutral-300 flex flex-col items-center">
      {/* Action Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-3 text-xs font-bold text-neutral-600">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Statutory Tax Invoice Preview (SAC 998422)</span>
        </span>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg shadow-2xs transition-all active:scale-95"
        >
          <Printer className="w-3.5 h-3.5 text-[#E40000]" />
          <span>Print / PDF</span>
        </button>
      </div>

      {/* Realistic Thermal Receipt Slip */}
      <div
        ref={receiptRef}
        className="w-full max-w-md bg-white text-neutral-800 font-mono text-[11px] p-6 shadow-xl border border-neutral-200 relative select-text"
        style={{
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)"
        }}
      >
        {/* Jagged top perforations */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-neutral-100 flex overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-2 bg-white flex-shrink-0"
              style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="text-center pt-2 pb-3 border-b border-dashed border-neutral-300">
          <h2 className="font-black text-sm tracking-widest uppercase text-black">
            BHARTI AIRTEL LIMITED
          </h2>
          <p className="text-[10px] text-neutral-600">Enterprise MSME Digital Services</p>
          <p className="text-[9px] text-neutral-500">GSTIN: 07AABCB2648H1Z8 • SAC: 998422</p>
          <p className="text-[9px] text-neutral-500">Airtel Centre, Cyber City, Gurugram, HR</p>
        </div>

        {/* Invoice Metadata */}
        <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-0.5 text-[10px]">
          <div className="flex justify-between">
            <span className="text-neutral-500">INVOICE NO:</span>
            <span className="font-bold">{invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">DATE:</span>
            <span>{nowStr}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">BILLED TO:</span>
            <span className="font-bold truncate max-w-[200px]">{businessName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">TENURE / CYCLE:</span>
            <span>{quote.contract_tenure_months || 24} Mo • {quote.billing_cycle_date || "1st of Month"}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="py-3 border-b border-dashed border-neutral-300 space-y-1.5">
          <div className="flex justify-between font-bold text-[10px] text-neutral-500 border-b border-neutral-200 pb-1">
            <span>ITEM &amp; QTY</span>
            <span>RATE</span>
            <span>AMOUNT</span>
          </div>

          {(quote.items || []).map((it: any, idx: number) => (
            <div key={idx} className="flex justify-between items-start text-[10px]">
              <div className="flex-1 pr-2">
                <p className="font-bold text-neutral-900 leading-tight">{it.product_name}</p>
                <p className="text-[9px] text-neutral-500">Qty: {it.quantity} x ₹{it.unit_mrc}</p>
              </div>
              <span className="font-bold text-right">₹{Number(it.total_mrc).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Totals & Tax Calculation */}
        <div className="py-2.5 space-y-1 text-[10px] border-b border-dashed border-neutral-300">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal Recurring Charge:</span>
            <span>₹{quote.pricing.subtotal_mrc?.toFixed(2)}</span>
          </div>

          {quote.pricing.bundle_discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Multi-Product Discount ({quote.pricing.bundle_discount_pct}%):</span>
              <span>-₹{quote.pricing.bundle_discount_amount?.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-neutral-600">
            <span>Net Taxable Value:</span>
            <span className="font-bold">₹{quote.pricing.net_mrc?.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-neutral-500 text-[9px]">
            <span>CGST @ 9%:</span>
            <span>₹{quote.pricing.cgst_9_pct?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-neutral-500 text-[9px]">
            <span>SGST @ 9%:</span>
            <span>₹{quote.pricing.sgst_9_pct?.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-neutral-600">
            <span>One-Time Installation Fee:</span>
            {quote.pricing.setup_fee_waived ? (
              <span className="font-bold text-emerald-700">₹0.00 (WAIVED)</span>
            ) : (
              <span>₹{quote.pricing.effective_setup_fee?.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Grand Total */}
        <div className="py-3 border-b-2 border-neutral-900 flex justify-between items-center">
          <div>
            <span className="font-black text-xs block text-black">MONTHLY BILL AMOUNT</span>
            <span className="text-[9px] text-neutral-500">Inclusive of all taxes</span>
          </div>
          <span className="font-black text-base text-[#E40000]">
            ₹{quote.pricing.total_monthly_bill?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Footer Guarantee & Barcode simulation */}
        <div className="pt-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-neutral-500">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Single Consolidated Bill • 99.5% Uptime SLA • Priority 1800-103-SYNC</span>
          </div>

          {/* Barcode visual */}
          <div className="py-1 flex justify-center">
            <div className="h-7 w-56 flex items-center justify-between px-2 bg-neutral-900 rounded-xs">
              <span className="text-[8px] text-white tracking-widest font-mono">
                *AIRTEL-SYNC-SAC998422*
              </span>
            </div>
          </div>
          <p className="text-[8px] text-neutral-400">Computer Generated Tax Invoice. No Physical Signature Required.</p>
        </div>

        {/* Jagged bottom perforations */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-neutral-100 flex overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-2 bg-white flex-shrink-0"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
