import { NextRequest, NextResponse } from "next/server";
import { verifyKYC } from "@/lib/backend-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicant_id, custom_ocr } = body;
    const result = verifyKYC(applicant_id, custom_ocr);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to verify KYC" }, { status: 500 });
  }
}
