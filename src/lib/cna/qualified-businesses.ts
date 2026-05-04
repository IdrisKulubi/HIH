import db from "@/db/drizzle";
import { applications } from "@/db/schema";
import { getQualifiedDdApplicationIds, filterApplicationIdsInKycDdCohort } from "@/lib/actions/due-diligence";
import type { BusinessListRow } from "@/lib/actions/cna";
import { asc, eq, inArray } from "drizzle-orm";

export async function listQualifiedCnaBusinessRows(): Promise<BusinessListRow[]> {
  const qualifiedAppIds = await getQualifiedDdApplicationIds();
  if (qualifiedAppIds.length === 0) return [];

  const rows = await db.query.applications.findMany({
    where: inArray(applications.id, qualifiedAppIds),
    orderBy: [asc(applications.id)],
    with: {
      business: {
        with: {
          applicant: true,
        },
      },
    },
  });

  const uniqueByBusiness = new Map<number, BusinessListRow>();
  for (const app of rows) {
    if (uniqueByBusiness.has(app.business.id)) continue;
    uniqueByBusiness.set(app.business.id, {
      businessId: app.business.id,
      businessName: app.business.name,
      applicantName: `${app.business.applicant.firstName} ${app.business.applicant.lastName}`.trim(),
      applicantEmail: app.business.applicant.email,
      sector: app.business.sector,
    });
  }

  return Array.from(uniqueByBusiness.values()).sort((a, b) =>
    a.businessName.localeCompare(b.businessName, undefined, { sensitivity: "base" })
  );
}

export async function isBusinessInQualifiedCnaCohort(businessId: number): Promise<boolean> {
  const appRows = await db.query.applications.findMany({
    where: eq(applications.businessId, businessId),
    columns: { id: true },
  });
  if (appRows.length === 0) return false;

  const qualified = await filterApplicationIdsInKycDdCohort(appRows.map((app) => app.id));
  return qualified.size > 0;
}
