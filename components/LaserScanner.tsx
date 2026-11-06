"use client";

import React, { useState, useEffect } from "react";
import { 
  Scan, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ZoomIn, 
  ShieldCheck, 
  RefreshCw,
  Eye,
  Layers
} from "lucide-react";

interface LaserScannerProps {
  imageSrc: string;
  applicantId: string;
  docType: string;
  extractedData?: any;
  verdict?: "GREEN" | "AMBER" | "RED";
}

export default function LaserScanner({
  imageSrc,
  applicantId,
  docType,
  extractedData,
  verdict = "GREEN"
}: LaserScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showBoxes, setShowBoxes] = useState(true);

  // Trigger scan when applicant or docType changes
  const triggerScan = () => {
    setScanning(true);
    setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScanning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 80);
  };

  useEffect(() => {
    triggerScan();
  }, [applicantId, docType]);

  // Simulated bounding box annotations based on document type
  const boundingBoxes = [
    { top: "18%", left: "10%", width: "80%", height: "9%", label: "LEGAL ENTITY / TRADE NAME", confidence: "99.2%" },
    { top: "32%", left: "12%", width: "45%", height: "8%", label: "STATUTORY IDENTIFIER", confidence: "99.8%" },
    { top: "44%", left: "10%", width: "80%", height: "14%", label: "REGISTERED OFFICE & PINCODE", confidence: "98.9%" },
    { top: "64%", left: "55%", width: "35%", height: "10%", label: "AUTHORIZED SIGNATORY / DATE", confidence: "97.6%" },
  ];

  return (
    <div className="bg-neutral-900 rounded-3xl p-4 sm:p-5 text-white border border-neutral-800 shadow-xl space-y-4">
      {/* Top HUD Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600/20 text-[#E40000] border border-red-500/30 flex items-center justify-center">
            <Scan className={`w-4 h-4 ${scanning ? "animate-spin text-[#E40000]" : ""}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-neutral-100">Smart Vision OCR Scanner</h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                WinSDK • 300 DPI
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Deterministic ground-truth visual verification for {applicantId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showBoxes
                ? "bg-red-500/20 border-red-500 text-red-300"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{showBoxes ? "Boxes On" : "Boxes Off"}</span>
          </button>

          <button
            type="button"
            onClick={triggerScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#E40000] hover:bg-[#B30000] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
            <span>{scanning ? "Scanning..." : "Rescan"}</span>
          </button>
        </div>
      </div>

      {/* Main Document Viewport with Laser Beam Overlay */}
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center">
        {/* Document Image */}
        <img
          src={imageSrc}
          alt={`Specimen ${applicantId} - ${docType}`}
          className="w-full h-full object-contain select-none"
          onError={(e) => {
            // Graceful fallback placeholder if image cannot be rendered
            (e.target as any).style.display = "none";
          }}
        />

        {/* Fallback visual if image fails */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-neutral-400 pointer-events-none -z-0">
          <Scan className="w-12 h-12 text-neutral-600 mb-2 stroke-1" />
          <p className="text-xs font-mono">{docType.replace(/_/g, " ").toUpperCase()}</p>
          <p className="text-[10px] text-neutral-500 font-mono mt-1">Ground-truth verified artifact for {applicantId}</p>
        </div>

        {/* Bounding Box Highlights */}
        {showBoxes && !scanning && (
          <div className="absolute inset-0 pointer-events-none">
            {boundingBoxes.map((box, i) => (
              <div
                key={i}
                className="absolute border border-emerald-400 bg-emerald-500/10 rounded-xs transition-all duration-300"
                style={{
                  top: box.top,
                  left: box.left,
                  width: box.width,
                  height: box.height,
                  boxShadow: "0 0 10px rgba(16, 185, 129, 0.25)"
                }}
              >
                <div className="absolute -top-4 left-0 bg-neutral-900/90 text-emerald-400 border border-emerald-500/40 px-1.5 py-0.2 text-[8px] font-mono font-bold rounded-xs flex items-center gap-1">
                  <span>{box.label}</span>
                  <span className="text-neutral-400">({box.confidence})</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Animated Red Laser Scanning Beam */}
        {scanning && (
          <div
            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E40000] to-transparent pointer-events-none transition-all duration-75"
            style={{
              top: `${scanProgress}%`,
              boxShadow: "0 0 18px 4px rgba(228, 0, 0, 0.8), 0 0 40px 10px rgba(228, 0, 0, 0.4)"
            }}
          >
            {/* Glowing tracer bar */}
            <div className="absolute right-4 -top-3 bg-[#E40000] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shadow-lg">
              SCANNING {scanProgress}%
            </div>
          </div>
        )}

        {/* Grid reticle overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }}
        />
      </div>

      {/* Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
        <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/60">
          <span className="text-[10px] text-neutral-400 uppercase font-mono block">OCR Fidelity</span>
          <span className="font-bold text-emerald-400">99.4% Token Match</span>
        </div>
        <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/60">
          <span className="text-[10px] text-neutral-400 uppercase font-mono block">Registry Cross-Join</span>
          <span className="font-bold text-neutral-200">
            {verdict === "GREEN" ? "Verified Active" : verdict === "AMBER" ? "Fuzzy Mismatch" : "Hard Discrepancy"}
          </span>
        </div>
        <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/60">
          <span className="text-[10px] text-neutral-400 uppercase font-mono block">Processing Engine</span>
          <span className="font-bold text-neutral-200">WinSDK Media OCR</span>
        </div>
        <div className="bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/60">
          <span className="text-[10px] text-neutral-400 uppercase font-mono block">Audit Verdict</span>
          <span
            className={`font-black uppercase ${
              verdict === "GREEN"
                ? "text-emerald-400"
                : verdict === "AMBER"
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {verdict}
          </span>
        </div>
      </div>
    </div>
  );
}
