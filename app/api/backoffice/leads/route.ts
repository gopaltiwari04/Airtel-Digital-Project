import { NextRequest, NextResponse } from "next/server";
import { getBackofficeLeads } from "@/lib/backend-logic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queue = searchParams.get("queue") || undefined;
    const stage = searchParams.get("stage") || undefined;
    const search = searchParams.get("search") || undefined;

    const leads = getBackofficeLeads(queue, stage, search);
    return NextResponse.json(leads);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch backoffice leads" }, { status: 500 });
  }
}
