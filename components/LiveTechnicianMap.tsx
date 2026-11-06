"use client";

import React, { useState, useEffect } from "react";
import { 
  Navigation, 
  Phone, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  MessageSquare, 
  Truck, 
  Radio, 
  Calendar,
  AlertCircle
} from "lucide-react";

interface LiveTechnicianMapProps {
  orderId: string;
  installationAddress?: string;
  onRescheduleClick?: () => void;
}

export default function LiveTechnicianMap({
  orderId,
  installationAddress = "B-42, Inner Circle, Connaught Place, New Delhi",
  onRescheduleClick
}: LiveTechnicianMapProps) {
  const [distanceKm, setDistanceKm] = useState(1.4);
  const [etaMins, setEtaMins] = useState(18);
  const [vanProgress, setVanProgress] = useState(65); // percentage along route

  // Simulate subtle real-time movement
  useEffect(() => {
    const timer = setInterval(() => {
      setVanProgress((prev) => {
        if (prev >= 92) return 65; // loop simulation
        return prev + 1;
      });
      setDistanceKm((prev) => (prev > 0.4 ? +(prev - 0.05).toFixed(2) : 1.4));
      setEtaMins((prev) => (prev > 5 ? prev - 1 : 18));
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-md overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-neutral-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E40000] flex items-center justify-center text-white shadow-md">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                Live Field Engineer Dispatch
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                Live GPS Active
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Service Order #{orderId} • Airtel Field Operations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRescheduleClick && (
            <button
              type="button"
              onClick={onRescheduleClick}
              className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-bold border border-neutral-700 transition-all"
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-neutral-400" />
              <span>Reschedule</span>
            </button>
          )}
          <a
            href="tel:+919810123456"
            className="px-3.5 py-2 bg-[#E40000] hover:bg-[#B30000] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Engineer</span>
          </a>
        </div>
      </div>

      {/* Simulated Vector Route Canvas */}
      <div className="relative w-full h-56 sm:h-64 bg-slate-100 overflow-hidden select-none border-b border-neutral-200">
        {/* Map Grid Pattern */}
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#cbd5e1 1px, #f1f5f9 1px)",
            backgroundSize: "24px 24px"
          }}
        />

        {/* Simulated Roads / Highways */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Arterial Road */}
          <path
            d="M 20 220 C 150 200, 250 120, 420 140 S 650 90, 850 40"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="28"
            strokeLinecap="round"
          />
          <path
            d="M 20 220 C 150 200, 250 120, 420 140 S 650 90, 850 40"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Active Navigation Route (Airtel Red) */}
          <path
            d="M 40 200 Q 180 180, 280 140 T 520 110 T 740 60"
            fill="none"
            stroke="#E40000"
            strokeWidth="6"
            strokeDasharray="8 6"
            className="animate-pulse"
          />

          {/* Cross Street */}
          <line x1="280" y1="20" x2="280" y2="240" stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" />
          <line x1="520" y1="20" x2="520" y2="240" stroke="#cbd5e1" strokeWidth="12" strokeLinecap="round" />
        </svg>

        {/* Start Pin: Airtel Hub */}
        <div className="absolute left-8 bottom-6 flex items-center gap-1.5 bg-neutral-900/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-xl shadow-md border border-neutral-700">
          <div className="w-2 h-2 rounded-full bg-[#E40000]" />
          <span>Airtel OLT Exchange (Hub #04)</span>
        </div>

        {/* Moving Van Marker */}
        <div
          className="absolute transition-all duration-1000 transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${vanProgress}%`,
            top: `${Math.max(25, 80 - vanProgress * 0.55)}%`
          }}
        >
          {/* Radar ripple rings */}
          <div className="relative">
            <div className="absolute -inset-3 rounded-full bg-red-500/30 animate-ping" />
            <div className="relative w-10 h-10 rounded-2xl bg-neutral-900 text-white border-2 border-[#E40000] shadow-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#E40000]" />
            </div>
            {/* Speed pill tooltip */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md whitespace-nowrap shadow-xs">
              28 km/h
            </div>
          </div>
        </div>

        {/* Destination Pin: Customer Premises */}
        <div className="absolute right-8 top-6 flex items-center gap-2 bg-white text-neutral-900 text-[11px] font-black px-3 py-1.5 rounded-2xl shadow-lg border-2 border-emerald-500">
          <MapPin className="w-4 h-4 text-emerald-600 fill-emerald-100" />
          <div>
            <p className="leading-tight">Installation Site</p>
            <p className="text-[9px] text-neutral-500 font-semibold truncate max-w-[140px]">{installationAddress}</p>
          </div>
        </div>
      </div>

      {/* Engineer Info & Telemetry Card */}
      <div className="p-4 sm:p-5 bg-neutral-50 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Profile */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-200 overflow-hidden border border-neutral-300 flex-shrink-0">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120"
              alt="Ramesh Kumar"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-neutral-900">Ramesh Kumar</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-xs text-neutral-500 font-medium">Lead Enterprise Technician</p>
            <p className="text-[10px] text-neutral-400 font-mono">ID: AIR-TECH-492 • Rating: 4.9★</p>
          </div>
        </div>

        {/* Telemetry Stats */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Distance</span>
            <span className="text-sm font-black text-neutral-900">{distanceKm} KM</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-neutral-200 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Estimated Arrival</span>
            <span className="text-sm font-black text-[#E40000]">{etaMins} MINS</span>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="p-3 bg-white rounded-xl border border-neutral-200 flex flex-col justify-center text-xs">
          <span className="text-[10px] uppercase font-bold text-neutral-400">Dispatch Vehicle</span>
          <p className="font-bold text-neutral-800 mt-0.5">Tata Ace Service Van (DL 1C AB 4920)</p>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">
            ✓ Enterprise Fiber Gateway &amp; SIM Kit on-board
          </p>
        </div>
      </div>
    </div>
  );
}
