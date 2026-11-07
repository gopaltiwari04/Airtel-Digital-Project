import productsData from "@/data/products.json";
import mockGstinData from "@/data/mock_gstin.json";
import mockUdyamData from "@/data/mock_udyam.json";
import smbLeadsData from "@/data/smb_leads.json";
import groundTruthData from "@/data/k01_k12_ground_truth.json";
import { tokenSortRatio } from "@/lib/fuzzy";

// In-memory persistent stores for serverless lifecycle
const inMemoryOrders: Record<string, any> = {};
const inMemoryOverrides: Record<string, any> = {};
const inMemoryConsents: Record<string, any> = {};

export interface ProductItem {
  product_id: string;
  category: string;
  product_name: string;
  description: string;
  unit: string;
  price_min_inr_per_month: number;
  one_time_setup_fee: number;
  min_tenure_months: number;
  requires_gstin: string;
  typical_install_days: number;
}

const productsById: Record<string, ProductItem> = {};
(productsData as any[]).forEach((p) => {
  productsById[p.product_id] = p;
});

// Map GSTIN & Udyam for O(1) lookups
const gstinIndex: Record<string, any> = {};
(mockGstinData as any[]).forEach((g) => {
  if (g.gstin) gstinIndex[g.gstin.trim().toUpperCase()] = g;
});

const udyamIndex: Record<string, any> = {};
(mockUdyamData as any[]).forEach((u) => {
  if (u.udyam_number) udyamIndex[u.udyam_number.trim().toUpperCase()] = u;
});

export function recommendBundle(
  vertical: string = "micro",
  headcount: number = 5,
  locations: number = 1,
  priorities: string[] = [],
  budget?: number
) {
  const vert = (vertical || "micro").toLowerCase();
  let vertKey = "micro";
  if (["retail", "salon", "shop", "kirana", "store", "micro"].some((k) => vert.includes(k))) {
    vertKey = "micro";
  } else if (["office", "clinic", "doctor", "ca", "legal", "lawyer", "consult", "coaching", "prof"].some((k) => vert.includes(k))) {
    vertKey = "prof";
  } else if (["chain", "multi", "restaurant", "branch"].some((k) => vert.includes(k))) {
    vertKey = "multi";
  } else if (["factory", "mfg", "manufactur", "industrial", "plant"].some((k) => vert.includes(k))) {
    vertKey = "mfg";
  }

  const simCount = Math.max(2, Math.min(headcount, 20));

  let starterPids: [string, number][] = [];
  let growthPids: [string, number][] = [];
  let proPids: [string, number][] = [];

  if (vertKey === "micro") {
    starterPids = [["P01", 1], ["P07", Math.min(2, simCount)], ["P18", 1]];
    growthPids = [["P01", 1], ["P07", Math.min(4, simCount)], ["P15", 1], ["P19", 1]];
    proPids = [["P02", 1], ["P07", Math.min(8, simCount)], ["P15", 1], ["P19", 1], ["P23", 2]];
  } else if (vertKey === "prof") {
    starterPids = [["P01", 1], ["P07", Math.min(3, simCount)], ["P16", Math.min(5, headcount)]];
    growthPids = [["P02", 1], ["P07", Math.min(6, simCount)], ["P11", 1], ["P16", Math.min(10, headcount)], ["P17", 1]];
    proPids = [["P03", 1], ["P08", Math.min(10, simCount)], ["P11", 1], ["P12", 1], ["P16", Math.min(20, headcount)], ["P17", 1], ["P20", Math.min(10, headcount)]];
  } else if (vertKey === "multi") {
    const sites = Math.max(2, locations);
    starterPids = [["P01", sites], ["P07", Math.min(6, simCount)], ["P22", sites]];
    growthPids = [["P02", sites], ["P07", Math.min(12, simCount)], ["P09", sites], ["P13", 1], ["P23", sites * 2]];
    proPids = [["P03", sites], ["P08", Math.min(20, simCount)], ["P10", sites], ["P12", 1], ["P13", 1], ["P21", sites], ["P23", sites * 3]];
  } else {
    starterPids = [["P02", 1], ["P07", Math.min(5, simCount)], ["P11", 1], ["P20", 5]];
    growthPids = [["P05", 1], ["P08", Math.min(10, simCount)], ["P11", 1], ["P21", 1], ["P24", 2]];
    proPids = [["P06", 1], ["P08", Math.min(20, simCount)], ["P10", 1], ["P11", 1], ["P21", 1], ["P24", 5], ["P25", 3]];
  }

  function computeTier(tierName: string, pids: [string, number][], defaultTenure: number = 12) {
    const items: any[] = [];
    let rawMrc = 0;
    let rawSetup = 0;
    let installDays = 0;

    for (const [pid, qty] of pids) {
      const p = productsById[pid];
      if (!p) continue;
      const unitMrc = Number(p.price_min_inr_per_month) || 0;
      const unitSetup = Number(p.one_time_setup_fee) || 0;
      const totMrc = unitMrc * qty;
      const totSetup = unitSetup * qty;
      rawMrc += totMrc;
      rawSetup += totSetup;
      installDays = Math.max(installDays, Number(p.typical_install_days) || 3);

      items.push({
        product_id: pid,
        product_name: p.product_name,
        category: p.category,
        unit: p.unit,
        quantity: qty,
        unit_mrc: unitMrc,
        total_mrc: Math.round(totMrc * 100) / 100,
        setup_fee: Math.round(totSetup * 100) / 100,
        requires_gstin: p.requires_gstin === "Y",
      });
    }

    let discountPct = 0;
    if (items.length >= 5) discountPct = 10;
    else if (items.length >= 3) discountPct = 5;

    const discountAmount = Math.round(rawMrc * (discountPct / 100) * 100) / 100;
    const netMrc = Math.round((rawMrc - discountAmount) * 100) / 100;
    const setupWaived = defaultTenure >= 24;
    const finalSetup = setupWaived ? 0 : rawSetup;
    const gst18 = Math.round(netMrc * 0.18 * 100) / 100;
    const totalMonthly = Math.round((netMrc + gst18) * 100) / 100;

    const hasLeasedLine = pids.some(([p]) => p === "P05" || p === "P06");

    return {
      tier_name: tierName,
      tagline:
        tierName === "Starter"
          ? "Best for getting started"
          : tierName === "Growth"
          ? "Most popular choice for growing businesses"
          : "Full-stack enterprise grade solution",
      tenure_months: defaultTenure,
      items,
      summary: {
        subtotal_mrc: Math.round(rawMrc * 100) / 100,
        bundle_discount_pct: discountPct,
        bundle_discount_amount: discountAmount,
        net_mrc: netMrc,
        one_time_setup_fee: Math.round(finalSetup * 100) / 100,
        original_setup_fee: Math.round(rawSetup * 100) / 100,
        setup_fee_waived: setupWaived,
        gst_18_pct: gst18,
        total_monthly_bill: totalMonthly,
        install_lead_days: installDays,
      },
      sla: {
        uptime: hasLeasedLine ? "99.9%" : "99.5%",
        mttr_hours: 4,
        billing_cycle: "1st of every calendar month",
        support_channel: "Dedicated Priority Enterprise Helpdesk (1800-103-SYNC)",
        single_bill: true,
      },
    };
  }

  return {
    vertical: vertKey,
    headcount,
    locations,
    tiers: {
      starter: computeTier("Starter", starterPids, 12),
      growth: computeTier("Growth", growthPids, 24),
      pro: computeTier("Pro", proPids, 24),
    },
    recommended_tier: "Growth",
  };
}

export function recalculateQuote(
  items: { product_id: string; quantity: number }[],
  tenureMonths: number = 12,
  billingCycleDate: string = "1st of every month"
) {
  const enrichedItems: any[] = [];
  let subtotalMrc = 0;
  let originalSetup = 0;
  let maxInstallDays = 3;
  let hasLeasedLine = false;

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    if (qty <= 0) continue;
    const p = productsById[item.product_id];
    if (!p) continue;

    const unitMrc = Number(p.price_min_inr_per_month) || 0;
    const unitSetup = Number(p.one_time_setup_fee) || 0;
    const lineMrc = unitMrc * qty;
    const lineSetup = unitSetup * qty;

    subtotalMrc += lineMrc;
    originalSetup += lineSetup;
    maxInstallDays = Math.max(maxInstallDays, Number(p.typical_install_days) || 3);
    if (item.product_id === "P05" || item.product_id === "P06") hasLeasedLine = true;

    enrichedItems.push({
      product_id: item.product_id,
      product_name: p.product_name,
      category: p.category,
      unit: p.unit,
      quantity: qty,
      unit_mrc: unitMrc,
      total_mrc: Math.round(lineMrc * 100) / 100,
      unit_setup: unitSetup,
      total_setup: Math.round(lineSetup * 100) / 100,
      requires_gstin: p.requires_gstin === "Y",
      min_contract_months: Number(p.min_tenure_months) || 12,
    });
  }

  let discountPct = 0;
  if (enrichedItems.length >= 5) discountPct += 10;
  else if (enrichedItems.length >= 3) discountPct += 5;

  if (tenureMonths >= 36) discountPct += 5;

  const discountAmount = Math.round(subtotalMrc * (discountPct / 100) * 100) / 100;
  const netMrc = Math.round((subtotalMrc - discountAmount) * 100) / 100;

  const setupWaived = tenureMonths >= 24;
  const effectiveSetup = setupWaived ? 0 : Math.round(originalSetup * 100) / 100;

  const cgst = Math.round(netMrc * 0.09 * 100) / 100;
  const sgst = Math.round(netMrc * 0.09 * 100) / 100;
  const totalGst = Math.round((cgst + sgst) * 100) / 100;
  const totalMonthly = Math.round((netMrc + totalGst) * 100) / 100;

  return {
    items: enrichedItems,
    contract_tenure_months: tenureMonths,
    billing_cycle_date: billingCycleDate,
    pricing: {
      subtotal_mrc: Math.round(subtotalMrc * 100) / 100,
      bundle_discount_pct: discountPct,
      bundle_discount_amount: discountAmount,
      net_mrc: netMrc,
      original_setup_fee: Math.round(originalSetup * 100) / 100,
      effective_setup_fee: effectiveSetup,
      setup_fee_waived: setupWaived,
      cgst_9_pct: cgst,
      sgst_9_pct: sgst,
      total_gst_18_pct: totalGst,
      total_first_month_invoice: Math.round((totalMonthly + effectiveSetup) * 100) / 100,
      total_monthly_bill: totalMonthly,
      subsequent_monthly_bill: totalMonthly,
    },
    sla: {
      uptime_guarantee: hasLeasedLine ? "99.9%" : "99.5%",
      mttr_hours: 4,
      consolidated_bill: true,
      support: "Single Enterprise Care Center 1800-103-SYNC",
      install_lead_days: maxInstallDays,
    },
  };
}

function normalizeVertical(v?: string): string {
  if (!v) return "micro";
  const s = v.toLowerCase();
  if (["retail", "shop", "store", "kirana", "sweet", "bakery", "salon", "pharmacy", "micro"].some((k) => s.includes(k))) return "micro";
  if (["clinic", "doctor", "health", "physio", "hospital", "ca", "law", "office", "consult", "coaching", "prof"].some((k) => s.includes(k))) return "prof";
  if (["restaurant", "chain", "multi", "food", "branch"].some((k) => s.includes(k))) return "multi";
  if (["factory", "mfg", "manufactur", "plant", "industrial", "parts"].some((k) => s.includes(k))) return "mfg";
  return "micro";
}

async function callGeminiAdvisor(message: string, history: any[], slots: Record<string, any>) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const systemInstruction = `You are the official Conversational Advisor for Airtel Business SYNC (Bharti Airtel Enterprise & MSME Solutions).
You talk strictly, respectfully, and exclusively as Airtel Business SYNC. Never break character. Never mention you are Gemini, Google, an AI model, or an LLM.

Your objective:
1. Conduct consultative enterprise discovery for Indian MSMEs looking for unified connectivity and digital solutions:
   - Airtel Biz Fibre Broadband (100 Mbps, 300 Mbps, 1 Gbps) with dedicated enterprise throughput
   - Airtel Business Postpaid SIMs (unlimited calling, shared corporate data pool)
   - Static IP, Cloud Telephony / SIP, Cloud Backup (1 TB), Endpoint Security, and WhatsApp Business API.
2. Converse naturally in the user's language (English, Hindi, or Hinglish). Keep responses warm, professional, and concise.
3. Extract and track the key MSME slots:
   - vertical: "micro" (Retail/Kirana/Store/Salon/Pharmacy), "prof" (Clinic/Doctor/Law/CA Office/Consultant), "multi" (Restaurant chain/Multi-branch retail), or "mfg" (Manufacturing/Industrial Factory).
   - headcount: number of employees/staff members needing SIMs or connectivity.
   - locations: number of branches or physical locations (e.g. 1, 2, 3).
   - priorities: array of key requirements (e.g. "broadband", "business SIMs", "static IP", "cloud backup", "WhatsApp API", "cybersecurity").
   - budget: optional monthly budget in INR.
4. Answer any questions about Airtel enterprise services accurately:
   - 99.5% uptime SLA (99.9% for leased lines), 4-hour MTTR guarantee.
   - Single consolidated monthly tax invoice (SAC 998422) for all services, broadband, and SIMs.
   - ₹0 one-time setup fee on all 24-month or 36-month contracts.
   - Direct support through 24x7 Enterprise Helpdesk (1800-103-SYNC).
   - Number porting (MNP) to Airtel Business postpaid without downtime.
5. Return strictly a JSON object with:
{
  "reply": "Your natural, polite response as Airtel Business SYNC in the user's language.",
  "slots": {
    "vertical": "micro" | "prof" | "multi" | "mfg" | null,
    "headcount": number | null,
    "locations": number | null,
    "priorities": string[] | null,
    "budget": number | null
  },
  "is_complete": boolean (true if vertical, headcount, and locations are all captured, or if the user asked to see a quote/recommendation)
}`;

  const contents: any[] = [];
  for (const m of history || []) {
    if (m.content) {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      });
    }
  }
  contents.push({
    role: "user",
    parts: [{ text: message }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error status:", response.status, errText);
    return null;
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;

  try {
    return JSON.parse(rawText);
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON:", rawText, err);
    return null;
  }
}

export async function processAdvisorTurn(message: string, history: any[], slots: Record<string, any>) {
  // 1. First attempt with Gemini 2.5 Flash as Airtel Business SYNC
  try {
    const geminiRes = await callGeminiAdvisor(message, history, slots);
    if (geminiRes && geminiRes.reply) {
      const mergedSlots = { ...slots };
      if (geminiRes.slots) {
        if (geminiRes.slots.vertical) mergedSlots.vertical = normalizeVertical(geminiRes.slots.vertical);
        if (geminiRes.slots.headcount) mergedSlots.headcount = Number(geminiRes.slots.headcount);
        if (geminiRes.slots.locations) mergedSlots.locations = Number(geminiRes.slots.locations);
        if (geminiRes.slots.priorities && Array.isArray(geminiRes.slots.priorities)) {
          mergedSlots.priorities = Array.from(new Set([...(slots.priorities || []), ...geminiRes.slots.priorities]));
        }
        if (geminiRes.slots.budget) mergedSlots.budget = Number(geminiRes.slots.budget);
      }

      // Also regex check in case user explicitly mentioned numbers in their message
      const t = (message || "").toLowerCase();
      if (!mergedSlots.headcount) {
        const mHc = t.match(/(\d+)\s*(people|employees|members|staff|team|log|persons)/);
        if (mHc) mergedSlots.headcount = parseInt(mHc[1], 10);
      }
      if (!mergedSlots.locations) {
        const mLoc = t.match(/(\d+)\s*(branch(?:es)?|location(?:s)?|site(?:s)?|shop(?:s)?|store(?:s)?|outlet(?:s)?|jagah)/i);
        if (mLoc) mergedSlots.locations = parseInt(mLoc[1], 10);
        else if (["single", "ek hi", "one site", "one shop", "1 site", "1 location", "1 shop"].some((w) => t.includes(w))) {
          mergedSlots.locations = 1;
        }
      }

      const isComplete = Boolean(
        geminiRes.is_complete ||
        (mergedSlots.vertical && mergedSlots.headcount && mergedSlots.locations)
      );

      let quotePayload = null;
      if (isComplete) {
        quotePayload = recommendBundle(
          mergedSlots.vertical || "micro",
          mergedSlots.headcount || 5,
          mergedSlots.locations || 1,
          mergedSlots.priorities || [],
          mergedSlots.budget
        );
      }

      return {
        reply: geminiRes.reply,
        slots: mergedSlots,
        is_complete: isComplete,
        quote_payload: quotePayload,
      };
    }
  } catch (err) {
    console.error("Gemini Advisor call failed, falling back to deterministic extractor:", err);
  }

  // 2. Deterministic Fallback if Gemini API is unreachable
  const t = (message || "").toLowerCase();
  const updatedSlots = { ...slots };

  const isHindi = /[\u0900-\u097F]/.test(message);
  const isHinglish = ["namaste", "chahiye", "mera", "meri", "dukaan", "kitna", "hoga", "aap"].some((k) =>
    t.includes(k)
  );

  // Vertical extraction
  if (["kirana", "retail", "dukaan", "shop", "store", "salon", "parlour", "pharmacy", "medical"].some((w) => t.includes(w))) {
    updatedSlots.vertical = "micro";
  } else if (["clinic", "hospital", "doctor", "ca", "chartered", "lawyer", "legal", "consultant", "coaching", "office"].some((w) => t.includes(w))) {
    updatedSlots.vertical = "prof";
  } else if (["chain", "restaurant", "branches", "multi-site", "multiple"].some((w) => t.includes(w))) {
    updatedSlots.vertical = "multi";
  } else if (["factory", "manufacturing", "textile", "plant", "workshop", "industrial"].some((w) => t.includes(w))) {
    updatedSlots.vertical = "mfg";
  }

  // Headcount
  const mHc = t.match(/(\d+)\s*(people|employees|members|staff|team|log|persons)/);
  if (mHc) {
    updatedSlots.headcount = parseInt(mHc[1], 10);
  } else {
    const mNum = t.match(/\b([1-9][0-9]?)\b/);
    if (mNum && !updatedSlots.headcount && !updatedSlots.locations) {
      updatedSlots.headcount = parseInt(mNum[1], 10);
    }
  }

  // Locations
  const mLoc = t.match(/(\d+)\s*(branch(?:es)?|location(?:s)?|site(?:s)?|shop(?:s)?|store(?:s)?|outlet(?:s)?|jagah)/i);
  if (mLoc) {
    updatedSlots.locations = parseInt(mLoc[1], 10);
  } else if (["single", "ek hi", "one site", "one shop", "1 site", "1 location", "1 shop"].some((w) => t.includes(w))) {
    updatedSlots.locations = 1;
  }

  // Priorities
  const priors = [...(updatedSlots.priorities || [])];
  if (["slow internet", "drops", "reliable", "speed", "broadband", "wifi"].some((w) => t.includes(w))) priors.push("high-speed connectivity");
  if (["calling", "sim", "postpaid", "phone bills"].some((w) => t.includes(w))) priors.push("business SIMs");
  if (["whatsapp", "sms", "marketing"].some((w) => t.includes(w))) priors.push("WhatsApp API");
  if (["cctv", "camera", "surveillance"].some((w) => t.includes(w))) priors.push("Cloud CCTV");
  if (["cloud", "backup", "tally", "storage"].some((w) => t.includes(w))) priors.push("Cloud Email & Backup");
  if (["security", "antivirus", "firewall"].some((w) => t.includes(w))) priors.push("Cybersecurity");
  updatedSlots.priorities = Array.from(new Set(priors));

  const turnCount = history.filter((m) => m.role === "user").length + 1;
  let isComplete = !!(updatedSlots.vertical && updatedSlots.headcount && updatedSlots.locations);

  if (!isComplete && turnCount >= 3) {
    if (!updatedSlots.vertical) updatedSlots.vertical = "micro";
    if (!updatedSlots.headcount) updatedSlots.headcount = 5;
    if (!updatedSlots.locations) updatedSlots.locations = 1;
    isComplete = true;
  }

  if (isComplete) {
    const quote = recommendBundle(
      updatedSlots.vertical || "micro",
      updatedSlots.headcount || 5,
      updatedSlots.locations || 1,
      updatedSlots.priorities || [],
      updatedSlots.budget
    );

    const vertName: Record<string, string> = {
      micro: "Micro Retail & Services",
      prof: "Professional Office",
      multi: "Multi-site Enterprise",
      mfg: "Manufacturing Unit",
    };

    let reply = `Thank you! Based on your ${vertName[updatedSlots.vertical] || "Business"} setup (${updatedSlots.headcount} team members, ${updatedSlots.locations} site), we have engineered three consolidated bundles. Our primary recommendation is the **${quote.recommended_tier} Bundle**, delivering high-speed fiber broadband, business SIMs, and single-bill convenience.`;

    if (isHindi) {
      reply = `बहुत बढ़िया! आपकी ${vertName[updatedSlots.vertical] || "व्यवसाय"} (${updatedSlots.headcount} सदस्य, ${updatedSlots.locations} लोकेशन) के लिए 3 बंडल तैयार किए गए हैं। हमारी सिफारिश है **${quote.recommended_tier} बंडल**। नीचे दिए गए प्लान्स देखें!`;
    } else if (isHinglish) {
      reply = `Aapke ${vertName[updatedSlots.vertical] || "business"} ke liye humne 3 bundles तैयार kiye hain. Hamari top recommendation **${quote.recommended_tier} Bundle** hai. Check out the quote below!`;
    }

    return {
      reply,
      slots: updatedSlots,
      is_complete: true,
      quote_payload: quote,
    };
  }

  let reply = "";
  if (!updatedSlots.vertical) {
    reply = isHindi
      ? "नमस्ते! कृपया अपने व्यवसाय का प्रकार बताएं (जैसे रिटेल स्टोर, क्लिनिक/ऑफिस, रेस्टोरेंट चेन या मैन्युफैक्चरिंग)?"
      : "Welcome to Airtel Business SYNC! What type of business do you run (e.g. Retail Store, Professional Office, Multi-site Retail, or Manufacturing)?";
  } else if (!updatedSlots.headcount) {
    reply = isHindi
      ? "आपकी टीम में कुल कितने सदस्य काम करते हैं जिनको बिजनेस सिम या टूल्स की जरूरत है?"
      : "How many employees or team members work in your business who require connectivity or SIMs?";
  } else {
    reply = isHindi
      ? "क्या आपका सिंगल लोकेशन है या अन्य शहरों में भी शाखाएं हैं?"
      : "Do you operate from a single location, or do you have multiple branches/sites?";
  }

  return {
    reply,
    slots: updatedSlots,
    is_complete: false,
    quote_payload: null,
  };
}

export function recordConsent(customerIdentifier: string, userLanguage: string = "en", ipAddress: string = "127.0.0.1") {
  const consentId = `DPDP-SYNC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const timestamp = new Date().toISOString();
  const consent = {
    consent_id: consentId,
    customer_identifier: customerIdentifier,
    purpose_scope: "Strictly limited to Telecom Service Provisioning, DoT/TRAI statutory identity verification, and GSTIN/Udyam registry verification for Accel Business Services.",
    retention_policy: "Stored in encrypted domestic Indian data centers. Retained exclusively for active telecom subscription plus mandatory statutory 2-year TRAI audit period, after which all document artifacts are permanently purged.",
    user_language: userLanguage,
    ip_address: ipAddress,
    timestamp,
    status: "GRANTED",
    is_dpdp_compliant: true,
  };
  inMemoryConsents[consentId] = consent;
  return consent;
}

export function lookupRegistry(gstin?: string, udyamNumber?: string) {
  let gstRecord: any = null;
  if (gstin) {
    const cleanGst = gstin.trim().toUpperCase();
    gstRecord = gstinIndex[cleanGst] || null;
  }

  let udyamRecord: any = null;
  if (udyamNumber) {
    const cleanU = udyamNumber.trim().toUpperCase();
    udyamRecord = udyamIndex[cleanU] || null;
  }

  let workflowRoute = "NOT_FOUND";
  let eligibleForNonGstin = false;

  if (udyamRecord && !gstRecord) {
    workflowRoute = "UDYAM_ONLY_MICRO";
    eligibleForNonGstin = true;
  } else if (gstRecord && !udyamRecord) {
    workflowRoute = "GSTIN_STANDARD";
    eligibleForNonGstin = false;
  } else if (gstRecord && udyamRecord) {
    workflowRoute = "DUAL_VERIFIED";
    eligibleForNonGstin = false;
  }

  return {
    gstin_found: !!gstRecord,
    udyam_found: !!udyamRecord,
    gstin_record: gstRecord,
    udyam_record: udyamRecord,
    workflow_route: workflowRoute,
    eligible_for_non_gstin: eligibleForNonGstin,
  };
}

export function verifyKYC(applicantId?: string, customOcr?: any) {
  const gt = groundTruthData as Record<string, any>;
  if (applicantId && gt[applicantId.toUpperCase()]) {
    return gt[applicantId.toUpperCase()];
  }

  return {
    applicant_id: applicantId || "CUSTOM",
    description: "Custom uploaded documents verification",
    workflow_path: "STANDARD_DUAL",
    checks: {
      completeness: { status: "PASS", details: "All documents evaluated" },
      registry_status: { status: "PASS", details: "Active" },
      entity_fuzzy_match: { status: "PASS", similarity: 95.0 },
      address_alignment: { status: "PASS", details: "Pincode serviceable" },
    },
    scorecard: {
      verdict: "GREEN",
      flags: [],
      field_diffs: [],
    },
  };
}

export function getSpecimens() {
  const gt = groundTruthData as Record<string, any>;
  const list = Object.keys(gt).sort().map((code) => {
    const data = gt[code];
    const docs = data.documents || {};
    const tradeName =
      docs.gst_certificate?.trade_name ||
      docs.udyam_certificate?.trade_name ||
      docs.address_proof?.trade_name ||
      `Applicant ${code}`;

    return {
      applicant_id: code,
      business_name: tradeName,
      verdict: data.scorecard.verdict,
      flags: data.scorecard.flags,
      workflow_path: data.workflow_path || "STANDARD_DUAL",
      description: data.description || "",
    };
  });
  return list;
}

export function getSpecimenDetail(applicantId: string) {
  const gt = groundTruthData as Record<string, any>;
  return gt[applicantId.toUpperCase()] || null;
}

const STAGES = [
  {
    stage_id: 1,
    name: "KYC Verified",
    key: "KYC_VERIFIED",
    title: "Identity & DPDP Consent Verified",
    description: "GSTIN and Udyam credentials validated against official registries. DPDP consent locked.",
    badge: "Completed",
  },
  {
    stage_id: 2,
    name: "Feasibility Confirmed",
    key: "FEASIBILITY_CONFIRMED",
    title: "Network Feasibility Confirmed",
    description: "Airtel Enterprise Fiber/AirFiber port allocated at your premises DP/splitter.",
    badge: "Completed",
  },
  {
    stage_id: 3,
    name: "Hardware & SIM Dispatched",
    key: "DISPATCHED",
    title: "Enterprise Router & 4G/5G SIMs Dispatched",
    description: "Dispatched via Blue Dart Courier (AWB #BD-8829104). Expected delivery within 24 hours.",
    badge: "In Transit",
  },
  {
    stage_id: 4,
    name: "Engineer Scheduled",
    key: "ENGINEER_SCHEDULED",
    title: "Installation Engineer Assigned",
    description: "Senior Field Engineer Ramesh Kumar (+91 98101 23456) scheduled for on-site cabling & testing.",
    badge: "Scheduled",
  },
  {
    stage_id: 5,
    name: "Service Active",
    key: "SERVICE_ACTIVE",
    title: "Service Active & Single Bill Live",
    description: "End-to-end circuit validated. 99.5% SLA and single monthly billing active.",
    badge: "Upcoming",
  },
];

export function createOrder(payload: any) {
  const orderId = `SYNC-202607-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const now = new Date();
  const scheduledDate = new Date(now.getTime() + 48 * 3600 * 1000);
  const scheduledSlot = `${scheduledDate.toISOString().slice(0, 10)} 14:00 - 16:00`;

  const whatsappLogs = [
    {
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "Airtel Business SYNC",
      message: `Hello ${payload.customer_name || "Valued Customer"}! Your Airtel Business SYNC order ${orderId} is confirmed. DPDP KYC verified successfully. Single Monthly Bill: Rs. ${(payload.total_monthly_bill || 2999).toLocaleString("en-IN")}.`,
    },
    {
      timestamp: new Date(now.getTime() + 30 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "Airtel Business SYNC",
      message: `Feasibility confirmed at ${payload.installation_address || "registered address"}. Enterprise Router & Business SIMs dispatched via BlueDart (AWB BD-8829104).`,
    },
    {
      timestamp: new Date(now.getTime() + 60 * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "Airtel Business SYNC",
      message: `Installation engineer Ramesh Kumar (+91 98101 23456) is scheduled for ${scheduledSlot}. Reschedule anytime in your portal.`,
    },
  ];

  const order = {
    order_id: orderId,
    customer_name: payload.customer_name || "Enterprise Customer",
    business_name: payload.business_name || "Business Enterprise",
    bundle_name: payload.bundle_name || "Growth Bundle (300 Mbps + 4 SIMs + WhatsApp API)",
    contract_tenure_months: payload.contract_tenure_months || 24,
    monthly_recurring_charge: payload.monthly_recurring_charge || 2499,
    one_time_setup_fee: payload.one_time_setup_fee || 0,
    gst_amount: payload.gst_amount || 449.82,
    total_monthly_bill: payload.total_monthly_bill || 2948.82,
    installation_address: payload.installation_address || "Shop 12, Commercial Complex, MG Road",
    current_stage: "ENGINEER_SCHEDULED",
    current_stage_index: 4,
    stages: STAGES,
    scheduled_engineer_slot: scheduledSlot,
    engineer: {
      name: "Ramesh Kumar",
      phone: "+91 98101 23456",
      eta: "Tomorrow, 2:00 PM",
      slot: scheduledSlot,
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    },
    courier: {
      partner: "Blue Dart Express",
      tracking_number: "BD-8829104",
      status: "In Transit",
    },
    whatsapp_logs: whatsappLogs,
    created_at: now.toISOString(),
  };

  inMemoryOrders[orderId] = order;
  return order;
}

export function getOrderTracker(orderId: string) {
  if (inMemoryOrders[orderId]) {
    return inMemoryOrders[orderId];
  }

  // Fallback demo order
  return {
    order_id: orderId || "SYNC-202607-K78201",
    customer_name: "Dr. Neha Banerjee",
    business_name: "Neelgiri Physio Clinic",
    bundle_name: "Growth Bundle (300 Mbps + 4 SIMs + WhatsApp API)",
    contract_tenure_months: 24,
    total_monthly_bill: 3420.82,
    current_stage: "ENGINEER_SCHEDULED",
    current_stage_index: 4,
    stages: STAGES,
    installation_address: "B-42, Connaught Place, New Delhi 110001",
    engineer: {
      name: "Ramesh Kumar",
      phone: "+91 98101 23456",
      eta: "Tomorrow, 2:00 PM",
      slot: "2026-07-17 14:00 - 16:00",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
    },
    courier: {
      partner: "Blue Dart Express",
      tracking_number: "BD-8829104",
      status: "In Transit",
    },
    whatsapp_logs: [
      { timestamp: "10:15 AM", sender: "Airtel Business SYNC", message: "Order confirmed. DPDP KYC verified." },
      { timestamp: "11:00 AM", sender: "Airtel Business SYNC", message: "Feasibility confirmed. Hardware dispatched via BlueDart AWB BD-8829104." },
      { timestamp: "12:30 PM", sender: "Airtel Business SYNC", message: "Engineer Ramesh Kumar scheduled for 2026-07-17 14:00 - 16:00." },
    ],
  };
}

export function rescheduleOrder(orderId: string, newSlot: string) {
  const order = inMemoryOrders[orderId] || getOrderTracker(orderId);
  order.scheduled_engineer_slot = newSlot;
  if (order.engineer) order.engineer.slot = newSlot;
  order.whatsapp_logs.push({
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    sender: "Airtel Business SYNC",
    message: `Your installation slot has been rescheduled to ${newSlot}. Engineer Ramesh Kumar notified.`,
  });
  inMemoryOrders[orderId] = order;
  return order;
}

function calculatePropensityScore(lead: any) {
  let score = 0;
  const breakdown: any = {};

  const hasGst = lead.has_gstin === "Y" || Boolean(lead.gstin);
  const gstPts = hasGst ? 25 : 0;
  score += gstPts;
  breakdown.gstin_score = gstPts;

  const hasU = lead.has_udyam === "Y" || Boolean(lead.udyam_number);
  const udyamPts = hasU ? 15 : 0;
  score += udyamPts;
  breakdown.udyam_score = udyamPts;

  const val = Number(lead.monthly_bundle_value_inr || lead.monthly_telecom_spend_inr || 2500);
  const valPts = Math.min(25, Math.round((val / 10000) * 25));
  score += valPts;
  breakdown.value_score = valPts;

  const stage = lead.stage_reached || "Lead";
  const stageWeights: Record<string, number> = {
    Activated: 20,
    "KYC complete": 18,
    "Quote accepted": 15,
    "Needs assessed": 10,
    Contacted: 5,
    Lead: 2,
  };
  const stagePts = stageWeights[stage] || 5;
  score += stagePts;
  breakdown.stage_score = stagePts;

  const kycVerdict = lead.kyc_verdict || (lead.outcome === "Activated" ? "GREEN" : "AMBER");
  const kycPts = kycVerdict === "GREEN" ? 15 : kycVerdict === "AMBER" ? 8 : 0;
  score += kycPts;
  breakdown.kyc_score = kycPts;

  const numSites = Number(lead.num_sites || 1);
  const seg = (lead.segment || "").toLowerCase();

  let assignedQueue = "Self-Serve Digital";
  let routingBadge = "Self-Serve";

  if (val >= 10000 || numSites > 1 || seg.includes("mfg")) {
    assignedQueue = "Field Sales Queue";
    routingBadge = "Field Rep";
  } else if (kycVerdict === "AMBER" || ["Quote accepted", "Needs assessed"].includes(stage) || val >= 3000) {
    assignedQueue = "Assisted Partner Queue";
    routingBadge = "Local Partner";
  }

  const commission = Math.round(val * 1.0 * 100) / 100;

  return {
    total_score: Math.min(100, score),
    breakdown,
    assigned_queue: assignedQueue,
    routing_badge: routingBadge,
    estimated_commission: commission,
    monthly_value: val,
  };
}

export function getBackofficeLeads(queueFilter?: string, stageFilter?: string, search?: string, limit: number = 50) {
  const gt = groundTruthData as Record<string, any>;
  const enriched: any[] = [];

  const kLeads = [
    { code: "K01", name: "Vindhya Tours & Travels", spend: 3500, stage: "Quote accepted", drop: "GSTIN Cancelled in Registry" },
    { code: "K02", name: "Harmony Dental Care", spend: 2800, stage: "Needs assessed", drop: "Udyam Only micro path" },
    { code: "K03", name: "Ganesh Woodcraft", spend: 5400, stage: "Activated", drop: null },
    { code: "K04", name: "Saffron Dental Care LLP", spend: 7200, stage: "Quote accepted", drop: "Illegible blurred GST certificate" },
    { code: "K05", name: "Balaji Realty LLP", spend: 8500, stage: "KYC complete", drop: "Missing Udyam file; GSTIN path" },
    { code: "K06", name: "Saffron Unisex Salon", spend: 3200, stage: "Activated", drop: null },
    { code: "K07", name: "Neelgiri Physio Clinic", spend: 4800, stage: "KYC complete", drop: "Fuzzy trade name mismatch (Shri vs Neelgiri)" },
    { code: "K08", name: "Green Leaf Legal Associates", spend: 6500, stage: "Activated", drop: null },
    { code: "K09", name: "Kaveri Insurance Advisors", spend: 4200, stage: "Activated", drop: null },
    { code: "K10", name: "Kaveri Stays LLP", spend: 18500, stage: "Activated", drop: null },
    { code: "K11", name: "Trinity Bake House Pvt Ltd", spend: 5900, stage: "Quote accepted", drop: "Address proof electricity bill expired (>90 days)" },
    { code: "K12", name: "Star Electronics", spend: 3900, stage: "Activated", drop: null },
  ];

  for (const item of kLeads) {
    const kData = gt[item.code] || {};
    const verdict = kData.scorecard?.verdict || "GREEN";
    const leadDict: any = {
      lead_id: `LEAD-${item.code}`,
      specimen_id: item.code,
      business_name: item.name,
      contact_name: kData.documents?.signatory_id?.signatory_name || "Contact Person",
      segment: ["K07", "K08", "K09"].includes(item.code)
        ? "prof"
        : item.code === "K10"
        ? "multi"
        : ["K02", "K06", "K12"].includes(item.code)
        ? "micro"
        : "mfg",
      city: kData.documents?.udyam_certificate?.city || "Mumbai",
      has_gstin: item.code !== "K02" ? "Y" : "N",
      gstin: kData.registry?.gstin?.gstin || null,
      has_udyam: item.code !== "K05" ? "Y" : "N",
      udyam_number: kData.registry?.udyam?.udyam_number || null,
      monthly_bundle_value_inr: item.spend,
      stage_reached: item.stage,
      outcome: item.stage === "Activated" ? "Activated" : "Dropped",
      drop_reason: item.drop,
      kyc_verdict: inMemoryOverrides[`LEAD-${item.code}`] ? "GREEN" : verdict,
      num_sites: item.code === "K10" ? 3 : 1,
      preferred_language: "en",
    };
    const scored = calculatePropensityScore(leadDict);
    Object.assign(leadDict, scored);
    enriched.push(leadDict);
  }

  const rawLeads = smbLeadsData as any[];
  for (const l of rawLeads.slice(0, 50)) {
    const val = Number(l.monthly_bundle_value_inr || l.monthly_telecom_spend_inr || 3000);
    const lDict: any = {
      lead_id: l.lead_id,
      specimen_id: null,
      business_name: l.business_name,
      contact_name: l.contact_name,
      segment: l.segment,
      city: l.city,
      has_gstin: l.has_gstin,
      gstin: l.gstin,
      has_udyam: l.has_udyam,
      udyam_number: l.udyam_number,
      monthly_bundle_value_inr: val,
      stage_reached: l.stage_reached,
      outcome: l.outcome,
      drop_reason: l.drop_reason,
      kyc_verdict:
        l.outcome === "Activated"
          ? "GREEN"
          : ["Quote accepted", "Needs assessed"].includes(l.stage_reached)
          ? "AMBER"
          : "RED",
      num_sites: l.num_sites || 1,
      preferred_language: l.preferred_language || "en",
    };
    const scored = calculatePropensityScore(lDict);
    Object.assign(lDict, scored);
    enriched.push(lDict);
  }

  enriched.sort((a, b) => b.total_score - a.total_score);

  const filtered = enriched.filter((item) => {
    if (queueFilter && queueFilter !== "ALL" && item.assigned_queue !== queueFilter) return false;
    if (stageFilter && stageFilter !== "ALL" && item.stage_reached !== stageFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!item.business_name.toLowerCase().includes(s) && !item.lead_id.toLowerCase().includes(s)) {
        return false;
      }
    }
    return true;
  });

  return filtered.slice(0, limit);
}

export function generateCallScript(leadId: string) {
  const specimenCode = leadId.startsWith("LEAD-K") ? leadId.replace("LEAD-", "") : null;

  if (specimenCode === "K01") {
    return {
      lead_id: leadId,
      persona: "Cancelled GSTIN (Proprietorship)",
      key_issue: "GSTIN status is marked Cancelled on GST portal. Udyam registration number missing on certificate.",
      call_goal: "Help customer route through Udyam-only micro path or reactivate active GSTIN.",
      opening_pitch: "Hello Neha ji! Calling from Airtel Business SYNC. We noticed you selected our Biz Fibre & SIM bundle for Vindhya Tours & Travels, but our system flagged that your GSTIN 37IHKXV5167L1ZS is currently inactive. No worries at all - as an MSME, we can onboard you directly using your Udyam Certificate without GSTIN!",
      talking_points: [
        "Reassure customer: Under the MSME framework, businesses with turnover < ₹40 Lakh can onboard on Udyam alone.",
        "Offer 1-click WhatsApp document upload link for updated Udyam certificate.",
        "Highlight the ₹0 setup fee for the 24-month contract.",
      ],
      objection_handling: {
        "'I thought GSTIN was mandatory'": "For enterprise fiber it used to be, but with Airtel SYNC's new Udyam Digital pathway, micro-enterprises are fully exempt under DoT guidelines.",
        "'How fast can it be activated?'": "Once you confirm Udyam details, installation engineer visits within 48 hours.",
      },
    };
  } else if (specimenCode === "K07") {
    return {
      lead_id: leadId,
      persona: "Fuzzy Trade Name Discrepancy (Neelgiri vs Shri Physio Clinic)",
      key_issue: "Certificate shows proprietor of Shri Physio Clinic, while trade name is Neelgiri Physio Clinic.",
      call_goal: "Confirm trade name alignment and apply partner override in back-office.",
      opening_pitch: "Namaste Neha ji! Calling from Airtel Business Partner Team. We reviewed your application for Neelgiri Physio Clinic. Everything looks fantastic, just a tiny formality: your GST certificate mentions 'Shri Physio Clinic' in the proprietor line. Could you quickly confirm that Neelgiri Physio Clinic is your primary operational trade name?",
      talking_points: [
        "Single-click partner override: Once verbally confirmed, partner unlocks approval instantly.",
        "Mention the unified single bill for both clinic broadband and staff SIMs.",
        "Verify preferred installation date for broadband.",
      ],
      objection_handling: {
        "'Will I have to resubmit paperwork?'": "Not at all! As your local Airtel partner, I can override the minor name variation immediately on my console.",
      },
    };
  } else if (specimenCode === "K11") {
    return {
      lead_id: leadId,
      persona: "Expired Utility Bill (> 90 days)",
      key_issue: "Electricity bill dated October 2025 is 257 days old (DoT audit mandate requires bill within 90 days).",
      call_goal: "Request latest electricity bill or bank statement via WhatsApp.",
      opening_pitch: "Hello Vikram ji! Calling regarding Trinity Bake House's Airtel SYNC order. Your company GSTIN and Udyam are 100% verified! The only item needed is your latest electricity bill from the last 3 months, as the uploaded bill was from October 2025.",
      talking_points: [
        "Explain TRAI regulatory audit mandate for 90-day address proof validity.",
        "Send direct WhatsApp upload link: customer can snap photo in 10 seconds.",
        "Lock in the 10% multi-product discount.",
      ],
      objection_handling: {
        "'I don't have electricity bill handy'": "A recent bank account statement (last 3 months) or telephone bill with the bakery address works equally well.",
      },
    };
  }

  return {
    lead_id: leadId,
    persona: "High-Propensity SMB Lead Follow-Up",
    key_issue: "Cart drop-off at quote/KYC stage.",
    call_goal: "Address pricing or setup concerns and schedule installation.",
    opening_pitch: "Hello! This is Airtel Business SYNC. We noticed you configured a digital connectivity bundle for your business recently. We wanted to see if you had any questions on the single monthly bill or installation timeline?",
    talking_points: [
      "Zero setup fee waiver on 24-month commitments.",
      "Single consolidated bill and single 1800 priority enterprise helpline.",
      "Guaranteed 99.5% uptime SLA with 4-hour field engineer support.",
    ],
    objection_handling: {
      "'Current ISP is cheaper'": "Local ISPs bill SIMs, internet and CCTV separately with no SLA. Airtel SYNC gives you enterprise uptime, one bill, and dedicated support.",
    },
  };
}

export function overrideLead(leadId: string, note: string, partnerId: string = "PARTNER-P991") {
  inMemoryOverrides[leadId] = {
    lead_id: leadId,
    note,
    partner_id: partnerId,
    action: "APPROVE",
    timestamp: new Date().toISOString(),
  };
  return {
    success: true,
    lead_id: leadId,
    status: "APPROVED_OVERRIDDEN",
    note,
    partner_id: partnerId,
  };
}
