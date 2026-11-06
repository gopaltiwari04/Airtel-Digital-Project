import { NextRequest, NextResponse } from "next/server";
import { recordConsent } from "@/lib/backend-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customer_identifier = "MSME-APPLICANT", user_language = "en" } = body;
    const consent = recordConsent(customer_identifier, user_language);
    return NextResponse.json(consent);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to record consent" }, { status: 500 });
  }
}
