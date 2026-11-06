"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Phone, 
  KeyRound, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  UserCheck, 
  Sparkles, 
  Briefcase,
  AlertCircle
} from "lucide-react";
import AirtelLogo from "@/components/AirtelLogo";
import { useAuth, DEMO_USERS, UserProfile, UserRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loginWithOtp, loginAsDemoUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"otp" | "persona" | "partner">("persona");
  const [mobile, setMobile] = useState("9876543210");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [role, setRole] = useState<UserRole>("customer");
  const [partnerCode, setPartnerCode] = useState("PARTNER-P991");
  const [partnerPin, setPartnerPin] = useState("123456");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(45);

  useEffect(() => {
    let timer: any;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }
    setError(null);
    setOtpSent(true);
    setCountdown(45);
    setSuccessMsg("SMS OTP dispatched! For testing, use code: 123456");
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginWithOtp(mobile, otp, role);
      setSuccessMsg("Authentication verified! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/");
      }, 700);
    } catch (err: any) {
      setError(err.message || "Invalid OTP code");
    }
  };

  const handlePersonaSelect = (persona: UserProfile) => {
    loginAsDemoUser(persona);
    setSuccessMsg(`Logged in as ${persona.name} (${persona.businessName})`);
    setTimeout(() => {
      router.push("/");
    }, 600);
  };

  const handlePartnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const partnerUser = DEMO_USERS.find((u) => u.role === "partner") || DEMO_USERS[2];
    loginAsDemoUser(partnerUser);
    setSuccessMsg("Partner SSO verified! Launching Back-Office Console...");
    setTimeout(() => {
      router.push("/?view=backoffice");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-red-50/20 to-neutral-100 flex flex-col justify-between">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <AirtelLogo size="lg" />
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-neutral-500 hidden sm:inline">New to Airtel SYNC?</span>
          <Link
            href="/signup"
            className="font-bold text-[#E40000] hover:text-[#B30000] bg-white border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl shadow-xs transition-all"
          >
            Register Business
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        {/* Top Info Banner */}
        <div className="text-center mb-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/70 text-[#E40000] text-xs font-bold mb-3 border border-red-200">
            <Sparkles className="w-3.5 h-3.5 text-[#E40000]" />
            Enterprise MSME Unified Access
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
            Sign In to <span className="text-[#E40000]">Airtel Business SYNC</span>
          </h1>
          <p className="text-neutral-600 text-sm mt-2">
            One login for broadband, corporate SIMs, cloud tools, single-billing, and channel partner workflows.
          </p>
        </div>

        {/* Card Box */}
        <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-neutral-200/80 overflow-hidden">
          {/* Tab Bar */}
          <div className="grid grid-cols-3 border-b border-neutral-100 bg-neutral-50/60 p-1.5 gap-1.5 text-xs sm:text-sm font-semibold">
            <button
              onClick={() => { setActiveTab("persona"); setError(null); }}
              className={`py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "persona"
                  ? "bg-white text-[#E40000] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Quick Personas</span>
            </button>
            <button
              onClick={() => { setActiveTab("otp"); setError(null); }}
              className={`py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "otp"
                  ? "bg-white text-[#E40000] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>Mobile OTP</span>
            </button>
            <button
              onClick={() => { setActiveTab("partner"); setError(null); }}
              className={`py-3 px-2 rounded-2xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === "partner"
                  ? "bg-white text-[#E40000] shadow-sm font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>Partner SSO</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Feedback Alerts */}
            {error && (
              <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold animate-pulse">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB 1: QUICK PERSONA SWITCHER */}
            {activeTab === "persona" && (
              <div className="space-y-4">
                <p className="text-xs text-neutral-500 font-medium">
                  Select a pre-configured business role for instant 1-click access:
                </p>

                <div className="grid gap-3">
                  {DEMO_USERS.map((persona) => {
                    const isCurrent = user?.id === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => handlePersonaSelect(persona)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                          isCurrent
                            ? "border-[#E40000] bg-red-50/40 shadow-xs"
                            : "border-neutral-200 hover:border-red-300 hover:bg-neutral-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-red-400 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                            {persona.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-neutral-900 text-sm">{persona.name}</span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                                  persona.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : persona.role === "partner"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {persona.role}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-600 font-medium mt-0.5">
                              {persona.businessName} • {persona.city}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#E40000] group-hover:translate-x-1 transition-all" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: MOBILE NUMBER + OTP */}
            {activeTab === "otp" && (
              <div>
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                        Registered Mobile Number
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
                      <p className="text-[11px] text-neutral-500 mt-1.5">
                        We will send a 6-digit One-Time Password via statutory SMS gateway.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                        Account Role
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["customer", "partner", "admin"] as UserRole[]).map((r) => (
                          <button
                            type="button"
                            key={r}
                            onClick={() => setRole(r)}
                            className={`py-2 text-xs font-bold rounded-xl border capitalize transition-all ${
                              role === r
                                ? "bg-red-50 border-[#E40000] text-[#E40000]"
                                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#E40000] hover:bg-[#B30000] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    >
                      <span>Get Verification Code</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900">
                      <span>SMS sent to +91 {mobile}</span>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[#E40000] font-bold hover:underline"
                      >
                        Change
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                        Enter 6-Digit OTP (Use: 123456)
                      </label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="1 2 3 4 5 6"
                        className="w-full tracking-widest text-center py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-black text-xl outline-none transition-all"
                        required
                        autoFocus
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-neutral-500">
                        <span>Didn&apos;t get SMS?</span>
                        {countdown > 0 ? (
                          <span>Resend in {countdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => { setCountdown(45); setSuccessMsg("New OTP dispatched (123456)"); }}
                            className="text-[#E40000] font-bold hover:underline"
                          >
                            Resend OTP
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#E40000] hover:bg-[#B30000] text-white font-bold text-sm rounded-xl shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify &amp; Enter Portal</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 3: PARTNER SSO */}
            {activeTab === "partner" && (
              <form onSubmit={handlePartnerLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Partner Registration Code
                  </label>
                  <input
                    type="text"
                    value={partnerCode}
                    onChange={(e) => setPartnerCode(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Channel Partner Security PIN
                  </label>
                  <input
                    type="password"
                    value={partnerPin}
                    onChange={(e) => setPartnerPin(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-300 focus:border-[#E40000] focus:ring-2 focus:ring-red-100 rounded-xl text-neutral-900 font-semibold text-sm outline-none transition-all"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-neutral-900 hover:bg-black text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Launch Partner Back-Office</span>
                </button>
              </form>
            )}
          </div>

          {/* Footer note */}
          <div className="bg-neutral-50 px-6 py-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>DPDP Act 2023 &amp; TRAI Compliant</span>
            </span>
            <span className="font-semibold text-neutral-700">256-Bit SSL Encrypted</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-neutral-500">
        © 2026 Bharti Airtel Limited. Enterprise MSME Digital Services. All rights reserved.
      </footer>
    </div>
  );
}
