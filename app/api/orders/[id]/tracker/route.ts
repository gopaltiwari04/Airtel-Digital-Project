import { NextRequest, NextResponse } from "next/server";
import { getOrderTracker } from "@/lib/backend-logic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tracker = getOrderTracker(params.id);
    return NextResponse.json(tracker);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch order tracker" }, { status: 500 });
  }
}
