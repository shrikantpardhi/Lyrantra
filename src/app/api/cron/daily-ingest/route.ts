import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runDiscoveryAgent } from "@/lib/ai-agent";

export const maxDuration = 60;

function validBearer(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function GET(request: Request) {
  if (!validBearer(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const run = await runDiscoveryAgent("schedule");
  return NextResponse.json({
    id: run.id,
    status: run.status,
    candidates: run.candidates,
    summary: run.summary,
  });
}
