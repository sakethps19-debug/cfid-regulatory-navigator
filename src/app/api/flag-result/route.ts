import { NextResponse, type NextRequest } from "next/server";
import { flagScenarioResult } from "@/lib/data";

const MAX_NOTE_LENGTH = 2000;

export async function POST(request: NextRequest) {
  let body: { findingRecordId?: unknown; provisionCanonicalId?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const findingRecordId = typeof body.findingRecordId === "string" ? body.findingRecordId.trim() : "";
  const provisionCanonicalId = typeof body.provisionCanonicalId === "string" ? body.provisionCanonicalId.trim() : "";
  const note = typeof body.note === "string" ? body.note.slice(0, MAX_NOTE_LENGTH) : "";

  if (!findingRecordId || !provisionCanonicalId) {
    return NextResponse.json({ error: "Missing finding or provision reference." }, { status: 400 });
  }

  const result = await flagScenarioResult({ findingRecordId, provisionCanonicalId, note });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
