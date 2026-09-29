"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireMelManager, requireMelViewer } from "@/lib/mel/access";
import { isProfitabilityFeedbackProductionEnabled } from "@/lib/mel/profitability-feedback";
import {
  dispatchProfitabilityFeedbackProduction,
  dispatchProfitabilityFeedbackTrial,
  getProfitabilityFeedbackContext,
  renderProfitabilityFeedbackEmailHtml,
} from "@/lib/mel/notifications/dispatch-profitability-feedback";
import type { MelDashboardFilters } from "@/lib/mel/reporting-data";
import { requireMelRolloutFeature } from "@/lib/mel/operations";
import { errorResponse, successResponse, type ActionResponse } from "./types";

export async function getMelProfitabilityFeedbackSummaryAction(
  filters: MelDashboardFilters
): Promise<
  ActionResponse<
    Awaited<ReturnType<typeof getProfitabilityFeedbackContext>>["summary"] & {
      productionEnabled: boolean;
    }
  >
> {
  try {
    await requireMelViewer();
    await requireMelRolloutFeature("reporting");
    const context = await getProfitabilityFeedbackContext(filters);
    return successResponse({
      ...context.summary,
      productionEnabled: isProfitabilityFeedbackProductionEnabled(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load profitability feedback summary.";
    return errorResponse(message);
  }
}

export async function sendMelProfitabilityFeedbackTrialAction(input: {
  filters: MelDashboardFilters;
  businessId: number;
}): Promise<ActionResponse<{ sent: number }>> {
  try {
    const actor = await requireMelManager();
    await requireMelRolloutFeature("reporting");
    const session = await auth();
    const staffEmail = session?.user?.email?.trim();
    if (!staffEmail) {
      return errorResponse("Your account has no email address for trial delivery.");
    }
    const result = await dispatchProfitabilityFeedbackTrial({
      filters: input.filters,
      businessId: input.businessId,
      staffEmail,
      staffUserId: actor.id,
    });
    revalidatePath("/admin/mel/reporting");
    if (result.sent > 0) {
      return successResponse({ sent: result.sent }, `Trial email sent to ${staffEmail}.`);
    }
    if (result.skipped > 0) {
      return errorResponse("This trial was already sent recently or skipped.");
    }
    return errorResponse(result.errors[0] ?? "Trial email could not be sent.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send trial email.";
    return errorResponse(message);
  }
}

export async function sendMelProfitabilityFeedbackBulkAction(
  filters: MelDashboardFilters
): Promise<ActionResponse<{ sent: number; skipped: number; failed: number }>> {
  try {
    await requireMelManager();
    await requireMelRolloutFeature("reporting");
    const result = await dispatchProfitabilityFeedbackProduction(filters);
    revalidatePath("/admin/mel/reporting");
    if (!isProfitabilityFeedbackProductionEnabled()) {
      return errorResponse(result.errors[0] ?? "Bulk send is disabled.");
    }
    if (result.failed > 0 && result.sent === 0) {
      return errorResponse(result.errors[0] ?? "No emails were delivered.");
    }
    return successResponse(
      { sent: result.sent, skipped: result.skipped, failed: result.failed },
      `Sent ${result.sent} email(s). ${result.skipped} skipped, ${result.failed} failed.`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send profitability feedback.";
    return errorResponse(message);
  }
}

export async function getMelProfitabilityFeedbackPreviewHtmlAction(input: {
  filters: MelDashboardFilters;
  businessId: number;
}): Promise<ActionResponse<{ html: string }>> {
  try {
    await requireMelViewer();
    await requireMelRolloutFeature("reporting");
    const rendered = await renderProfitabilityFeedbackEmailHtml({
      filters: input.filters,
      businessId: input.businessId,
      trialNote: null,
    });
    if ("error" in rendered) return errorResponse(rendered.error);
    return successResponse({ html: rendered.html });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to render preview.";
    return errorResponse(message);
  }
}
