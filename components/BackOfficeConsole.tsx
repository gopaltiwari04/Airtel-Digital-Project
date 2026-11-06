"use client";

import React, { useState, useEffect } from "react";
import { Users, Search, Filter, TrendingUp, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, PhoneCall, FileText, ChevronRight, Check, X, Calculator } from "lucide-react";
import { fetchBackofficeLeads, fetchLeadCallScript, overrideLeadKYC } from "../lib/api";
import PartnerRevenueCalculator from "./PartnerRevenueCalculator";

export default function BackOfficeConsole() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [queueFilter, setQueueFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [callScript, setCallScript] = useState<any | null>(null);
  const [scriptLoading, setScriptLoading] = useState<boolean>(false);
  const [overrideNote, setOverrideNote] = useState<string>("");
  const [overrideSuccess, setOverrideSuccess] = useState<string | null>(null);

  const loadLeads = () => {
    setLoading(true);
    fetchBackofficeLeads(queueFilter === "ALL" ? undefined : queueFilter, undefined, search)
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load leads", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadLeads();
  }, [queueFilter, search]);

  const handleSelectLead = async (lead: any) => {
    setSelectedLead(lead);
    setScriptLoading(true);
    setOverrideSuccess(null);
    setOverrideNote("");
    try {
      const res = await fetchLeadCallScript(lead.lead_id);
      setCallScript(res.call_script);
    } catch (err) {
      console.error("Failed to load script", err);
    } finally {
      setScriptLoading(false);
    }
  };

  const handlePartnerOverride = async () => {
    if (!selectedLead || !overrideNote.trim()) return;
    try {
      const res = await overrideLeadKYC(selectedLead.lead_id, overrideNote);
      setOverrideSuccess(res.message);
      // update local lead
      setLeads((prev) =>
        prev.map((l) => (l.lead_id === selectedLead.lead_id ? { ...l, kyc_verdict: "GREEN", assigned_queue: "Self-Serve Digital" } : l))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics
  const totalLeads = leads.length;
  const highPropensity = leads.filter((l) => l.total_score >= 70).length;
  const partnerQueueCount = leads.filter((l) => l.assigned_queue === "Assisted Partner Queue").length;
  const totalCommission = leads.reduce((acc, curr) => acc + (curr.estimated_commission || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-black bg-indigo-100 text-indigo-700 rounded-full">
              Enterprise Sales & Partner Ops
            </span>
            <h2 className="text-xl font-extrabold text-gray-900">Back-Office & Channel Partner Console</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Propensity-ranked SMB leads with automated routing across Self-Serve, Assisted Partner, and Field Sales.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business or Lead ID..."
              className="pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Active Pipeline</span>
          <p className="text-2xl font-black text-gray-900 mt-1">{totalLeads}</p>
          <span className="text-[11px] text-gray-500">Across 4 MSME segments</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">High Propensity (Score &ge; 70)</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{highPropensity}</p>
          <span className="text-[11px] text-emerald-700 font-medium">Priority outreach candidates</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Assisted Partner Queue</span>
          <p className="text-2xl font-black text-amber-600 mt-1">{partnerQueueCount}</p>
          <span className="text-[11px] text-amber-700 font-medium">Amber KYC / checkout drop-offs</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Est. Partner Commission</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">₹{totalCommission.toLocaleString('en-IN')}</p>
          <span className="text-[11px] text-indigo-700 font-medium">100% of 1st month bundle value</span>
        </div>
      </div>

      {/* Interactive Partner Revenue & Commission Projection Model */}
      <PartnerRevenueCalculator leads={leads} />

      {/* Queue Tabs */}
      <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold max-w-fit border border-gray-200">
        {[
          { key: "ALL", label: "All Leads" },
          { key: "Self-Serve Digital", label: "Self-Serve Digital (Green KYC)" },
          { key: "Assisted Partner Queue", label: "Assisted Partner Queue (Amber / Drop-offs)" },
          { key: "Field Sales Queue", label: "Field Sales Queue (Multi-site / High Value)" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setQueueFilter(tab.key)}
            className={`px-4 py-2 rounded-lg transition-all ${
              queueFilter === tab.key ? "bg-white text-gray-900 shadow-sm font-black" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Propensity-Ranked Lead Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-500 font-extrabold uppercase text-[10px]">
              <tr>
                <th className="py-3 px-4">Propensity Score</th>
                <th className="py-3 px-4">Business & Lead ID</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Monthly Value</th>
                <th className="py-3 px-4">Funnel Stage</th>
                <th className="py-3 px-4 text-center">KYC Verdict</th>
                <th className="py-3 px-4">Assigned Queue & Channel</th>
                <th className="py-3 px-4 text-right">Commission</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((l: any) => {
                const score = l.total_score || 0;
                const scoreColor =
                  score >= 75
                    ? "bg-emerald-500"
                    : score >= 50
                    ? "bg-amber-500"
                    : "bg-gray-400";

                return (
                  <tr
                    key={l.lead_id}
                    onClick={() => handleSelectLead(l)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-all"
                  >
                    {/* Propensity Score with bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-sm text-gray-900 w-7">{score}</span>
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${scoreColor}`} style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    </td>

                    {/* Business Name */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{l.business_name}</div>
                      <span className="font-mono text-[10px] text-gray-400">{l.lead_id}</span>
                      {l.specimen_id && (
                        <span className="ml-1.5 px-1.5 py-0.2 bg-red-100 text-red-700 text-[9px] font-black rounded-full">
                          {l.specimen_id} Specimen
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4">
                      <div className="text-gray-800 font-medium">{l.contact_name || "N/A"}</div>
                      <span className="text-[10px] text-gray-500 capitalize">{l.city || "Tier 1"}</span>
                    </td>

                    {/* Monthly Value */}
                    <td className="py-3 px-4 font-black text-gray-900">
                      ₹{Number(l.monthly_bundle_value_inr || 3000).toLocaleString('en-IN')}
                    </td>

                    {/* Funnel Stage */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {l.stage_reached}
                      </span>
                    </td>

                    {/* KYC Verdict */}
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                        l.kyc_verdict === "GREEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : l.kyc_verdict === "AMBER"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {l.kyc_verdict}
                      </span>
                    </td>

                    {/* Assigned Channel */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-bold text-indigo-700 block">{l.assigned_queue}</span>
                      <span className="text-[10px] text-gray-500">Routing: {l.routing_badge}</span>
                    </td>

                    {/* Commission */}
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ₹{Number(l.estimated_commission || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button className="p-1 hover:bg-gray-200 rounded text-gray-500">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Exception & AI Call Script Drawer */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 overflow-y-auto space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">
                    Lead Intelligence & KYC Audit
                  </span>
                  <h3 className="text-lg font-black text-gray-900 mt-0.5">{selectedLead.business_name}</h3>
                  <p className="text-xs text-gray-500 font-mono">Lead ID: {selectedLead.lead_id}</p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lead Snapshot Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">Propensity Score</span>
                  <span className="text-base font-black text-gray-900">{selectedLead.total_score} / 100</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">Monthly Bundle Value</span>
                  <span className="text-base font-black text-indigo-700">₹{selectedLead.monthly_bundle_value_inr}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">Assigned Queue</span>
                  <span className="font-bold text-gray-800">{selectedLead.assigned_queue}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-gray-400 font-bold block text-[10px]">KYC Status</span>
                  <span className="font-bold text-emerald-700">{selectedLead.kyc_verdict}</span>
                </div>
              </div>

              {/* Exception Note if Amber / Red */}
              {selectedLead.drop_reason && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-amber-900 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Identified Discrepancy / Drop Reason:</span>
                  </span>
                  <p className="text-amber-800 pl-5 font-medium">{selectedLead.drop_reason}</p>
                </div>
              )}

              {/* AI-Generated Customer Follow-Up Call Script */}
              {scriptLoading ? (
                <div className="p-8 text-center text-xs text-gray-500">
                  Generating tailored call script...
                </div>
              ) : callScript ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    <h4 className="font-extrabold text-sm text-gray-900">AI-Generated Follow-Up Call Script</h4>
                    <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                      Persona Tailored
                    </span>
                  </div>

                  {/* Opening Pitch */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-1.5">
                    <span className="font-bold text-emerald-900 block text-[11px]">Recommended Opening Pitch:</span>
                    <p className="text-gray-800 italic leading-relaxed">"{callScript.opening_pitch}"</p>
                  </div>

                  {/* Talking points */}
                  <div className="space-y-2 text-xs">
                    <span className="font-bold text-gray-700 text-[11px] block">Key Talking Points:</span>
                    <ul className="space-y-1 text-gray-600 pl-2">
                      {callScript.talking_points?.map((tp: string, idx: number) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{tp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Objection Handling */}
                  {callScript.objection_handling && (
                    <div className="space-y-2 text-xs">
                      <span className="font-bold text-gray-700 text-[11px] block">Objection Handling Cues:</span>
                      <div className="space-y-2">
                        {Object.entries(callScript.objection_handling).map(([obj, resp]: any, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                            <span className="font-bold text-red-700 block">{obj}</span>
                            <p className="text-gray-700 mt-0.5">{resp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Partner Override Section (For Amber / Red cases) */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
                <span className="font-bold text-xs text-gray-900 block">Channel Partner Audit Override</span>
                <p className="text-[11px] text-gray-500">
                  If you have verified the customer's trade name or address proof out-of-band, log an audit note and override the discrepancy to move them to the provisioning queue.
                </p>

                <input
                  type="text"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="e.g., Verbally confirmed trade name match with owner via call"
                  className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                {overrideSuccess && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-[11px] font-bold">
                    {overrideSuccess}
                  </div>
                )}

                <button
                  onClick={handlePartnerOverride}
                  disabled={!overrideNote.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-all shadow-sm"
                >
                  Submit Partner Override & Approve
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
