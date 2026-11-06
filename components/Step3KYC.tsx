"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Search, Upload, FileText, ArrowRight, RefreshCw, Lock, ExternalLink, Image as ImageIcon, Scan } from "lucide-react";
import { verifyKYC, lookupRegistry, fetchSpecimens, fetchSpecimenDetail, API_BASE } from "../lib/api";
import DPDPConsentModal from "./DPDPConsentModal";
import LaserScanner from "./LaserScanner";

interface Step3KYCProps {
  quoteData: any;
  onKYCVerified: (verificationResult: any) => void;
}

export default function Step3KYC({ quoteData, onKYCVerified }: Step3KYCProps) {
  const [consentGranted, setConsentGranted] = useState<boolean>(false);
  const [consentData, setConsentData] = useState<any | null>(null);
  const [showConsentModal, setShowConsentModal] = useState<boolean>(true);

  const [specimens, setSpecimens] = useState<any[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<string>("K03");
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"specimens" | "custom">("specimens");
  const [customGstin, setCustomGstin] = useState<string>("");
  const [selectedDocPreview, setSelectedDocPreview] = useState<string>("gst_certificate");

  // Load specimen catalog
  useEffect(() => {
    fetchSpecimens()
      .then((data) => setSpecimens(data))
      .catch((err) => console.error("Failed to load specimens", err));
  }, []);

  // Run KYC verification whenever selected applicant changes
  useEffect(() => {
    if (!consentGranted) return;
    setLoading(true);
    verifyKYC(selectedApplicant)
      .then((data) => {
        setVerificationResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("KYC verification error:", err);
        setLoading(false);
      });
  }, [selectedApplicant, consentGranted]);

  const handleConsentApproved = (consent: any) => {
    setConsentData(consent);
    setConsentGranted(true);
    setShowConsentModal(false);
  };

  const handleCustomLookup = async () => {
    if (!customGstin.trim()) return;
    setLoading(true);
    try {
      const res = await lookupRegistry(customGstin);
      // Fallback custom verification
      const verifyRes = await verifyKYC(undefined, res);
      setVerificationResult(verifyRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    if (verdict === "GREEN") {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 rounded-full font-black text-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>GREEN (Auto-Approved)</span>
        </span>
      );
    } else if (verdict === "AMBER") {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-black text-xs">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>AMBER (Partner Review Required)</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-3 py-1 bg-red-50 text-red-700 border border-red-300 rounded-full font-black text-xs">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>RED (Discrepancy / Blocked)</span>
        </span>
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* DPDP Consent Modal */}
      <DPDPConsentModal
        isOpen={showConsentModal && !consentGranted}
        onConsentGranted={handleConsentApproved}
      />

      {/* Step Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">Step 3 of 4</span>
            <h2 className="text-lg font-extrabold text-gray-900">Smart KYC & Cross-Registry Verification</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Zero-latency cross-validation against mock GSTIN & Udyam databases with RapidFuzz token matching.
          </p>
        </div>

        {/* DPDP Consent Locked Badge */}
        {consentGranted && consentData && (
          <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-extrabold text-emerald-900 block leading-tight">DPDP Consent Locked</span>
              <span className="text-[10px] text-emerald-700 font-mono">{consentData.consent_id}</span>
            </div>
          </div>
        )}
      </div>

      {/* 1-Click Specimen KYC Selector (K01 to K12) */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-red-600" />
            <h3 className="font-extrabold text-sm text-gray-900">Pre-Computed Specimen Document Selector (K01 to K12)</h3>
          </div>
          <span className="text-xs text-gray-400">Deterministic Ground-Truth Audit Fixture (0 ms latency)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {specimens.map((sp) => {
            const isSelected = selectedApplicant === sp.applicant_id;
            const badgeColor =
              sp.verdict === "GREEN"
                ? "bg-emerald-500"
                : sp.verdict === "AMBER"
                ? "bg-amber-500"
                : "bg-red-500";

            return (
              <button
                key={sp.applicant_id}
                onClick={() => setSelectedApplicant(sp.applicant_id)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "border-red-600 bg-red-50/30 shadow-md ring-2 ring-red-500/20"
                    : "border-gray-200 bg-gray-50/60 hover:bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-gray-900">{sp.applicant_id}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${badgeColor}`} />
                </div>
                <p className="text-[11px] font-bold text-gray-800 truncate mt-1">{sp.business_name}</p>
                <span className="text-[10px] text-gray-500 block truncate">
                  {sp.verdict === "GREEN" ? "Auto-approve" : sp.verdict === "AMBER" ? "Partner review" : "Discrepancy"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Verification Scorecard & Registry Cards */}
      {verificationResult && (
        <div className="space-y-6">
          
          {/* Top Scorecard Verdict Card */}
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                  Verification Scorecard Classification
                </span>
                <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                  Applicant {verificationResult.applicant_id}: {verificationResult.description}
                </h3>
                <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Workflow Path: {verificationResult.workflow_path}
                </span>
              </div>

              <div>{getVerdictBadge(verificationResult.scorecard.verdict)}</div>
            </div>

            {/* Flags list if any */}
            {verificationResult.scorecard.flags.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl text-xs space-y-1">
                <span className="font-bold text-red-900 block">Flagged Discrepancies & Audit Issues:</span>
                {verificationResult.scorecard.flags.map((fl: string, idx: number) => (
                  <p key={idx} className="text-red-700 flex items-center space-x-1.5 font-medium">
                    <XCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                    <span>{fl}</span>
                  </p>
                ))}
              </div>
            )}

            {/* 4 Automated Checks Summary Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {[
                { title: "1. Completeness Check", status: verificationResult.checks.completeness.status, detail: verificationResult.checks.completeness.details },
                { title: "2. Registry Status Check", status: verificationResult.checks.registry_status.status, detail: `GSTIN: ${verificationResult.checks.registry_status.gstin_status || 'N/A'}` },
                { title: "3. Entity & Signatory Fuzzy", status: verificationResult.checks.entity_fuzzy_match.status, detail: `${verificationResult.checks.entity_fuzzy_match.trade_name_similarity || 90}% Token Similarity` },
                { title: "4. Address & Recency Align", status: verificationResult.checks.address_alignment.status, detail: `Bill Age: ${verificationResult.checks.address_alignment.days_old || 15} days (<= 90)` }
              ].map((chk, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">{chk.title}</span>
                    <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${
                      chk.status === "PASS" ? "bg-emerald-100 text-emerald-800" : (chk.status === "WARN" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")
                    }`}>
                      {chk.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">{chk.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Side-by-Side Diff Scorecard Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-gray-900">Side-by-Side Diff Table (OCR Extraction vs Registry Records)</h3>
              <span className="text-xs text-gray-500">Cross-Join Match Results</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100/70 text-gray-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Verification Field</th>
                    <th className="py-3 px-4">OCR Extracted Value</th>
                    <th className="py-3 px-4">Official Registry Record</th>
                    <th className="py-3 px-4 text-center">Score / Match</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {verificationResult.scorecard.field_diffs.map((diff: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-4 font-bold text-gray-900">{diff.field}</td>
                      <td className="py-3 px-4 font-mono text-gray-700 max-w-xs truncate">{diff.ocr || 'N/A'}</td>
                      <td className="py-3 px-4 font-mono text-gray-700 max-w-xs truncate">{diff.registry || 'N/A'}</td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-600">
                        {diff.score ? `${diff.score}%` : (diff.match ? '100%' : 'Mismatch')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                          diff.match ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        }`}>
                          {diff.match ? "Match" : "Diff"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Specimen Documents Image Viewer */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-gray-900">Specimen Document Visual Inspector</h3>
              </div>
              
              {/* Document Tabs */}
              <div className="flex bg-gray-100 p-1 rounded-xl text-xs">
                {[
                  { key: "gst_certificate", label: "GST Certificate" },
                  { key: "udyam_certificate", label: "Udyam Certificate" },
                  { key: "address_proof", label: "Electricity Bill" },
                  { key: "signatory_id", label: "Signatory ID" }
                ].map((docTab) => (
                  <button
                    key={docTab.key}
                    onClick={() => setSelectedDocPreview(docTab.key)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      selectedDocPreview === docTab.key
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {docTab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Document with Laser Scanner */}
            <LaserScanner
              imageSrc={`/specimens/${selectedApplicant}_${selectedDocPreview}.png`}
              applicantId={selectedApplicant}
              docType={selectedDocPreview}
              verdict={verificationResult.scorecard.verdict}
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-500">
              {verificationResult.scorecard.verdict === "GREEN" && (
                <span className="text-emerald-700 font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-4 h-4" /> <span>Auto-approval unlocked. Immediate provisioning ready.</span>
                </span>
              )}
              {verificationResult.scorecard.verdict === "AMBER" && (
                <span className="text-amber-800 font-bold flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" /> <span>Routed to Assisted Partner queue. Local partner override enabled.</span>
                </span>
              )}
              {verificationResult.scorecard.verdict === "RED" && (
                <span className="text-red-700 font-bold flex items-center space-x-1">
                  <XCircle className="w-4 h-4" /> <span>Hard discrepancy detected. Action required by customer/support.</span>
                </span>
              )}
            </div>

            <button
              onClick={() => onKYCVerified(verificationResult)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg active:scale-95 transition-all flex items-center space-x-2"
            >
              <span>Confirm Verification & Launch Order Tracker</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}
