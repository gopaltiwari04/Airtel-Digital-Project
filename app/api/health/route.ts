import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "Airtel Business SYNC Next.js Edge & Serverless Core",
    deploy: "Vercel Production Ready",
    timestamp: new Date().toISOString()
  });
}
