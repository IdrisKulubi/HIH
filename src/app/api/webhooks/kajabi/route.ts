import db from "@/db/drizzle";
import { kajabiProgressWebhooks } from "@/db/schema";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  kajabiExternalId: z.string().min(1),
  courseId: z.string().min(1),
  eventTitle: z.string().min(1),
});

export async function POST(req: Request) {
  const secret = process.env.KAJABI_WEBHOOK_SECRET;
  if (secret) {
    const header =
      req.headers.get("x-kajabi-secret") ??
      req.headers.get("x-webhook-secret") ??
      req.headers.get("authorization");
    const ok =
      header === secret ||
      header === `Bearer ${secret}` ||
      header === `bearer ${secret}`;
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    await db.insert(kajabiProgressWebhooks).values({
      kajabiExternalId: parsed.data.kajabiExternalId,
      courseId: parsed.data.courseId,
      eventTitle: parsed.data.eventTitle,
      payload: json as Record<string, unknown>,
    });
  } catch (e) {
    console.error("kajabi webhook insert", e);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
