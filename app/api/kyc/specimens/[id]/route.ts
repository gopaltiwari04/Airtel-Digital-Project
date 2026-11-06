import { NextRequest, NextResponse } from "next/server";
import { getSpecimenDetail } from "@/lib/backend-logic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const detail = getSpecimenDetail(params.id);
    if (!detail) {
      return NextResponse.json({ error: `Specimen ${params.id} not found` }, { status: 404 });
    }
    return NextResponse.json(detail);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch specimen" }, { status: 500 });
  }
}
