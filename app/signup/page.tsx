"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Building2, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  User, 
  AlertCircle,
  HelpCircle,
  Search
} from "lucide-react";
import AirtelLogo from "@/components/AirtelLogo";
import { useAuth, UserProfile } from "@/lib/auth";
import { lookupRegistry } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { loginAsDemoUser } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState("");
  const [constitution, setConstitution] = useState("Proprietorship");
  const [identifierType, setIdentifierType] = useState<"gstin" | "udyam">("gstin");
  const [identifierValue, setIdentifierValue] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [registryMatch, setRegistryMatch] = useState<any>(null);

  // Step 2 Contact Details
  const [contactName, setContactName] = useState("");
  const [designation, setDesignation] = useState("Proprietor / Managing Partner");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  // Step 3 Address
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("New Delhi");
  const [pincode, setPincode] = useState("110001");
  const [serviceable, setServiceable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill specimen helper
  const handleQuickFill = (code: string) => {
    if (code === "K07") {
      setBusinessName("Neelgiri Physio Clinic");
      setConstitution("Proprietorship");
      setIdentifierType("gstin");
      setIdentifierValue("07CPCXN0398P1ZT");
      setContactName("Dr. Neha Banerjee");
      setMobile("9876543210");
      setEmail("neha.banerjee@neelgiriphysio.com");
      setAddress("B-42, Inner Circle, Connaught Place");
      setCity("New Delhi");
      setPincode("110001");
    } else if (code === "K02") {
      setBusinessName("Harmony Dental Care");
      setConstitution("Proprietorship");
      setIdentifierType("udyam");
      setIdentifierValue("UDYAM-WB-00-5053330");
      setContactName("Dr. Joydeep Chatterjee");
      setMobile("9830124567");
      setEmail("joydeep@harmonydental.in");
      setAddress("14/2 Park Street, 1st Floor");
      setCity("Kolkata");
      setPincode("700016");
    }
  };

  const handleRegistryCheck = async () => {
    if (!identifierValue) return;
    setLookupLoading(true);
    setError(null);
    try {
      const res = await lookupRegistry(
        identifierType === "gstin" ? identifierValue : undefined,
        identifierType === "udyam" ? identifierValue : undefined
      );
      if (res.gstin_found) {
        setRegistryMatch(res.gstin_record);
        if (!businessName) setBusinessName(res.gstin_record.legal_name || res.gstin_record.trade_name);
        if (res.gstin_record.city) setCity(res.gstin_record.city);
        if (res.gstin_record.pincode) setPincode(String(res.gstin_record.pincode));
      } else if (res.udyam_found) {
        setRegistryMatch(res.udyam_record);
        if (!businessName) setBusinessName(res.udyam_record.enterprise_name);
        if (res.udyam_record.city) setCity(res.udyam_record.city);
        if (res.udyam_record.pincode) setPincode(String(res.udyam_record.pincode));
      } else {
        setRegistryMatch(null);
        setError("Identifier verified as New Micro-Enterprise (unregistered on mock registry)");
      }
    } catch {
      setError("Lookup temporarily offline");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !contactName || !mobile) {
      setError("Please fill out all mandatory fields");
      return;
    }

    const newUser: UserProfile = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: contactName,
      mobile: mobile || "9876543210",
      email: email || `${mobile}@msme.in`,
      role: "customer",
      businessName: businessName,
      businessType: constitution,
      gstin: identifierType === "gstin" ? identifierValue : undefined,
      udyamNumber: identifierType === "udyam" ? identifierValue : undefined,
      city: city || "New Delhi",
      avatar: "https://images.unsplash.com/photo-1594824813583-097585040e3f?w=120"
    };

    loginAsDemoUser(newUser);
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-red-50/20 to-neutral-100 flex flex-col justify-between">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <AirtelLogo size="lg" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500 hidden sm:inline">Already registered?</span>
          <Link
            href="/login"
            className="font-bold text-[#E40000] hover:text-[#B30000] bg-white border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl shadow-xs transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        {/* Progress Tracker */}
        <div className="w-full max-w-xl mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-neutral-200 -z-0 -translate-y-1/2" />
            <div
              className="absolute top-1/2 left-0 h-1 bg-[#E40000] -z-0 -translate-y-1/2 transition-all duration-300"
              style={{ width: step === 1 ? "0%" : step === 2 ? "50%" : "100%" }}
            />

            {[
              { num: 1, label: "Business Entity" },
              { num: 2, label: "Authorized Signatory" },
              { num: 3, label: "Installation Site" }
            ].map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step >= s.num
                      ? "bg-[#E40000] text-white shadow-md shadow-red-500/30 scale-105"
                      : "bg-white border-2 border-neutral-300 text-neutral-400"
                  }`}
                >
                  {s.num}
                </div>
                <span className="text-[11px] font-bold text-neutral-700 mt-2">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-neutral-200/80 p-6 sm:p-8">
          {/* Quick preset filler */}
          <div className="mb-6 p-3 bg-neutral-50 rounded-2xl border border-neutral-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-600 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E40000]" />
              Quick fill test business:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill("K07")}
                className="px-2.5 py-1 bg-white border border-neutral-300 hover:border-red-300 rounded-lg font-bold text-neutral-700 hover:text-[#E40000] transition-colors"
              >
                K07 (Clinic)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill("K02")}
                className="px-2.5 py-1 bg-white border border-neutral-300 hover:border-red-300 rounded-lg font-bold text-neutral-700 hover:text-[#E40000] transition-colors"
              >
                K02 (Micro Udyam)
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: BUSINESS ENTITY */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Business Profile</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Enter your statutory enterprise information for instant registry verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Legal / Trade Business Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Neelgiri Physio Clinic"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Constitution of Business
                </label>
                <select
                  value={constitution}
                  onChange={(e) => setConstitution(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                >
                  <option value="Proprietorship">Sole Proprietorship</option>
                  <option value="Private Limited">Private Limited Company (Pvt Ltd)</option>
                  <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                  <option value="Partnership Firm">Partnership Firm</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Statutory Identification
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setIdentifierType("gstin")}
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        identifierType === "gstin" ? "bg-red-100 text-[#E40000]" : "text-neutral-500"
                      }`}
                    >
                      GSTIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setIdentifierType("udyam")}
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        identifierType === "udyam" ? "bg-red-100 text-[#E40000]" : "text-neutral-500"
                      }`}
                    >
                      Udyam (Micro MSME)
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={identifierValue}
                    onChange={(e) => setIdentifierValue(e.target.value.toUpperCase())}
                    placeholder={
                      identifierType === "gstin"
                        ? "e.g. 07CPCXN0398P1ZT"
                        : "e.g. UDYAM-WB-00-5053330"
                    }
                    className="flex-1 px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleRegistryCheck}
                    disabled={lookupLoading || !identifierValue}
                    className="px-4 py-3 bg-neutral-900 hover:bg-black text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>{lookupLoading ? "Checking..." : "Verify"}</span>
                  </button>
                </div>

                {registryMatch && (
                  <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Active record found: <strong>{registryMatch.legal_name || registryMatch.enterprise_name}</strong> (Status: {registryMatch.status || "ACTIVE"})
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!businessName) {
                    setError("Please enter legal or trade business name");
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="w-full py-3.5 bg-[#E40000] hover:bg-[#B30000] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
              >
                <span>Continue to Signatory Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: AUTHORIZED SIGNATORY */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Authorized Signatory</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Details of the business owner or designated official executing the enterprise contract.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Full Legal Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="e.g. Dr. Neha Banerjee"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Designation / Role
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Mobile Number (for SMS OTP &amp; WhatsApp Alerts)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold text-sm">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="98765 43210"
                    className="w-full pl-14 pr-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Official Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="neha@neelgiriphysio.com"
                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!contactName || !mobile) {
                      setError("Please provide signatory name and mobile number");
                      return;
                    }
                    setError(null);
                    setStep(3);
                  }}
                  className="w-2/3 py-3.5 bg-[#E40000] hover:bg-[#B30000] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <span>Continue to Installation Site</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: INSTALLATION SITE */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Installation Address</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Premises location where enterprise fiber broadband and equipment will be delivered.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Street Address / Premise / Unit
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop 14, Commercial Plaza, Inner Ring Road"
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Airtel Enterprise Fiber &amp; AirFiber Active in {pincode}</span>
                </span>
                <span className="text-[11px] bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                  Feasible
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-3.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-sm rounded-xl transition-all"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleCompleteRegistration}
                  className="w-2/3 py-3.5 bg-[#E40000] hover:bg-[#B30000] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Register &amp; Launch Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-neutral-500">
        © 2026 Bharti Airtel Limited. Enterprise MSME Digital Services. All rights reserved.
      </footer>
    </div>
  );
}
