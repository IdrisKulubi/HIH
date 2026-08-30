import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/db/drizzle";
import { users } from "@/db/schema";

const bodySchema = z
  .object({
    event_type: z.string().min(1).optional(),
    event: z.string().min(1).optional(),
    payload: z.unknown().optional(),
  })
  .passthrough();

function extractEmail(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.email,
    (record.member as Record<string, unknown> | undefined)?.email,
    (record.contact as Record<string, unknown> | undefined)?.email,
    (record.user as Record<string, unknown> | undefined)?.email,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.includes("@")) {
      return value.trim().toLowerCase();
    }
  }

  return null;
}

function isAuthorized(req: Request) {
  const secret = process.env.KAJABI_WEBHOOK_SECRET;
  if (!secret) {
    return true;
  }

  const header =
    req.headers.get("x-kajabi-secret") ??
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization");

  return (
    header === secret ||
    header === `Bearer ${secret}` ||
    header === `bearer ${secret}`
  );
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  const eventType = parsed.data.event_type ?? parsed.data.event;
  const email = extractEmail(parsed.data.payload);

  if (!eventType || !email) {
    return NextResponse.json({ ignored: true }, { status: 200 });
  }

  try {
    const [user] = await db
      .select({
        id: users.id,
        kajabiStatus: users.kajabiStatus,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const now = new Date();

    if (eventType === "offer.granted") {
      if (user.kajabiStatus === "NOT_STARTED") {
        await db
          .update(users)
          .set({
            kajabiStatus: "REGISTERED",
            kajabiRegisteredAt: now,
            updatedAt: now,
          })
          .where(eq(users.id, user.id));
      }
      return NextResponse.json({ ok: true });
    }

    if (eventType === "course.completed") {
      await db
        .update(users)
        .set({
          kajabiStatus: "COMPLETED",
          kajabiCompletedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ignored: true });
  } catch (error) {
    console.error("kajabi webhook update", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
