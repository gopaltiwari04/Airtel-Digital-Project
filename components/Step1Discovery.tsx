"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  RefreshCw,
  ArrowRight,
  Building2,
  Users,
  MapPin,
  Check,
  RotateCcw,
  ChevronRight
} from "lucide-react";
import { sendAdvisorChat, ChatMessage } from "../lib/api";
import { useAuth } from "../lib/auth";

interface Step1DiscoveryProps {
  onQuoteGenerated: (quoteData: any, slots: any) => void;
}

// Lightweight Markdown renderer for bolding, bullet points, and numbered lists
function FormattedMessage({ text }: { text: string }) {
  const paragraphs = text.split("\n\n");

  const formatLine = (line: string) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-extrabold text-inherit">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {paragraphs.map((p, pIdx) => {
        const lines = p.split("\n");
        return (
          <div key={pIdx}>
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 ml-1 my-0.5">
                    <span className="text-red-500 font-bold">•</span>
                    <span>{formatLine(trimmed.slice(2))}</span>
                  </div>
                );
              }
              const numbered = trimmed.match(/^(\d+)\.\s+(.*)/);
              if (numbered) {
                return (
                  <div key={lIdx} className="flex items-start gap-1.5 ml-1 my-0.5">
                    <span className="font-bold text-red-600">{numbered[1]}.</span>
                    <span>{formatLine(numbered[2])}</span>
                  </div>
                );
              }
              return (
                <p key={lIdx} className={lIdx > 0 ? "mt-1" : ""}>
                  {formatLine(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default function Step1Discovery({ onQuoteGenerated }: Step1DiscoveryProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"whatsapp" | "web">("whatsapp");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Namaste! Welcome to Airtel Business SYNC. I am your automated enterprise advisor. Tell me about your business (what type of business you run, your team size, and branch count) or choose one of the quick scenarios above, and I will configure a tailored, single-bill bundle for you!"
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("en-IN");
  const [generatedQuote, setGeneratedQuote] = useState<any | null>(null);
  const [currentTime, setCurrentTime] = useState<string>("12:00 PM");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const d = new Date();
    setCurrentTime(d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Web Speech Recognition setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = speechLang;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
          // Auto-send voice input for seamless hands-free interaction
          if (transcript.trim()) {
            handleSend(transcript.trim());
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [speechLang, messages, slots]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = speechLang;
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*_#]/g, "");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = speechLang;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || loading) return;

    const newHistory = [...messages, { role: "user" as const, content: textToSend }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await sendAdvisorChat(textToSend, newHistory, slots);
      setMessages([...newHistory, { role: "assistant", content: res.reply }]);
      setSlots(res.slots || {});

      if (res.is_complete && res.quote_payload) {
        setGeneratedQuote(res.quote_payload);
        onQuoteGenerated(res.quote_payload, res.slots);
      }
    } catch (err) {
      setMessages([
        ...newHistory,
        {
          role: "assistant",
          content: "Sorry, I had trouble connecting to Airtel Business SYNC engine. Please verify the API server or connection."
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Namaste! Welcome to Airtel Business SYNC. I am your automated enterprise advisor. Tell me about your business (what type of business you run, your team size, and branch count) or choose one of the quick scenarios above, and I will configure a tailored, single-bill bundle for you!"
      }
    ]);
    setSlots({});
    setGeneratedQuote(null);
  };

  const handleInstantRecommend = async (customSlots?: { vertical: string; headcount: number; locations: number }) => {
    const targetSlots = customSlots || { vertical: "prof", headcount: 8, locations: 1 };
    setLoading(true);
    try {
      const res = await sendAdvisorChat(
        `We are a ${targetSlots.vertical} enterprise with ${targetSlots.headcount} team members across ${targetSlots.locations} site(s). Configure bundle.`,
        messages,
        targetSlots
      );
      if (res.quote_payload) {
        setSlots(res.slots);
        setGeneratedQuote(res.quote_payload);
        onQuoteGenerated(res.quote_payload, res.slots);
      }
    } catch (err) {
      console.error("Instant recommend error:", err);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    {
      icon: "🩺",
      title: "Dental Clinic",
      meta: "8 Staff • 1 Site",
      text: "We operate a dental clinic with 8 staff members in 1 location. We need reliable fiber, a static IP for patient records, and cloud backup."
    },
    {
      icon: "🏪",
      title: "Kirana / Retail",
      meta: "5 Staff • 1 Shop",
      text: "I run a retail kirana store with 5 employees and 1 shop. We need fast broadband for UPI POS and business SIMs."
    },
    {
      icon: "🍽️",
      title: "Restaurant Chain",
      meta: "15 Staff • 3 Sites",
      text: "We have a 3-outlet restaurant chain with 15 staff. We need unified internet, CCTV security, and a single consolidated bill."
    },
    {
      icon: "🏭",
      title: "Auto Factory",
      meta: "25 Staff • 1 Plant",
      text: "We have an auto parts manufacturing factory with 25 workers. Need dedicated leased line internet, IoT tracking, and firewall security."
    }
  ];

  const capturedSlotsCount = ["vertical", "headcount", "locations"].filter((k) => slots[k] !== undefined).length;

  // Suggestion chips based on unfulfilled slots
  const getContextChips = () => {
    if (!slots.vertical) {
      return [
        { label: "🩺 Clinic / Hospital", text: "We run a healthcare clinic with consultation rooms." },
        { label: "🏪 Retail / Kirana Store", text: "We run a retail store with billing counters." },
        { label: "🍽️ Restaurant / Cafe", text: "We run a multi-outlet food and restaurant business." },
        { label: "🏭 Manufacturing / Factory", text: "We operate an industrial manufacturing workshop." },
        { label: "💼 Office / CA / Legal", text: "We run a professional corporate office." }
      ];
    }
    if (!slots.headcount) {
      return [
        { label: "👥 5 Staff", text: "We have 5 team members needing connectivity." },
        { label: "👥 8 Staff", text: "We have a team of 8 employees." },
        { label: "👥 15 Staff", text: "We have 15 staff members across teams." },
        { label: "👥 25+ Staff", text: "We have 25 or more workers on site." }
      ];
    }
    if (!slots.locations) {
      return [
        { label: "📍 Single Location", text: "We operate from a single location." },
        { label: "📍 2-3 Outlets / Sites", text: "We have 3 branches across the city." },
        { label: "📍 5+ Multi-City Branches", text: "We have multiple branches across different cities." }
      ];
    }
    return [
      { label: "⚡ Generate My Quote", text: "Please recommend the best bundle for our setup." },
      { label: "🛡️ Add Cybersecurity & Static IP", text: "We also need dedicated static IP and endpoint cybersecurity." },
      { label: "📱 Number Porting (MNP)", text: "Can we port our existing Jio / Vi mobile numbers to Airtel Business?" }
    ];
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">Step 1 of 4</span>
            <h2 className="text-lg font-extrabold text-slate-900">Needs Discovery &amp; Conversational Advisor</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Powered by <strong>Airtel Business SYNC</strong> • Natural Hindi, English, and Hinglish dialogue with zero price hallucination.
          </p>
        </div>

        {/* View Mode & Voice Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp vs Web View Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setMode("whatsapp")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "whatsapp" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Simulator</span>
            </button>
            <button
              onClick={() => setMode("web")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "web" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Web Advisor</span>
            </button>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center bg-slate-100 px-2 py-1 rounded-xl text-xs space-x-1">
            <span className="text-[11px] text-slate-500 font-medium">Voice:</span>
            <button
              onClick={() => setSpeechLang(speechLang === "en-IN" ? "hi-IN" : "en-IN")}
              className="font-bold text-slate-800 underline hover:text-red-600"
            >
              {speechLang === "en-IN" ? "English (India)" : "Hindi (India)"}
            </button>
          </div>

          {/* Reset Chat Button */}
          <button
            onClick={handleResetChat}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all"
            title="Restart conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Captured Slots Visualizer - Non-stuck, informative telemetry */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* VERTICAL */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-slate-400" /> Vertical
            </span>
            {slots.vertical && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          <div className="mt-1">
            {slots.vertical ? (
              <span className="text-sm font-extrabold text-emerald-800 capitalize flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> {slots.vertical}
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Awaiting input (e.g. Clinic)</span>
            )}
          </div>
        </div>

        {/* HEADCOUNT */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" /> Headcount
            </span>
            {slots.headcount && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          <div className="mt-1">
            {slots.headcount ? (
              <span className="text-sm font-extrabold text-emerald-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> {slots.headcount} members
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Awaiting input (e.g. 8 staff)</span>
            )}
          </div>
        </div>

        {/* BRANCHES */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" /> Branches
            </span>
            {slots.locations && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          <div className="mt-1">
            {slots.locations ? (
              <span className="text-sm font-extrabold text-emerald-800 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> {slots.locations} site(s)
              </span>
            ) : (
              <span className="text-xs font-medium text-slate-400">Awaiting input (e.g. 1 site)</span>
            )}
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Advisor Status</span>
          </div>
          <div className="text-xs font-extrabold mt-1">
            {loading ? (
              <span className="text-amber-600 flex items-center space-x-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
                <span>Analyzing Turn...</span>
              </span>
            ) : generatedQuote ? (
              <span className="text-emerald-600 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Quote Ready!</span>
              </span>
            ) : capturedSlotsCount > 0 ? (
              <span className="text-blue-600 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Slot-Filling ({capturedSlotsCount}/3)</span>
              </span>
            ) : (
              <span className="text-slate-600 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Ready for Input (0/3)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Prominent 1-Click Fast-Track Presets Bar */}
      <div className="bg-gradient-to-r from-red-50 via-slate-50 to-amber-50 p-4 rounded-2xl border border-red-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black">
                ⚡
              </span>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                1-Click Fast-Track Presets
              </h3>
              <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                Zero Typing Needed
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Select any pre-configured enterprise scenario to trigger the advisor instantly, or click Instant Recommend.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInstantRecommend({ vertical: "prof", headcount: 8, locations: 1 })}
              disabled={loading}
              className="px-3.5 py-1.5 bg-[#E40000] text-white rounded-xl text-xs font-extrabold hover:bg-red-700 transition-all shadow-sm flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
            >
              <span>⚡ Instant Recommend (8 Staff)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Interactive Profile Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.text)}
              disabled={loading}
              className="p-3 bg-white border border-slate-200 rounded-xl hover:border-red-500 hover:shadow-md transition-all text-left group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-base">{qp.icon}</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-red-600">
                    {qp.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{qp.meta}</p>
              </div>
              <div className="mt-2 text-[10px] text-red-600 font-bold flex items-center gap-1 opacity-80 group-hover:opacity-100">
                <span>Select profile</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          ))}
        </div>

        {/* Logged-in Customer Badge */}
        {user?.businessName && (
          <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Active Persona:</span>
              <strong className="text-slate-800">{user.name}</strong>
              <span className="text-slate-400">({user.businessName})</span>
            </div>
            <button
              onClick={() =>
                handleSend(
                  `We are ${user.businessName} located in ${user.city}. Team of 8 employees, single location. Need high speed fiber and postpaid SIMs.`
                )
              }
              className="text-red-600 font-bold underline hover:text-red-700"
            >
              Auto-fill for {user.businessName} →
            </button>
          </div>
        )}
      </div>

      {/* Main Container: WhatsApp Business Simulator OR Web Chat */}
      {mode === "whatsapp" ? (
        /* Authentic WhatsApp Business Simulator Container */
        <div className="max-w-2xl mx-auto bg-[#e5ddd5] rounded-3xl shadow-xl overflow-hidden border border-slate-300">
          
          {/* WhatsApp Header */}
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-[#075e54] text-lg shadow-sm border border-emerald-300">
                A
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm tracking-wide">Airtel Business SYNC</h3>
                  <span className="px-1.5 py-0.2 bg-[#25d366] text-[#075e54] text-[9px] font-black rounded-full">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200">Verified Bharti Airtel Enterprise Account • Online</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-emerald-100">
              <button
                onClick={handleResetChat}
                className="hover:text-white text-xs flex items-center gap-1 bg-[#064e46] px-2 py-1 rounded-lg"
                title="Reset Chat"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <PhoneCall className="w-4 h-4 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Encryption Notice */}
          <div className="p-2.5 text-center bg-[#e5ddd5]">
            <span className="bg-[#fcf8e3] text-[#8a6d3b] text-[10px] px-3 py-1 rounded-lg inline-flex items-center space-x-1 shadow-sm border border-[#faebcc]">
              <span>🔒 Messages are end-to-end encrypted under DPDP Act, 2023.</span>
            </span>
          </div>

          {/* Chat Messages Log */}
          <div className="p-4 space-y-3 min-h-[360px] max-h-[460px] overflow-y-auto">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm relative leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#dcf8c6] text-slate-900 rounded-tr-none font-medium"
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-100"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="text-[10px] font-extrabold text-[#075e54] mb-1 flex items-center gap-1">
                      <span>Airtel Business SYNC</span>
                      <span className="text-[9px] text-[#25d366] font-bold">✓</span>
                    </div>
                  )}

                  <FormattedMessage text={m.content} />
                  
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/70 text-[10px] text-slate-400">
                    <span className="text-[9px]">{currentTime}</span>
                    <div className="flex items-center space-x-2">
                      {m.role === "assistant" ? (
                        <button
                          onClick={() => speakText(m.content)}
                          className="hover:text-emerald-700 flex items-center space-x-1 font-semibold"
                          title="Listen with Text-to-Speech"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Listen</span>
                        </button>
                      ) : (
                        <span className="text-[#34b7f1] font-bold text-[11px]" title="Delivered & Read">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-2.5 text-xs text-slate-600 shadow-sm flex items-center space-x-2 border border-slate-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="font-medium text-slate-700">Airtel Business SYNC is replying...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Suggestion Chips inside Chat */}
          <div className="px-4 py-2 bg-[#f0f0f0]/80 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Quick Reply Suggestions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {getContextChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.text)}
                  disabled={loading}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-500 border border-slate-200 text-slate-700 text-[11px] rounded-lg transition-all shadow-xs font-medium disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Voice Waveform Banner */}
          {isListening && (
            <div className="bg-red-50 px-4 py-2 border-t border-red-200 flex items-center justify-between text-xs text-red-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="font-bold">Listening via Web Speech ({speechLang === "hi-IN" ? "Hindi" : "English"})...</span>
              </div>
              <div className="flex items-center gap-1 h-5">
                {[8, 18, 12, 22, 16, 10, 20, 14].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-[#E40000] rounded-full animate-bounce"
                    style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* WhatsApp Interactive Input Bar */}
          <div className="bg-[#f0f0f0] p-3 flex items-center space-x-2 border-t border-slate-200">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-full transition-all ${
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-white text-slate-600 hover:text-emerald-700 shadow-sm"
              }`}
              title="Speak in Hindi / English via Web Speech API"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isListening ? "Listening... Speak now" : "Message Airtel Business SYNC (or use mic)..."}
              className="flex-1 bg-white text-xs px-4 py-2.5 rounded-full border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-full bg-[#075e54] text-white hover:bg-[#128c7e] transition-all disabled:opacity-40 shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

        </div>
      ) : (
        /* Modern Web Chat View */
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <div>
                <h3 className="font-bold text-sm">Airtel Business SYNC GenAI Advisor</h3>
                <p className="text-[11px] text-red-100">Official Bharti Airtel Enterprise MSME Solution</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleResetChat}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium flex items-center gap-1 text-white"
                title="Restart Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4 min-h-[360px] max-h-[460px] overflow-y-auto bg-slate-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-red-600 text-white rounded-tr-none font-medium"
                      : "bg-white text-slate-900 rounded-tl-none border border-slate-200"
                  }`}
                >
                  {m.role === "assistant" && (
                    <div className="text-[10px] font-extrabold text-red-700 mb-1 flex items-center gap-1">
                      <span>Airtel Business SYNC</span>
                    </div>
                  )}

                  <FormattedMessage text={m.content} />

                  {m.role === "assistant" && (
                    <div className="flex justify-end mt-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => speakText(m.content)}
                        className="text-[11px] text-slate-400 hover:text-red-600 flex items-center space-x-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Voice Readout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl p-4 text-xs text-slate-600 shadow-sm border border-slate-200 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                  <span className="font-semibold text-slate-800">Airtel Business SYNC is analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips in Web View */}
          <div className="px-6 py-2 bg-slate-100 border-t border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Suggested Answers:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {getContextChips().map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip.text)}
                  disabled={loading}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 hover:border-red-500 border border-slate-200 text-slate-700 text-xs rounded-lg transition-all shadow-xs font-medium disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Live Voice Waveform Banner */}
          {isListening && (
            <div className="bg-red-50 px-6 py-2 border-t border-red-200 flex items-center justify-between text-xs text-red-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                <span className="font-bold">Listening in {speechLang === "hi-IN" ? "Hindi (India)" : "English (India)"}...</span>
              </div>
              <div className="flex items-center gap-1 h-5">
                {[8, 18, 12, 22, 16, 10, 20, 14].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-[#E40000] rounded-full animate-bounce"
                    style={{ height: `${h}px`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-white border-t border-slate-200 flex items-center space-x-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border ${
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              title="Voice Input (Hindi/English)"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask Airtel Business SYNC anything or describe your business..."
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 disabled:opacity-40 shadow-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Quote Ready Alert Banner */}
      {generatedQuote && (
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg flex items-center justify-between animate-fadeIn">
          <div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-white" />
              <h3 className="font-extrabold text-sm">Tailored Quote Generated Successfully!</h3>
            </div>
            <p className="text-xs text-emerald-100 mt-0.5">
              Recommended: <strong>{generatedQuote.recommended_tier} Tier</strong> with ₹0 setup fee for 24-mo contract.
            </p>
          </div>

          <button
            onClick={() => onQuoteGenerated(generatedQuote, slots)}
            className="px-4 py-2 bg-white text-emerald-800 font-extrabold text-xs rounded-xl hover:bg-emerald-50 transition-all shadow flex items-center space-x-1.5"
          >
            <span>Proceed to Step 2: Quote Configurator</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}