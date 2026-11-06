"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Zap, Plus, Minus, ArrowRight, FileText, ChevronDown, ChevronUp, Clock, Check, Receipt } from "lucide-react";
import { calculateQuote } from "../lib/api";
import ThermalReceipt from "./ThermalReceipt";

interface Step2QuoteProps {
  initialQuote: any;
  businessSlots: any;
  onProceedToKYC: (finalQuoteData: any) => void;
}

export default function Step2Quote({ initialQuote, businessSlots, onProceedToKYC }: Step2QuoteProps) {
  const [selectedTier, setSelectedTier] = useState<string>("Growth");
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [activeItems, setActiveItems] = useState<Array<{ product_id: string; quantity: number }>>([]);
  const [computedQuote, setComputedQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [billDrawerOpen, setBillDrawerOpen] = useState<boolean>(true);
  const [showThermalReceipt, setShowThermalReceipt] = useState<boolean>(false);

  // Sync initial items when tier or initialQuote changes
  useEffect(() => {
    if (initialQuote && initialQuote.tiers) {
      const tierKey = selectedTier.toLowerCase();
      const tierObj = initialQuote.tiers[tierKey];
      if (tierObj && tierObj.items) {
        const items = tierObj.items.map((it: any) => ({
          product_id: it.product_id,
          quantity: it.quantity
        }));
        setActiveItems(items);
      }
    } else {
      // Default Growth bundle fallback
      setActiveItems([
        { product_id: "P01", quantity: 1 },
        { product_id: "P07", quantity: 4 },
        { product_id: "P15", quantity: 1 },
        { product_id: "P19", quantity: 1 }
      ]);
    }
  }, [selectedTier, initialQuote]);

  // Recalculate quote whenever items or tenure change
  useEffect(() => {
    if (activeItems.length === 0) return;
    setLoading(true);
    calculateQuote(activeItems, tenureMonths)
      .then((res) => {
        setComputedQuote(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Quote recalculation error:", err);
        setLoading(false);
      });
  }, [activeItems, tenureMonths]);

  const updateItemQty = (productId: string, delta: number) => {
    setActiveItems((prev) => {
      const existing = prev.find((x) => x.product_id === productId);
      if (existing) {
        const newQty = Math.max(0, existing.quantity + delta);
        if (newQty === 0) {
          return prev.filter((x) => x.product_id !== productId);
        }
        return prev.map((x) => (x.product_id === productId ? { ...x, quantity: newQty } : x));
      } else if (delta > 0) {
        return [...prev, { product_id: productId, quantity: delta }];
      }
      return prev;
    });
  };

  const hasProduct = (productId: string) => {
    return activeItems.some((x) => x.product_id === productId && x.quantity > 0);
  };

  const getProductQty = (productId: string) => {
    return activeItems.find((x) => x.product_id === productId)?.quantity || 0;
  };

  const addOnOptions = [
    { id: "P07", name: "Add Business Postpaid SIMs (30GB + Unlimited Calls)", rate: 299, category: "SIMs" },
    { id: "P11", name: "Static IP Address (Essential for Tally / ERP)", rate: 200, category: "IP" },
    { id: "P16", name: "Cloud Email & Microsoft 365 / Workspace Seat", rate: 125, category: "Cloud" },
    { id: "P17", name: "Cloud Backup 1 TB (Encrypted Tally Storage)", rate: 499, category: "Storage" },
    { id: "P20", name: "Endpoint Cybersecurity License (Anti-Ransomware)", rate: 99, category: "Security" },
    { id: "P23", name: "Cloud CCTV AI Surveillance Stream", rate: 199, category: "IoT" }
  ];

  return (
    <div className="space-y-6">
      
      {/* Step Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">Step 2 of 4</span>
            <h2 className="text-lg font-extrabold text-gray-900">Interactive Quote & Single-Bill Configurator</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Choose your recommended tier, toggle enterprise add-ons, and review your unified single monthly bill.
          </p>
        </div>

        {/* Tenure Switcher */}
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-xl">
          <span className="text-[11px] text-gray-500 font-bold px-2">Contract Tenure:</span>
          {[
            { months: 12, label: "12 Mo" },
            { months: 24, label: "24 Mo (₹0 Setup!)" },
            { months: 36, label: "36 Mo (-5% Extra)" }
          ].map((t) => (
            <button
              key={t.months}
              onClick={() => setTenureMonths(t.months)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tenureMonths === t.months
                  ? "bg-red-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3 Tier Recommendation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { key: "Starter", title: "Starter Bundle", desc: "Core broadband & business SIMs", price: "₹1,597" },
          { key: "Growth", title: "Growth Bundle", desc: "High-speed fiber + SIMs + WhatsApp API", price: "₹3,196", recommended: true },
          { key: "Pro", title: "Pro Enterprise", desc: "Dedicated fiber + Static IP + Cloud CCTV + SLA", price: "₹6,890" }
        ].map((tier) => {
          const isSelected = selectedTier === tier.key;
          return (
            <div
              key={tier.key}
              onClick={() => setSelectedTier(tier.key)}
              className={`relative rounded-2xl p-5 cursor-pointer transition-all border-2 ${
                isSelected
                  ? "border-red-600 bg-red-50/20 shadow-md ring-2 ring-red-500/20"
                  : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
              }`}
            >
              {tier.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider shadow">
                  Recommended For You
                </span>
              )}

              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-gray-900">{tier.title}</h3>
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-red-600 bg-red-600 text-white" : "border-gray-300"}`}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-1">{tier.desc}</p>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-baseline space-x-1">
                <span className="text-2xl font-black text-gray-900">{tier.price}</span>
                <span className="text-xs text-gray-500">/ month + GST</span>
              </div>

              <div className="mt-3 flex items-center space-x-1 text-[11px] text-emerald-600 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Single Monthly Consolidated Bill</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add-ons & Additions Selector */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900">Custom Add-Ons & Capacity Scaling</h3>
            <p className="text-xs text-gray-500">Toggle additional SIMs, Cloud Storage seats, Static IP, or Cybersecurity</p>
          </div>
          <span className="text-xs font-bold text-red-600">Calculated in Python • No Price Hallucination</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {addOnOptions.map((opt) => {
            const qty = getProductQty(opt.id);
            const active = qty > 0;
            return (
              <div
                key={opt.id}
                className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  active ? "border-red-300 bg-red-50/30" : "border-gray-200 bg-gray-50/50"
                }`}
              >
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{opt.category}</span>
                  <h4 className="text-xs font-bold text-gray-900">{opt.name}</h4>
                  <p className="text-xs text-gray-500 font-medium">₹{opt.rate}/mo per unit</p>
                </div>

                <div className="flex items-center space-x-2">
                  {active ? (
                    <div className="flex items-center space-x-1.5 bg-white border border-gray-300 rounded-lg p-1 shadow-sm">
                      <button
                        onClick={() => updateItemQty(opt.id, -1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold px-1 text-gray-900">{qty}</span>
                      <button
                        onClick={() => updateItemQty(opt.id, 1)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => updateItemQty(opt.id, 1)}
                      className="px-2.5 py-1 text-xs font-bold bg-white border border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-600 rounded-lg shadow-sm transition-all flex items-center space-x-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Single Monthly Bill Live Preview Drawer */}
      {computedQuote && (
        <div className="bg-white rounded-2xl border-2 border-gray-300 shadow-lg overflow-hidden">
          <div
            onClick={() => setBillDrawerOpen(!billDrawerOpen)}
            className="bg-gray-900 text-white p-4 flex items-center justify-between cursor-pointer hover:bg-black transition-all"
          >
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="font-extrabold text-sm tracking-wide">Unified Single Monthly Bill Preview</h3>
                <p className="text-[11px] text-gray-400">
                  Single Billing Cycle Date: {computedQuote.billing_cycle_date} • 99.5% SLA
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-xs text-gray-400 block">Monthly Total (incl. GST)</span>
                <span className="text-lg font-black text-emerald-400">
                  ₹{computedQuote.pricing.subsequent_monthly_bill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {billDrawerOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>

          {billDrawerOpen && (
            <div className="p-6 bg-white space-y-4">
              {/* Receipt / Table Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setShowThermalReceipt(false)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      !showThermalReceipt ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    Itemized Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowThermalReceipt(true)}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                      showThermalReceipt ? "bg-white text-[#E40000] shadow-sm" : "text-gray-500 hover:text-gray-900"
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Printable Tax Invoice Slip</span>
                  </button>
                </div>

                <span className="text-xs text-gray-500 hidden sm:inline">
                  SAC Code: <strong>998422</strong> • GST: <strong>18% (9% CGST + 9% SGST)</strong>
                </span>
              </div>

              {showThermalReceipt ? (
                <ThermalReceipt
                  quote={computedQuote}
                  businessSlots={businessSlots}
                  businessName={businessSlots?.business_name || "Enterprise MSME Customer"}
                />
              ) : (
                <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product / Service</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-right">Monthly Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {computedQuote.items.map((it: any) => (
                      <tr key={it.product_id} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">
                          {it.product_name}
                          {it.requires_gstin && (
                            <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Requires GSTIN
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500">{it.category}</td>
                        <td className="py-2.5 px-3 text-center font-semibold">{it.quantity}</td>
                        <td className="py-2.5 px-3 text-right text-gray-500">₹{it.unit_mrc}</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-gray-900">₹{it.total_mrc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Discount Breakdown */}
              <div className="pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                
                {/* SLA terms */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-200">
                  <h4 className="font-bold text-gray-900 text-xs">Consolidated SLA & Guarantee Terms:</h4>
                  <ul className="space-y-1.5 text-gray-600">
                    <li className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Uptime Guarantee: <strong>{computedQuote.sla.uptime_guarantee}</strong> with financial credits</span>
                    </li>
                    <li className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>MTTR (Mean Time to Restore): <strong>4 Hours</strong> dedicated dispatch</span>
                    </li>
                    <li className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Single Consolidated Invoice Date: <strong>1st of every month</strong></span>
                    </li>
                  </ul>
                </div>

                {/* Calculation summary */}
                <div className="space-y-2 text-right">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal Recurring Charge:</span>
                    <span className="font-bold">₹{computedQuote.pricing.subtotal_mrc.toFixed(2)}</span>
                  </div>

                  {computedQuote.pricing.bundle_discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Multi-Product Bundle Discount ({computedQuote.pricing.bundle_discount_pct}%):</span>
                      <span className="font-bold">-₹{computedQuote.pricing.bundle_discount_amount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Net Monthly Charge:</span>
                    <span className="font-extrabold text-gray-900">₹{computedQuote.pricing.net_mrc.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-gray-500 text-[11px]">
                    <span>Itemized GST (18% - CGST 9% + SGST 9%):</span>
                    <span>₹{computedQuote.pricing.total_gst_18_pct.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-gray-600">
                    <span>One-time Setup Fee:</span>
                    {computedQuote.pricing.setup_fee_waived ? (
                      <span className="font-bold text-emerald-600">
                        <span className="line-through text-gray-400 mr-1.5">₹{computedQuote.pricing.original_setup_fee.toFixed(2)}</span>
                        ₹0.00 (Waived for 24+ Mo Tenure)
                      </span>
                    ) : (
                      <span className="font-bold">₹{computedQuote.pricing.effective_setup_fee.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-300 flex justify-between text-sm">
                    <span className="font-black text-gray-900">Total Monthly Recurring Bill:</span>
                    <span className="font-black text-base text-red-600">
                      ₹{computedQuote.pricing.subsequent_monthly_bill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>
              </>
              )}

              {/* Action CTA */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  onClick={() => onProceedToKYC(computedQuote)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-2"
                >
                  <span>Accept Quote & Proceed to Smart KYC</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
