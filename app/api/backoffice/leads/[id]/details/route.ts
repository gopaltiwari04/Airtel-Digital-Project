import { NextRequest, NextResponse } from "next/server";
import { generateCallScript } from "@/lib/backend-logic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const script = generateCallScript(params.id);
    return NextResponse.json({
      lead_id: params.id,
      call_script: script,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to generate call script" }, { status: 500 });
  }
}
