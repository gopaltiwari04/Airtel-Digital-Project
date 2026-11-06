"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, Truck, UserCheck, Activity, Calendar, MessageSquare, PhoneCall, AlertCircle, RefreshCw } from "lucide-react";
import { getOrderTracker, rescheduleOrder } from "../lib/api";
import LiveTechnicianMap from "./LiveTechnicianMap";

interface Step4TrackerProps {
  orderId?: string;
  initialData?: any;
}

export default function Step4Tracker({ orderId = "SYNC-202611-7842", initialData }: Step4TrackerProps) {
  const [tracker, setTracker] = useState<any | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [newDate, setNewDate] = useState<string>("2026-07-20");
  const [newTimeSlot, setNewTimeSlot] = useState<string>("10:00 AM - 12:00 PM");
  const [rescheduleLoading, setRescheduleLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!initialData) {
      setLoading(true);
      getOrderTracker(orderId)
        .then((res) => {
          setTracker(res);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Tracker fetch error:", err);
          setLoading(false);
        });
    }
  }, [orderId, initialData]);

  const handleReschedule = async () => {
    setRescheduleLoading(true);
    try {
      const slotStr = `${newDate} ${newTimeSlot}`;
      const updated = await rescheduleOrder(tracker?.order_id || orderId, slotStr);
      setTracker(updated);
      setShowRescheduleModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading || !tracker) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-gray-200 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin mx-auto" />
        <p className="text-sm font-bold text-gray-700">Loading real-time provisioning state machine...</p>
      </div>
    );
  }

  const currentIdx = tracker.current_stage_index || 4;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-black bg-white/20 rounded-full">Order #{tracker.order_id}</span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-400 text-emerald-950 rounded-full">Stage 4: In Progress</span>
          </div>
          <h2 className="text-xl font-black mt-1">{tracker.business_name} - {tracker.bundle_name}</h2>
          <p className="text-xs text-red-100 mt-0.5">
            Customer: {tracker.customer_name} • Single Monthly Bill: ₹{tracker.total_monthly_bill?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        <button
          onClick={() => setShowRescheduleModal(true)}
          className="px-4 py-2.5 bg-white text-gray-900 hover:bg-gray-100 font-extrabold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center space-x-2 shrink-0"
        >
          <Calendar className="w-4 h-4 text-red-600" />
          <span>Reschedule Engineer</span>
        </button>
      </div>

      {/* 5-Stage Provisioning Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900">Five-Stage Provisioning State Machine</h3>
            <p className="text-xs text-gray-500">Live SLA status & end-to-end hardware tracking</p>
          </div>
          <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            <span>Target Activation: 48 Hours</span>
          </span>
        </div>

        {/* Stepper bar */}
        <div className="relative">
          <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0" />
          
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {tracker.stages.map((stage: any, idx: number) => {
              const isDone = idx + 1 < currentIdx;
              const isCurrent = idx + 1 === currentIdx;
              const isPending = idx + 1 > currentIdx;

              return (
                <div
                  key={stage.stage_id}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? "border-red-600 bg-red-50/50 shadow-md ring-2 ring-red-500/20"
                      : isDone
                      ? "border-emerald-300 bg-emerald-50/30"
                      : "border-gray-200 bg-gray-50/50 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-center mb-2">
                    {isDone ? (
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center shadow animate-pulse">
                        <Clock className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center font-bold text-xs">
                        {stage.stage_id}
                      </div>
                    )}
                  </div>

                  <span className={`text-[10px] font-black uppercase tracking-wider block ${
                    isDone ? "text-emerald-700" : (isCurrent ? "text-red-700" : "text-gray-400")
                  }`}>
                    Stage {stage.stage_id}
                  </span>
                  <h4 className="font-extrabold text-xs text-gray-900 mt-0.5">{stage.name}</h4>
                  <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-tight">{stage.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Technician GPS Map Simulation */}
      <LiveTechnicianMap
        orderId={tracker.order_id}
        installationAddress={tracker.installation_address || "B-42, Inner Circle, Connaught Place, New Delhi"}
        onRescheduleClick={() => setShowRescheduleModal(true)}
      />

      {/* Engineer & Courier Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Field Engineer Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 rounded-xl text-red-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Assigned Installation Engineer</h3>
              <p className="text-xs text-gray-500">Certified Airtel Enterprise Fiber Technician</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Engineer Name:</span>
              <span className="font-black text-gray-900">{tracker.engineer.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Contact Number:</span>
              <span className="font-mono font-bold text-gray-900 flex items-center space-x-1">
                <PhoneCall className="w-3 h-3 text-emerald-600" />
                <span>{tracker.engineer.phone}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Scheduled Time Slot:</span>
              <span className="font-bold text-red-600">{tracker.engineer.slot}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                Slot Confirmed
              </span>
            </div>
          </div>
        </div>

        {/* Courier & Hardware Card */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Hardware & SIM Dispatch Status</h3>
              <p className="text-xs text-gray-500">Enterprise Dual-Band Router & Pre-activated SIMs</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Courier Partner:</span>
              <span className="font-black text-gray-900">{tracker.courier.partner}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">AWB Tracking Number:</span>
              <span className="font-mono font-bold text-indigo-600">{tracker.courier.tracking_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Shipment Status:</span>
              <span className="font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {tracker.courier.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Expected Delivery:</span>
              <span className="font-bold text-gray-800">Within 24 Hours</span>
            </div>
          </div>
        </div>

      </div>

      {/* Simulated WhatsApp Notification Log Feed */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <h3 className="font-extrabold text-sm text-gray-900">Simulated WhatsApp Notifications Feed</h3>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full font-bold">
            Customer Audit Channel
          </span>
        </div>

        <div className="space-y-2.5">
          {tracker.whatsapp_logs.map((log: any, idx: number) => (
            <div key={idx} className="p-3 bg-[#dcf8c6]/30 border border-emerald-200 rounded-xl text-xs flex items-start space-x-3">
              <span className="font-bold text-emerald-900 shrink-0">{log.sender}:</span>
              <p className="text-gray-800 flex-1">{log.message}</p>
              <span className="text-[10px] text-gray-400 font-mono shrink-0">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 border border-gray-100 space-y-4">
            <h3 className="font-extrabold text-base text-gray-900">Reschedule Installation Engineer</h3>
            <p className="text-xs text-gray-500">
              Select a convenient date and time window. We will re-assign Engineer Ramesh Kumar and dispatch an updated WhatsApp notification.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Preferred Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Available 2-Hour Slot</label>
                <select
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
                >
                  <option value="10:00 AM - 12:00 PM">10:00 AM - 12:00 PM (Morning Slot)</option>
                  <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM (Afternoon Slot)</option>
                  <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM (Evening Slot)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleReschedule}
                disabled={rescheduleLoading}
                className="px-5 py-2 text-xs font-black bg-red-600 hover:bg-red-700 text-white rounded-xl shadow disabled:opacity-50"
              >
                {rescheduleLoading ? "Rescheduling..." : "Confirm Reschedule"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
