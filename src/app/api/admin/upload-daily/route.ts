import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/adminAuth";
import { parseDailyWorkbookBuffer, coalesceByAccordCode } from "@/lib/dailyUpload";
import { ingestDailySnapshot } from "@/lib/dailyIngest";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidSessionToken(session)) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "Could not read the uploaded file" }, { status: 400 });
  }

  try {
    const rawRows = await parseDailyWorkbookBuffer(buffer);
    if (rawRows.length === 0) {
      return NextResponse.json({ error: "No data rows found in the file" }, { status: 400 });
    }
    const snapshots = coalesceByAccordCode(rawRows);

    const supabase = createAdminClient();
    const summary = await ingestDailySnapshot(supabase, snapshots);

    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Daily upload failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
