import { NextRequest, NextResponse } from "next/server";
import { processAdvisorTurn } from "@/lib/backend-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], slots = {} } = body;
    const result = await processAdvisorTurn(message || "", history, slots);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process advisor turn" }, { status: 500 });
  }
}
