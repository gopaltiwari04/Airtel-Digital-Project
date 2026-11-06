"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, Database, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { recordDPDPConsent } from "../lib/api";

interface DPDPConsentModalProps {
  isOpen: boolean;
  onConsentGranted: (consentData: any) => void;
  defaultPhone?: string;
}

export default function DPDPConsentModal({
  isOpen,
  onConsentGranted,
  defaultPhone = "9876543210"
}: DPDPConsentModalProps) {
  const [phone, setPhone] = useState<string>(defaultPhone);
  const [lang, setLang] = useState<string>("en");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGrant = async () => {
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const consent = await recordDPDPConsent(phone, lang);
      onConsentGranted(consent);
    } catch (err: any) {
      setError(err.message || "Failed to record consent artifact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-snug">Digital Personal Data Protection (DPDP) Act, 2023</h3>
              <p className="text-xs text-red-100">Statutory Consent & Purpose Limitation Notice</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm text-gray-700">
          <p className="text-xs leading-relaxed text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-200">
            Airtel Business adheres strictly to the <strong>Digital Personal Data Protection Act, 2023</strong> and Department of Telecommunications (DoT) KYC compliance regulations.
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Database className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-gray-900">Purpose Specification (TRAI / DoT)</h4>
                <p className="text-xs text-gray-500">
                  Data collected (GSTIN, Udyam registration, utility bill, signatory identity) will be used solely for telecom circuit provisioning, static IP allocation, and statutory subscriber verification.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-gray-900">Domestic Encryption & Masking</h4>
                <p className="text-xs text-gray-500">
                  Stored exclusively in Tier-4 domestic data centers across India with AES-256 encryption. PAN and national ID numbers are automatically masked in back-office audit views.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-xs text-gray-900">Retention & Deletion Policy</h4>
                <p className="text-xs text-gray-500">
                  Retained for the duration of active service plus the mandatory 2-year TRAI audit period, after which all document specimen files are irreversibly purged.
                </p>
              </div>
            </div>
          </div>

          {/* Identifier Input */}
          <div className="pt-2 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Authorized Signatory Mobile Number
            </label>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 text-xs font-medium">
                +91
              </span>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* Language selector */}
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-gray-500">Notice Language:</span>
            <div className="flex space-x-2">
              {['en', 'hi', 'hinglish'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1 rounded text-xs font-medium uppercase ${
                    lang === l ? "bg-red-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-[11px] text-gray-500 flex items-center space-x-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Digital Audit Trail Recorded</span>
          </span>

          <button
            onClick={handleGrant}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all shadow-md flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? "Recording DPDP Consent..." : "Accept & Unlock Smart KYC"}
          </button>
        </div>

      </div>
    </div>
  );
}
