"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Volume2, Sparkles, CheckCircle2, MessageSquare, PhoneCall, RefreshCw, ArrowRight } from "lucide-react";
import { sendAdvisorChat, ChatMessage } from "../lib/api";

interface Step1DiscoveryProps {
  onQuoteGenerated: (quoteData: any, slots: any) => void;
}

export default function Step1Discovery({ onQuoteGenerated }: Step1DiscoveryProps) {
  const [mode, setMode] = useState<"web" | "whatsapp">("whatsapp");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Namaste! Welcome to Airtel Business SYNC. I am your automated enterprise advisor. Tell me about your business (what type of business you run, your team size, and branches) and I will configure a tailored, single-bill bundle for you!"
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [slots, setSlots] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("en-IN");
  const [generatedQuote, setGeneratedQuote] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
  }, [speechLang]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome/Edge.");
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
          content: "Sorry, I had trouble connecting to the advisory engine. Please check API server."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    { label: "Kirana / Retail (5 Staff)", text: "I run a retail kirana store with 5 employees and 1 shop. We need fast broadband for UPI POS and business SIMs." },
    { label: "Dental Clinic (8 Staff + Static IP)", text: "We operate a dental clinic with 8 staff members. We need reliable fiber, a static IP for patient records, and cloud backup." },
    { label: "Restaurant Chain (3 Outlets)", text: "We have a 3-outlet restaurant chain with 15 staff. We need unified internet, CCTV security, and a single consolidated bill." },
    { label: "Manufacturing Unit (25 Workers)", text: "We have an auto parts manufacturing factory with 25 workers. Need dedicated leased line internet, IoT tracking, and firewall security." }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">Step 1 of 4</span>
            <h2 className="text-lg font-extrabold text-gray-900">Needs Discovery & Conversational Advisor</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Captures business profile, headcount, locations, and priorities in English, Hindi, or Hinglish within 3 turns.
          </p>
        </div>

        {/* View Mode & Voice Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* WhatsApp vs Web View Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setMode("whatsapp")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "whatsapp" ? "bg-emerald-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp Simulator</span>
            </button>
            <button
              onClick={() => setMode("web")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === "web" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-red-600" />
              <span>Web Advisor</span>
            </button>
          </div>

          {/* Voice Language Selector */}
          <div className="flex items-center bg-gray-100 px-2 py-1 rounded-xl text-xs space-x-1">
            <span className="text-[11px] text-gray-500 font-medium">Voice:</span>
            <button
              onClick={() => setSpeechLang(speechLang === "en-IN" ? "hi-IN" : "en-IN")}
              className="font-bold text-gray-800 underline hover:text-red-600"
            >
              {speechLang === "en-IN" ? "English (India)" : "Hindi (India)"}
            </button>
          </div>
        </div>
      </div>

      {/* Captured Slots Visualizer */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Vertical</span>
          <p className="text-sm font-extrabold text-gray-900 capitalize mt-0.5">
            {slots.vertical || <span className="text-gray-400 italic font-normal">Detecting...</span>}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Headcount</span>
          <p className="text-sm font-extrabold text-gray-900 mt-0.5">
            {slots.headcount ? `${slots.headcount} members` : <span className="text-gray-400 italic font-normal">Detecting...</span>}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Branches</span>
          <p className="text-sm font-extrabold text-gray-900 mt-0.5">
            {slots.locations ? `${slots.locations} site(s)` : <span className="text-gray-400 italic font-normal">Detecting...</span>}
          </p>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Status</span>
          <p className="text-sm font-extrabold flex items-center space-x-1.5 mt-0.5">
            {generatedQuote ? (
              <span className="text-emerald-600 flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" /> <span>Quote Ready!</span>
              </span>
            ) : (
              <span className="text-amber-600 flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> <span>Slot Filling ({Object.keys(slots).length}/3)</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Main Container: WhatsApp Business Simulator OR Web Chat */}
      {mode === "whatsapp" ? (
        /* Authentic WhatsApp Business Simulator Container */
        <div className="max-w-2xl mx-auto bg-[#e5ddd5] rounded-3xl shadow-xl overflow-hidden border border-gray-300">
          
          {/* WhatsApp Header */}
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between shadow">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-[#075e54] text-lg shadow-sm">
                A
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-bold text-sm tracking-wide">Airtel Business SYNC</h3>
                  <span className="px-1.5 py-0.2 bg-[#25d366] text-[#075e54] text-[9px] font-black rounded-full">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200">Verified Business Account • Online</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-emerald-100">
              <PhoneCall className="w-5 h-5 cursor-pointer hover:text-white" />
            </div>
          </div>

          {/* Encryption Notice */}
          <div className="p-3 text-center">
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
                      ? "bg-[#dcf8c6] text-gray-900 rounded-tr-none"
                      : "bg-white text-gray-900 rounded-tl-none border border-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  
                  {m.role === "assistant" && (
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100 text-[10px] text-gray-400">
                      <span>SYNC Advisor</span>
                      <button
                        onClick={() => speakText(m.content)}
                        className="hover:text-emerald-700 flex items-center space-x-1"
                        title="Listen with Text-to-Speech"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-2 text-xs text-gray-500 shadow-sm flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Airtel Advisor is typing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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

          {/* Input Box */}
          <div className="bg-[#f0f0f0] p-3 flex items-center space-x-2 border-t border-gray-200">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-full transition-all ${
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-white text-gray-600 hover:text-emerald-700 shadow-sm"
              }`}
              title="Speak in Hindi / English via Web Speech API"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isListening ? "Listening... Speak in Hindi or English" : "Type business details or use mic..."}
              className="flex-1 bg-white text-xs px-4 py-2.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800"
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
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden max-w-3xl mx-auto">
          <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <div>
                <h3 className="font-bold text-sm">Airtel SYNC GenAI Bundle Advisor</h3>
                <p className="text-[11px] text-red-100">Slot-Filling in English, Hindi, & Hinglish</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full font-medium">Turn-based discovery</span>
          </div>

          <div className="p-6 space-y-4 min-h-[360px] max-h-[460px] overflow-y-auto bg-gray-50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 text-xs shadow-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-red-600 text-white rounded-tr-none font-medium"
                      : "bg-white text-gray-900 rounded-tl-none border border-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && (
                    <div className="flex justify-end mt-2 pt-1 border-t border-gray-100">
                      <button
                        onClick={() => speakText(m.content)}
                        className="text-[11px] text-gray-400 hover:text-red-600 flex items-center space-x-1"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Voice Readout</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
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

          <div className="p-4 bg-white border-t border-gray-200 flex items-center space-x-2">
            <button
              onClick={toggleListening}
              className={`p-2.5 rounded-xl border ${
                isListening ? "bg-red-600 text-white animate-pulse" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title="Voice Input (Hindi/English)"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Describe your business, headcount, branches, and pain points..."
              className="flex-1 px-4 py-2.5 text-xs bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500"
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

      {/* Quick Prompts Chips */}
      <div className="max-w-2xl mx-auto space-y-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
          One-Click Test Scenarios:
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.text)}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs rounded-xl hover:border-red-500 hover:text-red-600 transition-all shadow-sm font-medium"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quote Ready Alert Banner */}
      {generatedQuote && (
        <div className="max-w-2xl mx-auto bg-gradient-to-r from-emerald-500 to-teal-600 p-5 rounded-2xl text-white shadow-lg flex items-center justify-between">
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
            <span>View Quote & Bill</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
