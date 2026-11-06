"use client";

import React, { useState } from "react";
import { MessageSquare, Calculator, ShieldCheck, Truck, CheckCircle2 } from "lucide-react";
import Step1Discovery from "./Step1Discovery";
import Step2Quote from "./Step2Quote";
import Step3KYC from "./Step3KYC";
import Step4Tracker from "./Step4Tracker";
import { createOrder } from "../lib/api";

interface CustomerPortalProps {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}

export default function CustomerPortal({ currentStep, setCurrentStep }: CustomerPortalProps) {
  const [quoteData, setQuoteData] = useState<any | null>(null);
  const [businessSlots, setBusinessSlots] = useState<any>({});
  const [verifiedKYC, setVerifiedKYC] = useState<any | null>(null);
  const [orderTrackerData, setOrderTrackerData] = useState<any | null>(null);

  const steps = [
    { num: 1, title: "1. Needs Discovery", icon: MessageSquare, desc: "AI Advisor & WhatsApp Simulator" },
    { num: 2, title: "2. Quote & Single Bill", icon: Calculator, desc: "Add-ons, Tenures, & Invoicing" },
    { num: 3, title: "3. Smart KYC", icon: ShieldCheck, desc: "DPDP Consent & Cross-Registry Verification" },
    { num: 4, title: "4. Live Tracker", icon: Truck, desc: "5-Stage Provisioning & Scheduling" },
  ];

  const handleQuoteGenerated = (quote: any, slots: any) => {
    setQuoteData(quote);
    setBusinessSlots(slots);
    setCurrentStep(2);
  };

  const handleProceedToKYC = (finalQuote: any) => {
    setQuoteData(finalQuote);
    setCurrentStep(3);
  };

  const handleKYCVerified = async (kycResult: any) => {
    setVerifiedKYC(kycResult);
    // Create live order on backend
    try {
      const order = await createOrder({
        customer_name: kycResult.documents?.signatory_id?.signatory_name || "Neha Kaur",
        business_name: kycResult.documents?.gst_certificate?.trade_name || kycResult.documents?.address_proof?.trade_name || "Vindhya Tours & Travels",
        bundle_name: quoteData?.recommended_tier ? `${quoteData.recommended_tier} Bundle` : "Growth Bundle (300 Mbps + 4 SIMs + WhatsApp API)",
        contract_tenure_months: quoteData?.contract_tenure_months || 24,
        monthly_recurring_charge: quoteData?.pricing?.net_mrc || 3196.0,
        one_time_setup_fee: quoteData?.pricing?.effective_setup_fee || 0.0,
        gst_amount: quoteData?.pricing?.total_gst_18_pct || 575.28,
        total_monthly_bill: quoteData?.pricing?.subsequent_monthly_bill || 3771.28,
        installation_address: kycResult.documents?.address_proof?.address || "Shop/Unit 1, Tech Park Road, Visakhapatnam, Andhra Pradesh - 118383"
      });
      setOrderTrackerData(order);
    } catch (err) {
      console.error("Order creation fallback:", err);
    }
    setCurrentStep(4);
  };

  return (
    <div className="space-y-6">
      
      {/* 4-Step Stepper Navigation Header */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {steps.map((st) => {
            const isCurrent = currentStep === st.num;
            const isCompleted = currentStep > st.num;
            const Icon = st.icon;

            return (
              <button
                key={st.num}
                onClick={() => setCurrentStep(st.num)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center space-x-3 ${
                  isCurrent
                    ? "border-red-600 bg-red-50/50 shadow-sm ring-1 ring-red-500"
                    : isCompleted
                    ? "border-emerald-300 bg-emerald-50/20 hover:border-emerald-400"
                    : "border-gray-200 bg-gray-50/40 opacity-70 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isCurrent
                      ? "bg-red-600 text-white shadow"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>

                <div className="min-w-0">
                  <h4 className={`text-xs font-black truncate ${isCurrent ? "text-red-700" : (isCompleted ? "text-emerald-800" : "text-gray-700")}`}>
                    {st.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 truncate">{st.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step View Content */}
      {currentStep === 1 && <Step1Discovery onQuoteGenerated={handleQuoteGenerated} />}
      {currentStep === 2 && <Step2Quote initialQuote={quoteData} businessSlots={businessSlots} onProceedToKYC={handleProceedToKYC} />}
      {currentStep === 3 && <Step3KYC quoteData={quoteData} onKYCVerified={handleKYCVerified} />}
      {currentStep === 4 && <Step4Tracker initialData={orderTrackerData} />}

    </div>
  );
}
