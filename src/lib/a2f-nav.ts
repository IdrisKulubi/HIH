import { isAdminRole } from "@/lib/a2f-access";

export type A2fNavSegment =
    | "overview"
    | "matching-grant"
    | "due-diligence"
    | "scoring"
    | "appraisal"
    | "contracts"
    | "grant-management"
    | "disbursements";

/** Href suffix under `/a2f/[id]` — server-safe (no icon components). */
export const A2F_NAV_SEGMENT_HREFS: Record<A2fNavSegment, string> = {
    overview: "",
    "matching-grant": "/matching-grant",
    "due-diligence": "/due-diligence",
    scoring: "/scoring",
    appraisal: "/appraisal",
    contracts: "/contracts",
    "grant-management": "/grant-management",
    disbursements: "/disbursements",
};

const OFFICER_SEGMENTS: A2fNavSegment[] = [
    "overview",
    "matching-grant",
    "due-diligence",
    "scoring",
    "appraisal",
    "contracts",
    "grant-management",
    "disbursements",
];

const OVERSIGHT_SEGMENTS: A2fNavSegment[] = [...OFFICER_SEGMENTS];

const FULL_STAFF_SEGMENTS: A2fNavSegment[] = [...OFFICER_SEGMENTS];

const SEGMENTS_BY_ROLE: Record<string, A2fNavSegment[] | "all"> = {
    a2f_officer: OFFICER_SEGMENTS,
    oversight: OVERSIGHT_SEGMENTS,
    admin: "all",
    redo: "all",
    bds_edo: "all",
    a2f_committee: [],
};

export function getAllowedA2fNavSegments(role?: string | null): A2fNavSegment[] {
    if (!role) return [];
    if (isAdminRole(role)) return [...FULL_STAFF_SEGMENTS];
    const allowed = SEGMENTS_BY_ROLE[role];
    if (allowed === "all") return [...FULL_STAFF_SEGMENTS];
    if (allowed) return allowed;
    return [];
}

export function canAccessA2fStaffSegment(
    role: string | null | undefined,
    segment: A2fNavSegment
): boolean {
    return getAllowedA2fNavSegments(role).includes(segment);
}

/** Numeric pipeline URL: /a2f/12 or /a2f/12/scoring */
const NUMERIC_PIPELINE_PATH = /^\/a2f\/(\d+)(\/.*)?$/;

export function parseA2fStaffPipelinePath(pathname: string): {
    a2fId: number;
    subpath: string;
} | null {
    const match = pathname.match(NUMERIC_PIPELINE_PATH);
    if (!match) return null;
    const a2fId = Number(match[1]);
    if (!Number.isInteger(a2fId) || a2fId <= 0) return null;
    return { a2fId, subpath: match[2] ?? "" };
}

export function pathnameToA2fNavSegment(pathname: string, a2fId: number): A2fNavSegment | null {
    const base = `/a2f/${a2fId}`;
    if (pathname === base || pathname === `${base}/`) return "overview";
    for (const [segment, href] of Object.entries(A2F_NAV_SEGMENT_HREFS) as Array<
        [A2fNavSegment, string]
    >) {
        if (!href) continue;
        if (pathname.startsWith(`${base}${href}`)) return segment;
    }
    return null;
}

export function canAccessA2fStaffPath(
    role: string | null | undefined,
    pathname: string
): boolean {
    if (!role || role === "a2f_committee") return false;
    const parsed = parseA2fStaffPipelinePath(pathname);
    if (!parsed) return role !== "a2f_committee" && pathname === "/a2f";
    const segment = pathnameToA2fNavSegment(pathname, parsed.a2fId);
    if (!segment) return isAdminRole(role) || role === "redo" || role === "bds_edo";
    return canAccessA2fStaffSegment(role, segment);
}

export function isMatchingGrantReadOnlyRole(role?: string | null): boolean {
    return role === "oversight";
}

export function canEditMatchingGrantApplication(role?: string | null): boolean {
    if (!role || isMatchingGrantReadOnlyRole(role) || role === "a2f_committee") {
        return false;
    }
    return isAdminRole(role) || role === "a2f_officer" || role === "redo" || role === "bds_edo";
}
