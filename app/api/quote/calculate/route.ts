import { NextRequest, NextResponse } from "next/server";
import { recalculateQuote } from "@/lib/backend-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items = [], tenure_months = 12, billing_cycle_date = "1st of every month" } = body;
    const quote = recalculateQuote(items, tenure_months, billing_cycle_date);
    return NextResponse.json(quote);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to calculate quote" }, { status: 500 });
  }
}
