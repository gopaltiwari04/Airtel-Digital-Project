"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "../components/Navbar";
import CustomerPortal from "../components/CustomerPortal";
import BackOfficeConsole from "../components/BackOfficeConsole";
import { useAuth } from "../lib/auth";

function HomeContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<"customer" | "backoffice">("customer");
  const [customerStep, setCustomerStep] = useState<number>(1);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "backoffice" || viewParam === "customer") {
      setActiveView(viewParam);
    } else if (user?.role === "partner" || user?.role === "admin") {
      setActiveView("backoffice");
    }
  }, [searchParams, user]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        customerStep={customerStep}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === "customer" ? (
          <CustomerPortal
            currentStep={customerStep}
            setCurrentStep={setCustomerStep}
          />
        ) : (
          <BackOfficeConsole />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-6 text-center text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-neutral-900">Airtel Business SYNC</span>
            <span>• Project Udyam Digital</span>
            <span className="text-[10px] bg-red-50 text-[#E40000] px-2 py-0.5 rounded-full border border-red-200 font-bold">
              Production Prototype
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Compliant with TRAI/DoT Telecom Regulations &amp; Digital Personal Data Protection (DPDP) Act, 2023.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs text-neutral-500">Loading Airtel Business SYNC...</div>}>
      <HomeContent />
    </Suspense>
  );
}
