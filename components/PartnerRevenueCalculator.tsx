"use client";

import React, { useState } from "react";
import { DollarSign, TrendingUp, Download, Sparkles, PieChart, ArrowUpRight, ShieldCheck } from "lucide-react";

interface PartnerRevenueCalculatorProps {
  leads: any[];
}

export default function PartnerRevenueCalculator({ leads }: PartnerRevenueCalculatorProps) {
  const [activationsPerMonth, setActivationsPerMonth] = useState<number>(15);
  const [avgDealSize, setAvgDealSize] = useState<number>(4500);

  // Math
  const directFirstMonthPayout = activationsPerMonth * avgDealSize;
  const annualRecurringCommission = activationsPerMonth * avgDealSize * 12 * 0.15; // 15% trailing commission
  const totalProjectedAnnualEarnings = directFirstMonthPayout * 12 + annualRecurringCommission;

  const handleExportCSV = () => {
    if (!leads || leads.length === 0) return;

    const headers = [
      "Lead ID",
      "Business Name",
      "Contact Name",
      "Segment",
      "City",
      "GSTIN",
      "Udyam Number",
      "Monthly Spend (INR)",
      "Propensity Score",
      "Assigned Queue",
      "Routing Channel",
      "KYC Verdict",
      "Estimated Commission (INR)",
      "Stage Reached"
    ];

    const rows = leads.map((l) => [
      l.lead_id,
      `"${(l.business_name || "").replace(/"/g, '""')}"`,
      `"${(l.contact_name || "").replace(/"/g, '""')}"`,
      l.segment,
      l.city,
      l.gstin || "N/A",
      l.udyam_number || "N/A",
      l.monthly_bundle_value_inr || 0,
      l.total_score || 0,
      l.assigned_queue,
      l.routing_badge,
      l.kyc_verdict,
      l.estimated_commission || 0,
      l.stage_reached
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Airtel_SYNC_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-neutral-900 to-black text-white p-6 rounded-3xl border border-indigo-900/50 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/40 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base tracking-tight text-white">
              Channel Partner Earning &amp; Commission Model
            </h3>
            <p className="text-xs text-neutral-400">
              Interactive revenue projection for Airtel Authorized MSME Connectivity Partners
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export All Leads (CSV)</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slider 1: Monthly Activations */}
        <div className="space-y-2 bg-neutral-800/40 p-4 rounded-2xl border border-neutral-700/50">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-neutral-300">Monthly Bundle Activations</span>
            <span className="font-black text-base text-indigo-400">{activationsPerMonth} businesses/mo</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            value={activationsPerMonth}
            onChange={(e) => setActivationsPerMonth(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-2 bg-neutral-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>1 / mo</span>
            <span>25 / mo</span>
            <span>50 / mo</span>
          </div>
        </div>

        {/* Slider 2: Average Deal Size */}
        <div className="space-y-2 bg-neutral-800/40 p-4 rounded-2xl border border-neutral-700/50">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-neutral-300">Average Monthly Recurring Revenue</span>
            <span className="font-black text-base text-emerald-400">₹{avgDealSize.toLocaleString("en-IN")}/mo</span>
          </div>
          <input
            type="range"
            min={1500}
            max={15000}
            step={500}
            value={avgDealSize}
            onChange={(e) => setAvgDealSize(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-700 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
            <span>₹1,500</span>
            <span>₹8,000</span>
            <span>₹15,000</span>
          </div>
        </div>
      </div>

      {/* Computed Payout Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-800/80 p-4 rounded-2xl border border-neutral-700">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
            1st Month Direct Payout (100% MRC)
          </span>
          <p className="text-xl font-black text-white mt-1">
            ₹{directFirstMonthPayout.toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-emerald-400 mt-0.5 block">Immediate cash flow upon activation</span>
        </div>

        <div className="bg-neutral-800/80 p-4 rounded-2xl border border-neutral-700">
          <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
            15% Trailing Annual Royalty
          </span>
          <p className="text-xl font-black text-indigo-400 mt-1">
            ₹{Math.round(annualRecurringCommission).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-neutral-400 mt-0.5 block">Compounded over 24-month tenure</span>
        </div>

        <div className="bg-gradient-to-tr from-indigo-900 to-indigo-700 p-4 rounded-2xl border border-indigo-500 shadow-md">
          <span className="text-[10px] uppercase font-bold text-indigo-200 block tracking-wider">
            Total Year-1 Partner Revenue
          </span>
          <p className="text-2xl font-black text-white mt-1">
            ₹{Math.round(totalProjectedAnnualEarnings).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-emerald-300 font-bold mt-0.5 block">
            Annual Recurring Value (ARR)
          </span>
        </div>
      </div>
    </div>
  );
}
