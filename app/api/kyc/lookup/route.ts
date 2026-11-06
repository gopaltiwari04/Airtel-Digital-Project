import { NextRequest, NextResponse } from "next/server";
import { lookupRegistry } from "@/lib/backend-logic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gstin = searchParams.get("gstin") || undefined;
    const udyamNumber = searchParams.get("udyam_number") || undefined;

    const result = lookupRegistry(gstin, udyamNumber);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to lookup registry" }, { status: 500 });
  }
}
