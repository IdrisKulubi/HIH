import { getRoleHomePath } from "@/lib/users/role-home";

export type StaffShellBrand = {
  title: string;
  homeHref: string;
  footerLabel: string;
  mobileNavTitle: string;
};

const ROLE_BRAND: Record<string, Omit<StaffShellBrand, "homeHref">> = {
  admin: {
    title: "Admin",
    footerLabel: "BIRE Programme Admin Panel",
    mobileNavTitle: "Admin navigation",
  },
  bds_edo: {
    title: "BA / EDO",
    footerLabel: "BIRE Programme · BA / EDO",
    mobileNavTitle: "BA / EDO navigation",
  },
  redo: {
    title: "REDO",
    footerLabel: "BIRE Programme · REDO",
    mobileNavTitle: "REDO navigation",
  },
  mel: {
    title: "MEL",
    footerLabel: "BIRE Programme · MEL",
    mobileNavTitle: "MEL navigation",
  },
  oversight: {
    title: "Oversight",
    footerLabel: "BIRE Programme · Oversight",
    mobileNavTitle: "Oversight navigation",
  },
  mentor: {
    title: "Mentorship",
    footerLabel: "BIRE Programme · Mentorship",
    mobileNavTitle: "Mentorship navigation",
  },
  investment_analyst: {
    title: "Investment",
    footerLabel: "BIRE Programme · Investment",
    mobileNavTitle: "Investment navigation",
  },
};

/** Href allowlists for non-admin staff using the admin route shell. */
const ROLE_ALLOWED_HREFS: Record<string, readonly string[] | "all"> = {
  admin: "all",
  bds_edo: [
    "/a2f",
    "/admin/cdp",
    "/admin/mel/monitoring",
  ],
  redo: [
    "/a2f",
    "/admin/cdp",
    "/admin/cdp/approvals",
    "/admin/mel/monitoring",
    "/admin/mel/review",
    "/admin/mel/evidence",
    "/admin/mel/learning",
    "/admin/mel/reporting",
  ],
  mel: [
    "/admin/cdp",
    "/admin/mel",
    "/admin/mel/review",
    "/admin/mel/evidence",
    "/admin/mel/learning",
    "/admin/mel/reporting",
    "/admin/mel/programme-results",
    "/admin/mel/gis",
    "/admin/mel/instruments",
    "/admin/mel/imports",
    "/admin/mel/operations",
  ],
  oversight: [
    "/a2f",
    "/admin/cdp",
    "/admin/cdp/approvals",
  ],
  mentor: [
    "/admin/mentorship",
  ],
  investment_analyst: [
    "/admin/cna",
    "/admin/cdp",
  ],
};

export function getStaffShellBrand(role: string): StaffShellBrand {
  const homeHref = getRoleHomePath(role);
  const brand = ROLE_BRAND[role] ?? {
    title: "Staff",
    footerLabel: "BIRE Programme",
    mobileNavTitle: "Navigation",
  };
  return { ...brand, homeHref };
}

export function filterNavGroupsForRole<T extends { items: { href: string }[] }>(
  groups: T[],
  role: string
): T[] {
  const allowed = ROLE_ALLOWED_HREFS[role];
  if (!allowed || allowed === "all") return groups;
  const allowedSet = new Set(allowed);
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => allowedSet.has(item.href)),
    }))
    .filter((group) => group.items.length > 0);
}
