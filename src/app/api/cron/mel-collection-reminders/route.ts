import { NextResponse } from "next/server";
import { dispatchMelCollectionReminders } from "@/lib/mel/notifications/dispatch-collection-reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await dispatchMelCollectionReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Collection reminder run failed";
    console.error("mel collection reminder cron", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export function GET(request: Request) {
  return run(request);
}

export function POST(request: Request) {
  return run(request);
}
