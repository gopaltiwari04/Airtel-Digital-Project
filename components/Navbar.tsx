"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Store, 
  Users, 
  ShieldCheck, 
  LogOut, 
  ChevronDown, 
  UserCheck, 
  LogIn, 
  ExternalLink,
  Sparkles
} from "lucide-react";
import AirtelLogo from "./AirtelLogo";
import { useAuth, DEMO_USERS } from "../lib/auth";
import { API_BASE } from "../lib/api";

interface NavbarProps {
  activeView: "customer" | "backoffice";
  setActiveView: (view: "customer" | "backoffice") => void;
  customerStep: number;
}

export default function Navbar({ activeView, setActiveView, customerStep }: NavbarProps) {
  const { user, logout, loginAsDemoUser, isAuthenticated } = useAuth();
  const [apiOnline, setApiOnline] = useState<boolean>(true);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/health`)
      .then((res) => setApiOnline(res.ok))
      .catch(() => setApiOnline(false));
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <AirtelLogo size="md" />
            </Link>
          </div>

          {/* Top-Level View Switcher */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
            <button
              onClick={() => setActiveView("customer")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeView === "customer"
                  ? "bg-white text-neutral-900 shadow-xs font-bold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-[#E40000]" />
              <span className="hidden sm:inline">Customer Onboarding</span>
              <span className="sm:hidden">Customer</span>
              {activeView === "customer" && (
                <span className="px-1.5 py-0.5 bg-red-100 text-[#E40000] text-[10px] font-extrabold rounded-md">
                  Step {customerStep}/4
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveView("backoffice")}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                activeView === "backoffice"
                  ? "bg-white text-neutral-900 shadow-xs font-bold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Back-Office &amp; Partner Console</span>
              <span className="sm:hidden">Partner Console</span>
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-md">
                Lead Ops
              </span>
            </button>
          </div>

          {/* Right Section: System Indicator & User Auth Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-neutral-50 border border-neutral-200 text-xs">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-neutral-600 font-medium">
                {apiOnline ? "Cloud Engine Live" : "Offline"}
              </span>
            </div>

            {/* User Account / Role Switcher */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-full transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-red-600 to-red-400 text-white font-black text-xs flex items-center justify-center shadow-xs">
                    {user.name.charAt(0)}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-bold text-neutral-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-medium leading-tight">
                      {user.businessName.split(" ")[0]} • <span className="capitalize text-[#E40000] font-bold">{user.role}</span>
                    </p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200 p-2 z-50">
                    <div className="p-3 border-b border-neutral-100">
                      <p className="text-xs font-bold text-neutral-900">{user.name}</p>
                      <p className="text-[11px] text-neutral-500">{user.businessName}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-red-100 text-[#E40000]">
                          {user.role}
                        </span>
                        <span className="text-[11px] text-neutral-500 font-medium">
                          +91 {user.mobile}
                        </span>
                      </div>
                    </div>

                    <div className="py-2">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider px-3 mb-1.5">
                        Switch Persona (Test)
                      </p>
                      {DEMO_USERS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            loginAsDemoUser(p);
                            setUserDropdownOpen(false);
                            if (p.role === "partner" || p.role === "admin") {
                              setActiveView("backoffice");
                            } else {
                              setActiveView("customer");
                            }
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            user.id === p.id
                              ? "bg-red-50 text-[#E40000] font-bold"
                              : "text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <div>
                            <p className="leading-tight">{p.name}</p>
                            <p className="text-[10px] text-neutral-400">{p.businessName.slice(0, 24)}</p>
                          </div>
                          <span className="text-[9px] uppercase font-bold text-neutral-400">
                            {p.role}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-neutral-100 pt-1.5 mt-1">
                      <Link
                        href="/login"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 rounded-xl flex items-center gap-2"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Login with Another Account</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 bg-[#E40000] hover:bg-[#B30000] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
