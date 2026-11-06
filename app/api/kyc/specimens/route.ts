import { NextResponse } from "next/server";
import { getSpecimens } from "@/lib/backend-logic";

export async function GET() {
  try {
    const list = getSpecimens();
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to get specimens" }, { status: 500 });
  }
}
