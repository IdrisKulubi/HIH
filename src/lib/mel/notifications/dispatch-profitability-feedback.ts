import { and, eq, inArray, lt, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { applicants, businesses, melNotificationOutbox } from "@/db/schema";
import { sendMelProfitabilityFeedbackEmail } from "@/lib/email";
import {
  buildEnterpriseProfitabilityFeedback,
  isProfitabilityFeedbackProductionEnabled,
  profitabilityFeedbackEventKey,
  profitabilityFeedbackTrialGateKey,
} from "@/lib/mel/profitability-feedback";
import { recordMelOperationalEvent } from "@/lib/mel/operations";
import type { PanelMatchedEnterprise } from "@/lib/mel/panel-analysis-core";
import {
  buildMelReportingDataset,
  type MelDashboardFilters,
} from "@/lib/mel/reporting-data";

const MAX_ATTEMPTS = 3;
const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bireprogram.org";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ProfitabilityFeedbackDispatchMode = "trial" | "production";

export type OwnerContact = {
  businessId: number;
  businessName: string;
  email: string;
  ownerName: string;
};

export type ProfitabilityFeedbackSummary = {
  matchedCount: number;
  withEmailCount: number;
  enterprises: Array<{
    businessId: number;
    businessName: string;
    hasEmail: boolean;
  }>;
};

export async function loadProfitabilityFeedbackOwnerContacts(
  businessIds: number[]
): Promise<Map<number, OwnerContact>> {
  if (businessIds.length === 0) return new Map();

  const rows = await db
    .select({
      businessId: businesses.id,
      businessName: businesses.name,
      email: applicants.email,
      firstName: applicants.firstName,
      lastName: applicants.lastName,
    })
    .from(businesses)
    .innerJoin(applicants, eq(applicants.id, businesses.applicantId))
    .where(inArray(businesses.id, businessIds));

  const map = new Map<number, OwnerContact>();
  for (const row of rows) {
    const email = (row.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    const ownerName =
      [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || "Enterprise owner";
    map.set(row.businessId, {
      businessId: row.businessId,
      businessName: row.businessName ?? `Enterprise ${row.businessId}`,
      email,
      ownerName,
    });
  }
  return map;
}

export function buildProfitabilityFeedbackSummary(
  matched: PanelMatchedEnterprise[],
  contacts: Map<number, OwnerContact>
): ProfitabilityFeedbackSummary {
  const enterprises = matched.map((enterprise) => ({
    businessId: enterprise.businessId,
    businessName: enterprise.businessName,
    hasEmail: contacts.has(enterprise.businessId),
  }));
  return {
    matchedCount: matched.length,
    withEmailCount: enterprises.filter((item) => item.hasEmail).length,
    enterprises,
  };
}

export async function getProfitabilityFeedbackContext(filters: MelDashboardFilters) {
  const dataset = await buildMelReportingDataset(filters);
  const matched = dataset.panelAnalysis.matchedEnterprises;
  const contacts = await loadProfitabilityFeedbackOwnerContacts(
    matched.map((enterprise) => enterprise.businessId)
  );
  return {
    dataset,
    matched,
    contacts,
    summary: buildProfitabilityFeedbackSummary(matched, contacts),
    periodId: dataset.selectedPeriod.id,
    periodLabel: dataset.selectedPeriod.label,
  };
}

export async function renderProfitabilityFeedbackEmailHtml(input: {
  filters: MelDashboardFilters;
  businessId: number;
  trialNote?: string | null;
}): Promise<{ html: string } | { error: string }> {
  const context = await getProfitabilityFeedbackContext(input.filters);
  const enterprise = context.matched.find((item) => item.businessId === input.businessId);
  if (!enterprise) {
    return { error: "Enterprise is not panel-matched for the current filters." };
  }
  const contact = context.contacts.get(input.businessId);
  const feedback = buildEnterpriseProfitabilityFeedback({
    enterprise,
    periodLabel: context.periodLabel,
  });
  const { renderMelProfitabilityFeedbackHtml } = await import("@/lib/email");
  const html = await renderMelProfitabilityFeedbackHtml({
    ownerName: contact?.ownerName ?? "Enterprise owner",
    businessName: enterprise.businessName,
    periodLabel: context.periodLabel,
    feedback,
    portalUrl: APP_BASE_URL,
    trialNote: input.trialNote ?? null,
  });
  return { html };
}

export type ProfitabilityFeedbackSendResult = {
  sent: number;
  skipped: number;
  failed: number;
  errors: string[];
};

async function sendOneProfitabilityFeedback(input: {
  periodId: number;
  periodLabel: string;
  enterprise: PanelMatchedEnterprise;
  contact: OwnerContact;
  toEmail: string;
  subjectPrefix: string;
  trialNote?: string | null;
  recipientId: string | null;
  useOutbox: boolean;
}): Promise<"sent" | "skipped" | "failed"> {
  const eventKey = profitabilityFeedbackEventKey(input.periodId, input.enterprise.businessId);
  const feedback = buildEnterpriseProfitabilityFeedback({
    enterprise: input.enterprise,
    periodLabel: input.periodLabel,
  });
  const title = `Profitability feedback — ${input.enterprise.businessName}`;
  const body = `${input.periodLabel}: revenue, costs, and profit vs baseline for ${input.enterprise.businessName}.`;

  if (input.useOutbox) {
    await db
      .insert(melNotificationOutbox)
      .values({
        eventKey,
        recipientId: input.recipientId,
        eventType: "profitability_feedback",
        title,
        body,
        href: "/admin/mel/reporting",
        status: "pending",
        attempts: 0,
      })
      .onConflictDoNothing();

    const claimed = await db
      .update(melNotificationOutbox)
      .set({
        attempts: sql`${melNotificationOutbox.attempts} + 1`,
        status: "pending",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(melNotificationOutbox.eventKey, eventKey),
          inArray(melNotificationOutbox.status, ["pending", "failed"]),
          lt(melNotificationOutbox.attempts, MAX_ATTEMPTS)
        )
      )
      .returning({ id: melNotificationOutbox.id });

    if (claimed.length === 0) return "skipped";
  }

  const result = await sendMelProfitabilityFeedbackEmail({
    to: input.toEmail,
    subject: `${input.subjectPrefix}Your profitability summary — ${input.periodLabel}`,
    ownerName: input.contact.ownerName,
    businessName: input.enterprise.businessName,
    periodLabel: input.periodLabel,
    feedback,
    portalUrl: APP_BASE_URL,
    trialNote: input.trialNote ?? null,
  });

  if (result.success) {
    if (input.useOutbox) {
      await db
        .update(melNotificationOutbox)
        .set({ status: "sent", sentAt: new Date(), lastError: null, updatedAt: new Date() })
        .where(eq(melNotificationOutbox.eventKey, eventKey));
    }
    return "sent";
  }

  if (input.useOutbox) {
    await db
      .update(melNotificationOutbox)
      .set({
        status: "failed",
        lastError: result.error ?? "Email delivery failed",
        updatedAt: new Date(),
      })
      .where(eq(melNotificationOutbox.eventKey, eventKey));
  }
  return "failed";
}

export async function dispatchProfitabilityFeedbackTrial(input: {
  filters: MelDashboardFilters;
  businessId: number;
  staffEmail: string;
  staffUserId: string;
}): Promise<ProfitabilityFeedbackSendResult> {
  const context = await getProfitabilityFeedbackContext(input.filters);
  const enterprise = context.matched.find((item) => item.businessId === input.businessId);
  if (!enterprise) {
    return { sent: 0, skipped: 0, failed: 1, errors: ["Enterprise is not panel-matched."] };
  }
  const contact = context.contacts.get(input.businessId);
  if (!contact) {
    return { sent: 0, skipped: 0, failed: 1, errors: ["No valid owner email for this enterprise."] };
  }

  const trialNote = `TRIAL COPY for programme staff. This email would go to the enterprise owner (${contact.email}) for ${enterprise.businessName}.`;
  const outcome = await sendOneProfitabilityFeedback({
    periodId: context.periodId,
    periodLabel: context.periodLabel,
    enterprise,
    contact,
    toEmail: input.staffEmail.trim().toLowerCase(),
    subjectPrefix: "[TRIAL] ",
    trialNote,
    recipientId: input.staffUserId,
    useOutbox: false,
  });

  const result: ProfitabilityFeedbackSendResult = {
    sent: outcome === "sent" ? 1 : 0,
    skipped: outcome === "skipped" ? 1 : 0,
    failed: outcome === "failed" ? 1 : 0,
    errors: outcome === "failed" ? ["Trial email could not be delivered."] : [],
  };

  if (result.sent > 0) {
    const gateKey = profitabilityFeedbackTrialGateKey(context.periodId, input.staffUserId);
    await db
      .insert(melNotificationOutbox)
      .values({
        eventKey: gateKey,
        recipientId: input.staffUserId,
        eventType: "profitability_feedback_trial_gate",
        title: "Profitability feedback trial completed",
        body: `Trial send for ${context.periodLabel} before owner bulk delivery.`,
        href: "/admin/mel/reporting",
        status: "sent",
        attempts: 1,
        sentAt: new Date(),
      })
      .onConflictDoUpdate({
        target: melNotificationOutbox.eventKey,
        set: { status: "sent", sentAt: new Date(), updatedAt: new Date() },
      });
  }

  await recordMelOperationalEvent({
    severity: result.failed > 0 ? "warning" : "info",
    eventType: "profitability_feedback_trial",
    message: `Profitability feedback trial for ${enterprise.businessName} (${outcome}).`,
    metadata: { businessId: input.businessId, periodId: context.periodId, outcome },
  });

  return result;
}

export async function hasProfitabilityFeedbackTrialGate(
  periodId: number,
  staffUserId: string
): Promise<boolean> {
  const gateKey = profitabilityFeedbackTrialGateKey(periodId, staffUserId);
  const row = await db.query.melNotificationOutbox.findFirst({
    where: eq(melNotificationOutbox.eventKey, gateKey),
    columns: { status: true },
  });
  return row?.status === "sent";
}

export async function dispatchProfitabilityFeedbackProduction(
  filters: MelDashboardFilters,
  staffUserId: string
): Promise<ProfitabilityFeedbackSendResult> {
  if (!isProfitabilityFeedbackProductionEnabled()) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: ["Sending to owners is not available in this environment yet. Contact your programme administrator."],
    };
  }

  const context = await getProfitabilityFeedbackContext(filters);
  const trialOk = await hasProfitabilityFeedbackTrialGate(context.periodId, staffUserId);
  if (!trialOk) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [
        "Please send a trial email to your own inbox first, review it, then use Send to all matched owners.",
      ],
    };
  }
  const result: ProfitabilityFeedbackSendResult = { sent: 0, skipped: 0, failed: 0, errors: [] };

  for (const enterprise of context.matched) {
    const contact = context.contacts.get(enterprise.businessId);
    if (!contact) {
      result.skipped += 1;
      continue;
    }
    const outcome = await sendOneProfitabilityFeedback({
      periodId: context.periodId,
      periodLabel: context.periodLabel,
      enterprise,
      contact,
      toEmail: contact.email,
      subjectPrefix: "",
      trialNote: null,
      recipientId: null,
      useOutbox: true,
    });
    if (outcome === "sent") result.sent += 1;
    else if (outcome === "skipped") result.skipped += 1;
    else {
      result.failed += 1;
      result.errors.push(`Failed for ${enterprise.businessName}`);
    }
  }

  await recordMelOperationalEvent({
    severity: result.failed > 0 ? "warning" : "info",
    eventType: "profitability_feedback_production",
    message: `Profitability feedback bulk send: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed.`,
    metadata: {
      periodId: context.periodId,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      filters,
    },
  });

  return result;
}
