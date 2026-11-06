import { NextRequest, NextResponse } from "next/server";
import { overrideLead } from "@/lib/backend-logic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { note = "Partner manual verification approved", partner_id = "PARTNER-P991" } = body;
    const result = overrideLead(params.id, note, partner_id);
    return NextResponse.json({
      lead_id: params.id,
      override_status: "APPROVED_BY_PARTNER",
      partner_id,
      note,
      message: `Minor discrepancy overridden by channel partner ${partner_id}. Lead pushed to provisioning queue.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to override lead" }, { status: 500 });
  }
}
