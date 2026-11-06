import { NextRequest, NextResponse } from "next/server";
import { createOrder } from "@/lib/backend-logic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const order = createOrder(body);
    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
