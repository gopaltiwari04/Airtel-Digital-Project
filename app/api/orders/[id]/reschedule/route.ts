import { NextRequest, NextResponse } from "next/server";
import { rescheduleOrder } from "@/lib/backend-logic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { new_slot } = body;
    const tracker = rescheduleOrder(params.id, new_slot || "2026-07-18 10:00 - 12:00");
    return NextResponse.json(tracker);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reschedule order" }, { status: 500 });
  }
}
