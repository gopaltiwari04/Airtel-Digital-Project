// When deployed on Vercel or in the browser, use relative paths so Next.js Route Handlers serve all endpoints natively.
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorResponse {
  reply: string;
  slots: {
    vertical?: string;
    headcount?: number;
    locations?: number;
    priorities?: string[];
    budget?: number;
  };
  is_complete: boolean;
  quote_payload?: any;
}

export async function sendAdvisorChat(
  message: string,
  history: ChatMessage[],
  slots: Record<string, any>
): Promise<AdvisorResponse> {
  const res = await fetch(`${API_BASE}/api/advisor/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, slots }),
  });
  if (!res.ok) throw new Error("Failed to send message to advisor");
  return res.json();
}

export async function calculateQuote(
  items: { product_id: string; quantity: number }[],
  tenure_months: number,
  billing_cycle_date: string = "1st of every month"
) {
  const res = await fetch(`${API_BASE}/api/quote/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, tenure_months, billing_cycle_date }),
  });
  if (!res.ok) throw new Error("Failed to calculate quote");
  return res.json();
}

export async function recordDPDPConsent(
  customer_identifier: string,
  user_language: string = "en"
) {
  const res = await fetch(`${API_BASE}/api/kyc/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customer_identifier, user_language }),
  });
  if (!res.ok) throw new Error("Failed to record DPDP consent");
  return res.json();
}

export async function lookupRegistry(gstin?: string, udyam_number?: string) {
  const params = new URLSearchParams();
  if (gstin) params.append("gstin", gstin);
  if (udyam_number) params.append("udyam_number", udyam_number);
  const res = await fetch(`${API_BASE}/api/kyc/lookup?${params.toString()}`);
  if (!res.ok) throw new Error("Registry lookup failed");
  return res.json();
}

export async function verifyKYC(applicant_id?: string, custom_ocr?: any) {
  const res = await fetch(`${API_BASE}/api/kyc/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicant_id, custom_ocr }),
  });
  if (!res.ok) throw new Error("KYC verification failed");
  return res.json();
}

export async function fetchSpecimens() {
  const res = await fetch(`${API_BASE}/api/kyc/specimens`);
  if (!res.ok) throw new Error("Failed to fetch KYC specimens");
  return res.json();
}

export async function fetchSpecimenDetail(applicant_id: string) {
  const res = await fetch(`${API_BASE}/api/kyc/specimens/${applicant_id}`);
  if (!res.ok) throw new Error("Failed to fetch specimen details");
  return res.json();
}

export async function createOrder(payload: any) {
  const res = await fetch(`${API_BASE}/api/orders/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create order");
  return res.json();
}

export async function getOrderTracker(order_id: string) {
  const res = await fetch(`${API_BASE}/api/orders/${order_id}/tracker`);
  if (!res.ok) throw new Error("Failed to fetch order status");
  return res.json();
}

export async function rescheduleOrder(order_id: string, new_slot: string) {
  const res = await fetch(`${API_BASE}/api/orders/${order_id}/reschedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_slot }),
  });
  if (!res.ok) throw new Error("Failed to reschedule engineer slot");
  return res.json();
}

export async function fetchBackofficeLeads(queue?: string, stage?: string, search?: string) {
  const params = new URLSearchParams();
  if (queue) params.append("queue", queue);
  if (stage) params.append("stage", stage);
  if (search) params.append("search", search);
  const res = await fetch(`${API_BASE}/api/backoffice/leads?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch back-office leads");
  return res.json();
}

export async function fetchLeadCallScript(lead_id: string) {
  const res = await fetch(`${API_BASE}/api/backoffice/leads/${lead_id}/details`);
  if (!res.ok) throw new Error("Failed to fetch call script");
  return res.json();
}

export async function overrideLeadKYC(lead_id: string, note: string, partner_id: string = "PARTNER-P991") {
  const res = await fetch(`${API_BASE}/api/backoffice/leads/${lead_id}/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lead_id, note, partner_id, action: "APPROVE" }),
  });
  if (!res.ok) throw new Error("Failed to override lead KYC");
  return res.json();
}
