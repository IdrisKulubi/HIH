"use server";

import { revalidatePath } from "next/cache";
import { requireMelManager } from "@/lib/mel/access";
import { dispatchMelCollectionReminders } from "@/lib/mel/notifications/dispatch-collection-reminders";
import { errorResponse, successResponse, type ActionResponse } from "./types";

export async function sendMelCollectionRemindersAction(): Promise<
  ActionResponse<Awaited<ReturnType<typeof dispatchMelCollectionReminders>>>
> {
  try {
    await requireMelManager();
    const result = await dispatchMelCollectionReminders();
    revalidatePath("/admin/mel/operations");

    const sent = result.periods.reduce((total, period) => total + period.sent, 0);
    const failed = result.periods.reduce((total, period) => total + period.failed, 0);
    if (result.periods.length === 0) {
      return successResponse(
        result,
        `No collection window is open on ${result.today}. No reminders were sent.`
      );
    }
    return successResponse(
      result,
      failed > 0
        ? `Sent ${sent} collection reminder(s). ${failed} could not be delivered.`
        : `Sent ${sent} collection reminder(s).`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send collection reminders.";
    return errorResponse(message);
  }
}
